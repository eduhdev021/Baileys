import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes } from 'node:crypto';
import { HttpError, createCache, createMutex, createQueue } from '../Addon/index.js';
import { DEFAULT_CACHE_TTLS } from '../Defaults/index.js';
import { Curve, signedKeyPair } from './crypto.js';
import { delay, generateRegistrationId } from './generics.js';
import { PreKeyManager } from './pre-key-manager.js';
// One instance per process: a per-socket AsyncLocalStorage leaks the heap under Node's legacy
// async-context propagation, where every live instance tags every pending async resource. The
// value is keyed by store token so a store only ever sees its own context, even when another
// wrapped store runs inside its transaction.
const txStorage = new AsyncLocalStorage();
// ============================================================================
// Unpersistable-value defense
//
// Auth-state values must survive JSON round-trips. A function/symbol (or
// undefined) inside a keys.set() payload can never be serialized — it used to
// crash writes with ERR_INVALID_ARG_TYPE, and even after the file layer learned
// to skip it, the value kept circulating through the in-memory transaction
// cache and the signal-key cache, feeding itself back into keys.get() on every
// message send. Each layer below drops such values ONCE, warns once per
// category and moves on — the payload that reaches persistence is always clean.
// ============================================================================
const warnedDrops = new Set();
const warnDropOnce = (logger, message, info) => {
    const key = `${info.category}|${info.ids || ''}`;
    if (warnedDrops.size > 500)
        warnedDrops.clear();
    if (warnedDrops.has(key)) {
        logger?.trace?.(info, `${message} (repeated)`);
        return;
    }
    warnedDrops.add(key);
    try {
        if (logger?.warn) {
            logger.warn(info, message);
        }
        else {
            console.warn('[baileys:auth-state]', message, info);
        }
    }
    catch { }
};
const isUnpersistable = (v) => v === undefined || typeof v === 'function' || typeof v === 'symbol';
/**
 * Returns a copy of a `{ id: value }` payload without function/symbol/undefined
 * values, plus the ids that were dropped (for logging).
 */
const sanitizeItems = (items) => {
    const clean = {};
    const dropped = [];
    if (!items || typeof items !== 'object') {
        return [clean, dropped];
    }
    for (const id in items) {
        const value = items[id];
        if (isUnpersistable(value)) {
            dropped.push(id);
            continue;
        }
        clean[id] = value;
    }
    return [clean, dropped];
};
/**
 * Adds caching capability to a SignalKeyStore
 * @param store the store to add caching to
 * @param logger to log trace events
 * @param _cache cache store to use
 */
export function makeCacheableSignalKeyStore(store, logger, _cache) {
    const cache = _cache ||
        createCache({
            ttl: DEFAULT_CACHE_TTLS.SIGNAL_STORE // 5 minutes
        });
    // Mutex for protecting cache operations
    const cacheMutex = createMutex();
    function getUniqueId(type, id) {
        return `${type}.${id}`;
    }
    return {
        async get(type, ids) {
            return cacheMutex.runExclusive(async () => {
                const data = {};
                const idsToFetch = [];
                for (const id of ids) {
                    const item = (await cache.get(getUniqueId(type, id)));
                    if (typeof item === 'function') {
                        // a poisoned cache entry can never be serialized — evict it and
                        // refetch from the underlying store instead of returning a function
                        await cache.del(getUniqueId(type, id));
                        idsToFetch.push(id);
                    }
                    else if (typeof item !== 'undefined') {
                        data[id] = item;
                    }
                    else {
                        idsToFetch.push(id);
                    }
                }
                if (idsToFetch.length) {
                    logger?.trace({ items: idsToFetch.length }, 'loading from store');
                    const fetched = await store.get(type, idsToFetch);
                    for (const id of idsToFetch) {
                        const item = fetched[id];
                        if (item) {
                            data[id] = item;
                            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                            await cache.set(getUniqueId(type, id), item);
                        }
                    }
                }
                return data;
            });
        },
        async set(data) {
            return cacheMutex.runExclusive(async () => {
                if (!data || typeof data !== 'object') {
                    warnDropOnce(logger, 'keys.set called with non-object data — ignoring', { category: String(data), ids: [] });
                    return;
                }
                let keys = 0;
                const cleanData = {};
                for (const type in data) {
                    const [cleanItems, dropped] = sanitizeItems(data[type]);
                    if (dropped.length) {
                        warnDropOnce(logger, 'dropping unpersistable value(s) before caching', { category: type, ids: dropped.slice(0, 5), count: dropped.length });
                    }
                    cleanData[type] = cleanItems;
                    for (const id in cleanItems) {
                        await cache.set(getUniqueId(type, id), cleanItems[id]);
                        keys += 1;
                    }
                }
                logger?.trace({ keys }, 'updated cache');
                await store.set(cleanData);
            });
        },
        async clear() {
            await cache.flushAll();
            await store.clear?.();
        }
    };
}
/**
 * Adds DB-like transaction capability to the SignalKeyStore
 * Uses AsyncLocalStorage for automatic context management
 * @param state the key store to apply this capability to
 * @param logger logger to log events
 * @returns SignalKeyStore with transaction capability
 */
export const addTransactionCapability = (state, logger, { maxCommitRetries, delayBetweenTriesMs }) => {
    // Queues for concurrency control (keyed by signal data type - bounded set)
    const keyQueues = new Map();
    // Transaction mutexes with reference counting for cleanup
    const txMutexes = new Map();
    const txMutexRefCounts = new Map();
    // Pre-key manager for specialized operations
    const preKeyManager = new PreKeyManager(state, logger);
    /**
     * Get or create a queue for a specific key type
     */
    function getQueue(key) {
        if (!keyQueues.has(key)) {
            keyQueues.set(key, createQueue(1));
        }
        return keyQueues.get(key);
    }
    /**
     * Get or create a transaction mutex
     */
    function getTxMutex(key) {
        if (!txMutexes.has(key)) {
            txMutexes.set(key, createMutex());
            txMutexRefCounts.set(key, 0);
        }
        return txMutexes.get(key);
    }
    /**
     * Acquire a reference to a transaction mutex
     */
    function acquireTxMutexRef(key) {
        const count = txMutexRefCounts.get(key) ?? 0;
        txMutexRefCounts.set(key, count + 1);
    }
    /**
     * Release a reference to a transaction mutex and cleanup if no longer needed
     */
    function releaseTxMutexRef(key) {
        const count = (txMutexRefCounts.get(key) ?? 1) - 1;
        txMutexRefCounts.set(key, count);
        // Cleanup if no more references and mutex is not locked
        if (count <= 0) {
            const mutex = txMutexes.get(key);
            if (mutex && !mutex.isLocked()) {
                txMutexes.delete(key);
                txMutexRefCounts.delete(key);
            }
        }
    }
    /**
     * Check if currently in a transaction
     */
    function isInTransaction() {
        return !!txStorage.getStore();
    }
    /**
     * Commit transaction with retries
     */
    async function commitWithRetry(mutations) {
        // final defense: nothing unpersistable may ever reach the underlying store
        const clean = {};
        for (const type in mutations) {
            const [cleanItems, dropped] = sanitizeItems(mutations[type]);
            if (dropped.length) {
                warnDropOnce(logger, 'dropping unpersistable value(s) before commit', { category: type, ids: dropped.slice(0, 5), count: dropped.length });
            }
            if (Object.keys(cleanItems).length) {
                clean[type] = cleanItems;
            }
        }
        if (Object.keys(clean).length === 0) {
            logger.trace('no mutations in transaction');
            return;
        }
        logger.trace('committing transaction');
        for (let attempt = 0; attempt < maxCommitRetries; attempt++) {
            try {
                await state.set(clean);
                logger.trace({ mutationCount: Object.keys(mutations).length }, 'committed transaction');
                return;
            }
            catch (error) {
                const retriesLeft = maxCommitRetries - attempt - 1;
                logger.warn(`failed to commit mutations, retries left=${retriesLeft}`);
                if (retriesLeft === 0) {
                    throw error;
                }
                await delay(delayBetweenTriesMs);
            }
        }
    }
    return {
        get: async (type, ids) => {
            const ctx = txStorage.getStore();
            if (!ctx) {
                // No transaction - direct read without exclusive lock for concurrency
                return state.get(type, ids);
            }
            // In transaction - check cache first
            const cached = ctx.cache[type] || {};
            const missing = ids.filter(id => !(id in cached));
            if (missing.length > 0) {
                ctx.dbQueries++;
                logger.trace({ type, count: missing.length }, 'fetching missing keys in transaction');
                const fetched = await getTxMutex(type).runExclusive(() => state.get(type, missing));
                // Update cache
                ctx.cache[type] = ctx.cache[type] || {};
                Object.assign(ctx.cache[type], fetched);
            }
            // Return requested ids from cache
            const result = {};
            for (const id of ids) {
                const value = ctx.cache[type]?.[id];
                // functions/symbols can never be legit auth-state values — never hand
                // them back to callers (a poisoned cache entry would otherwise flow
                // into sender-key-memory and be re-set on every group send)
                if (value !== undefined && value !== null && typeof value !== 'function') {
                    result[id] = value;
                }
            }
            return result;
        },
        set: async (data) => {
            if (!data || typeof data !== 'object') {
                // e.g. keys.set('sender-key-memory', {...}) — legacy/wrong signature
                warnDropOnce(logger, 'keys.set called with non-object data — ignoring', { category: String(data), ids: [] });
                return;
            }
            const ctx = txStorage.getStore();
            if (!ctx) {
                // No transaction - direct write with queue protection
                const types = Object.keys(data);
                // Process pre-keys with validation
                for (const type_ of types) {
                    const type = type_;
                    if (type === 'pre-key') {
                        await preKeyManager.validateDeletions(data, type);
                    }
                }
                // Write all data in parallel
                await Promise.all(types.map(type => getQueue(type).add(async () => {
                    const [cleanItems, dropped] = sanitizeItems(data[type]);
                    if (dropped.length) {
                        warnDropOnce(logger, 'dropping unpersistable value(s)', { category: type, ids: dropped.slice(0, 5), count: dropped.length });
                    }
                    const typeData = { [type]: cleanItems };
                    await state.set(typeData);
                })));
                return;
            }
            // In transaction - update cache and mutations
            logger.trace({ types: Object.keys(data) }, 'caching in transaction');
            for (const key_ in data) {
                const key = key_;
                // Ensure structures exist
                ctx.cache[key] = ctx.cache[key] || {};
                ctx.mutations[key] = ctx.mutations[key] || {};
                // Special handling for pre-keys
                if (key === 'pre-key') {
                    await preKeyManager.processOperations(data, key, ctx.cache, ctx.mutations, true);
                }
                else {
                    // Normal key types — drop unpersistable values before they enter
                    // the cache/mutations, so a bad payload can never poison later gets
                    // or be committed to the store on every send
                    const [cleanItems, dropped] = sanitizeItems(data[key]);
                    if (dropped.length) {
                        warnDropOnce(logger, 'dropping unpersistable value(s) in transaction', { category: key, ids: dropped.slice(0, 5), count: dropped.length });
                    }
                    Object.assign(ctx.cache[key], cleanItems);
                    Object.assign(ctx.mutations[key], cleanItems);
                }
            }
        },
        isInTransaction,
        transaction: async (work, key) => {
            const existing = txStorage.getStore();
            // Nested transaction - reuse existing context
            if (existing) {
                logger.trace('reusing existing transaction context');
                return work();
            }
            // New transaction - acquire mutex and create context
            const mutex = getTxMutex(key);
            acquireTxMutexRef(key);
            try {
                return await mutex.runExclusive(async () => {
                    const ctx = {
                        cache: {},
                        mutations: {},
                        dbQueries: 0
                    };
                    logger.trace('entering transaction');
                    try {
                        const result = await txStorage.run(ctx, work);
                        // Commit mutations
                        await commitWithRetry(ctx.mutations);
                        logger.trace({ dbQueries: ctx.dbQueries }, 'transaction completed');
                        return result;
                    }
                    catch (error) {
                        logger.error({ error }, 'transaction failed, rolling back');
                        throw error;
                    }
                });
            }
            finally {
                releaseTxMutexRef(key);
            }
        },
        disposeTransactionStorage: () => {
            // The first txStorage.run() enables the storage, which registers it in a
            // module-global list inside node:async_hooks holding a STRONG reference.
            // On Node < 24 every enabled storage also stamps one symbol-keyed property
            // onto every async resource created anywhere in the process, so the cost of
            // never disabling grows with sockets-ever-created x live async resources
            // (observed: 1.9GB of a 2.1GB heap after 25h at ~250 concurrent sockets).
            // Only .disable() releases it - GC alone never collects an enabled storage,
            // on any Node version.
            try {
                txStorage.disable();
            }
            catch (err) {
                logger.warn({ err }, 'failed to disable transaction storage');
            }
        }
    };
};
/**
 * Returns the authenticated user's JID, or throws a Boom-401 if creds are not yet authenticated.
 * Use this anywhere we'd otherwise reach for `creds.me!.id` to fail fast with a descriptive error.
 */
export const assertMeId = (creds) => {
    const id = creds.me?.id;
    if (!id) {
        throw new HttpError('Cannot proceed: socket is not authenticated yet (creds.me.id is missing)', { statusCode: 401 });
    }
    return id;
};
export const initAuthCreds = () => {
    const identityKey = Curve.generateKeyPair();
    return {
        noiseKey: Curve.generateKeyPair(),
        pairingEphemeralKeyPair: Curve.generateKeyPair(),
        signedIdentityKey: identityKey,
        signedPreKey: signedKeyPair(identityKey, 1),
        registrationId: generateRegistrationId(),
        advSecretKey: randomBytes(32).toString('base64'),
        processedHistoryMessages: [],
        nextPreKeyId: 1,
        firstUnuploadedPreKeyId: 1,
        accountSyncCounter: 0,
        accountSettings: {
            unarchiveChats: false
        },
        registered: false,
        pairingCode: undefined,
        lastPropHash: undefined,
        routingInfo: undefined,
        additionalData: undefined
    };
};
