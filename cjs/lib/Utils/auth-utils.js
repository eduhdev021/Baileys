var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var auth_utils_exports = {};
__export(auth_utils_exports, {
  addTransactionCapability: () => addTransactionCapability,
  assertMeId: () => assertMeId,
  initAuthCreds: () => initAuthCreds,
  makeCacheableSignalKeyStore: () => makeCacheableSignalKeyStore
});
module.exports = __toCommonJS(auth_utils_exports);
var import_node_async_hooks = require("node:async_hooks");
var import_node_crypto = require("node:crypto");
var import_Addon = require("../Addon/index.js");
var import_Defaults = require("../Defaults/index.js");
var import_crypto = require("./crypto.js");
var import_generics = require("./generics.js");
var import_pre_key_manager = require("./pre-key-manager.js");
const txStorage = new import_node_async_hooks.AsyncLocalStorage();
const warnedDrops = /* @__PURE__ */ new Set();
const warnDropOnce = (logger, message, info) => {
  const key = `${info.category}|${info.ids || ""}`;
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
    } else {
      console.warn("[baileys:auth-state]", message, info);
    }
  } catch {
  }
};
const isUnpersistable = (v) => v === void 0 || typeof v === "function" || typeof v === "symbol";
const sanitizeItems = (items) => {
  const clean = {};
  const dropped = [];
  if (!items || typeof items !== "object") {
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
function makeCacheableSignalKeyStore(store, logger, _cache) {
  const cache = _cache || (0, import_Addon.createCache)({
    ttl: import_Defaults.DEFAULT_CACHE_TTLS.SIGNAL_STORE
    // 5 minutes
  });
  const cacheMutex = (0, import_Addon.createMutex)();
  function getUniqueId(type, id) {
    return `${type}.${id}`;
  }
  return {
    async get(type, ids) {
      return cacheMutex.runExclusive(async () => {
        const data = {};
        const idsToFetch = [];
        for (const id of ids) {
          const item = await cache.get(getUniqueId(type, id));
          if (typeof item === "function") {
            await cache.del(getUniqueId(type, id));
            idsToFetch.push(id);
          } else if (typeof item !== "undefined") {
            data[id] = item;
          } else {
            idsToFetch.push(id);
          }
        }
        if (idsToFetch.length) {
          logger?.trace({ items: idsToFetch.length }, "loading from store");
          const fetched = await store.get(type, idsToFetch);
          for (const id of idsToFetch) {
            const item = fetched[id];
            if (item) {
              data[id] = item;
              await cache.set(getUniqueId(type, id), item);
            }
          }
        }
        return data;
      });
    },
    async set(data) {
      return cacheMutex.runExclusive(async () => {
        if (!data || typeof data !== "object") {
          warnDropOnce(logger, "keys.set called with non-object data \u2014 ignoring", { category: String(data), ids: [] });
          return;
        }
        let keys = 0;
        const cleanData = {};
        for (const type in data) {
          const [cleanItems, dropped] = sanitizeItems(data[type]);
          if (dropped.length) {
            warnDropOnce(logger, "dropping unpersistable value(s) before caching", { category: type, ids: dropped.slice(0, 5), count: dropped.length });
          }
          cleanData[type] = cleanItems;
          for (const id in cleanItems) {
            await cache.set(getUniqueId(type, id), cleanItems[id]);
            keys += 1;
          }
        }
        logger?.trace({ keys }, "updated cache");
        await store.set(cleanData);
      });
    },
    async clear() {
      await cache.flushAll();
      await store.clear?.();
    }
  };
}
const addTransactionCapability = (state, logger, { maxCommitRetries, delayBetweenTriesMs }) => {
  const keyQueues = /* @__PURE__ */ new Map();
  const txMutexes = /* @__PURE__ */ new Map();
  const txMutexRefCounts = /* @__PURE__ */ new Map();
  const preKeyManager = new import_pre_key_manager.PreKeyManager(state, logger);
  function getQueue(key) {
    if (!keyQueues.has(key)) {
      keyQueues.set(key, (0, import_Addon.createQueue)(1));
    }
    return keyQueues.get(key);
  }
  function getTxMutex(key) {
    if (!txMutexes.has(key)) {
      txMutexes.set(key, (0, import_Addon.createMutex)());
      txMutexRefCounts.set(key, 0);
    }
    return txMutexes.get(key);
  }
  function acquireTxMutexRef(key) {
    const count = txMutexRefCounts.get(key) ?? 0;
    txMutexRefCounts.set(key, count + 1);
  }
  function releaseTxMutexRef(key) {
    const count = (txMutexRefCounts.get(key) ?? 1) - 1;
    txMutexRefCounts.set(key, count);
    if (count <= 0) {
      const mutex = txMutexes.get(key);
      if (mutex && !mutex.isLocked()) {
        txMutexes.delete(key);
        txMutexRefCounts.delete(key);
      }
    }
  }
  function isInTransaction() {
    return !!txStorage.getStore();
  }
  async function commitWithRetry(mutations) {
    const clean = {};
    for (const type in mutations) {
      const [cleanItems, dropped] = sanitizeItems(mutations[type]);
      if (dropped.length) {
        warnDropOnce(logger, "dropping unpersistable value(s) before commit", { category: type, ids: dropped.slice(0, 5), count: dropped.length });
      }
      if (Object.keys(cleanItems).length) {
        clean[type] = cleanItems;
      }
    }
    if (Object.keys(clean).length === 0) {
      logger.trace("no mutations in transaction");
      return;
    }
    logger.trace("committing transaction");
    for (let attempt = 0; attempt < maxCommitRetries; attempt++) {
      try {
        await state.set(clean);
        logger.trace({ mutationCount: Object.keys(mutations).length }, "committed transaction");
        return;
      } catch (error) {
        const retriesLeft = maxCommitRetries - attempt - 1;
        logger.warn(`failed to commit mutations, retries left=${retriesLeft}`);
        if (retriesLeft === 0) {
          throw error;
        }
        await (0, import_generics.delay)(delayBetweenTriesMs);
      }
    }
  }
  return {
    get: async (type, ids) => {
      const ctx = txStorage.getStore();
      if (!ctx) {
        return state.get(type, ids);
      }
      const cached = ctx.cache[type] || {};
      const missing = ids.filter((id) => !(id in cached));
      if (missing.length > 0) {
        ctx.dbQueries++;
        logger.trace({ type, count: missing.length }, "fetching missing keys in transaction");
        const fetched = await getTxMutex(type).runExclusive(() => state.get(type, missing));
        ctx.cache[type] = ctx.cache[type] || {};
        Object.assign(ctx.cache[type], fetched);
      }
      const result = {};
      for (const id of ids) {
        const value = ctx.cache[type]?.[id];
        if (value !== void 0 && value !== null && typeof value !== "function") {
          result[id] = value;
        }
      }
      return result;
    },
    set: async (data) => {
      if (!data || typeof data !== "object") {
        warnDropOnce(logger, "keys.set called with non-object data \u2014 ignoring", { category: String(data), ids: [] });
        return;
      }
      const ctx = txStorage.getStore();
      if (!ctx) {
        const types = Object.keys(data);
        for (const type_ of types) {
          const type = type_;
          if (type === "pre-key") {
            await preKeyManager.validateDeletions(data, type);
          }
        }
        await Promise.all(types.map((type) => getQueue(type).add(async () => {
          const [cleanItems, dropped] = sanitizeItems(data[type]);
          if (dropped.length) {
            warnDropOnce(logger, "dropping unpersistable value(s)", { category: type, ids: dropped.slice(0, 5), count: dropped.length });
          }
          const typeData = { [type]: cleanItems };
          await state.set(typeData);
        })));
        return;
      }
      logger.trace({ types: Object.keys(data) }, "caching in transaction");
      for (const key_ in data) {
        const key = key_;
        ctx.cache[key] = ctx.cache[key] || {};
        ctx.mutations[key] = ctx.mutations[key] || {};
        if (key === "pre-key") {
          await preKeyManager.processOperations(data, key, ctx.cache, ctx.mutations, true);
        } else {
          const [cleanItems, dropped] = sanitizeItems(data[key]);
          if (dropped.length) {
            warnDropOnce(logger, "dropping unpersistable value(s) in transaction", { category: key, ids: dropped.slice(0, 5), count: dropped.length });
          }
          Object.assign(ctx.cache[key], cleanItems);
          Object.assign(ctx.mutations[key], cleanItems);
        }
      }
    },
    isInTransaction,
    transaction: async (work, key) => {
      const existing = txStorage.getStore();
      if (existing) {
        logger.trace("reusing existing transaction context");
        return work();
      }
      const mutex = getTxMutex(key);
      acquireTxMutexRef(key);
      try {
        return await mutex.runExclusive(async () => {
          const ctx = {
            cache: {},
            mutations: {},
            dbQueries: 0
          };
          logger.trace("entering transaction");
          try {
            const result = await txStorage.run(ctx, work);
            await commitWithRetry(ctx.mutations);
            logger.trace({ dbQueries: ctx.dbQueries }, "transaction completed");
            return result;
          } catch (error) {
            logger.error({ error }, "transaction failed, rolling back");
            throw error;
          }
        });
      } finally {
        releaseTxMutexRef(key);
      }
    },
    disposeTransactionStorage: () => {
      try {
        txStorage.disable();
      } catch (err) {
        logger.warn({ err }, "failed to disable transaction storage");
      }
    }
  };
};
const assertMeId = (creds) => {
  const id = creds.me?.id;
  if (!id) {
    throw new import_Addon.HttpError("Cannot proceed: socket is not authenticated yet (creds.me.id is missing)", { statusCode: 401 });
  }
  return id;
};
const initAuthCreds = () => {
  const identityKey = import_crypto.Curve.generateKeyPair();
  return {
    noiseKey: import_crypto.Curve.generateKeyPair(),
    pairingEphemeralKeyPair: import_crypto.Curve.generateKeyPair(),
    signedIdentityKey: identityKey,
    signedPreKey: (0, import_crypto.signedKeyPair)(identityKey, 1),
    registrationId: (0, import_generics.generateRegistrationId)(),
    advSecretKey: (0, import_node_crypto.randomBytes)(32).toString("base64"),
    processedHistoryMessages: [],
    nextPreKeyId: 1,
    firstUnuploadedPreKeyId: 1,
    accountSyncCounter: 0,
    accountSettings: {
      unarchiveChats: false
    },
    registered: false,
    pairingCode: void 0,
    lastPropHash: void 0,
    routingInfo: void 0,
    additionalData: void 0
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addTransactionCapability,
  assertMeId,
  initAuthCreds,
  makeCacheableSignalKeyStore
});
