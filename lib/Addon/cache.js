/**
 * `createCache` — an in-memory TTL + LRU cache used for message retry tracking,
 * signal-key caching, debounce maps and any other short-lived bookkeeping the
 * socket needs. The API follows the familiar node-cache surface so it drops in
 * wherever a cache is expected, without pulling in any dependency.
 *
 *   const cache = createCache({ ttl: 60, max: 1024 });
 *   cache.set('key', value);        // ttl defaults to the cache-level TTL (seconds)
 *   cache.get('key');               // undefined when missing or expired
 *   cache.has('key');               // no hit/miss accounting
 *   cache.del('key');               // number of entries removed
 *   cache.keys();                   // live keys (expired ones excluded)
 *   cache.getStats();               // { hits, misses, keys }
 *   cache.flushAll();               // drop everything
 *   cache.close();                  // release the internal sweep timer
 *
 * Options:
 *   - ttl  — default time-to-live in SECONDS (0 or undefined = no expiry)
 *   - max  — maximum number of entries; when exceeded the least-recently-used
 *            entry is evicted (recency is refreshed by get/set/has)
 */
export function createCache(options = {}) {
    const max = Number.isFinite(options.max) && options.max > 0 ? Math.floor(options.max) : Infinity;

    // Map preserves insertion order; on access we re-insert to keep LRU order.
    const entries = new Map();
    const stats = { hits: 0, misses: 0 };
    let sweepTimer = null;
    let closed = false;

    // Cache-level default TTL in milliseconds (0 = no expiry)
    const defaultTtlMs = normalizeTtlMs(options.ttl);

    function normalizeTtlMs(t) {
        if (t === undefined || t === null || t === false) return 0;
        const n = Number(t);
        if (!Number.isFinite(n) || n <= 0) return 0;
        return n * 1000; // seconds -> milliseconds
    }

    function sweep() {
        const now = Date.now();
        for (const [key, entry] of entries) {
            if (entry.expiresAt !== 0 && entry.expiresAt <= now) {
                entries.delete(key);
            }
        }
    }

    function evictOverflow() {
        while (entries.size > max) {
            // First key in insertion order is the least-recently-used.
            const oldest = entries.keys().next().value;
            entries.delete(oldest);
        }
    }

    function touch(key, entry) {
        entries.delete(key);
        entries.set(key, entry);
    }

    function isExpired(entry) {
        return entry.expiresAt !== 0 && entry.expiresAt <= Date.now();
    }

    const cache = {
        /** Stores a value. An optional per-entry ttl (seconds) overrides the cache default. */
        set(key, value, ttlOverride) {
            if (closed) return false;
            const ms = ttlOverride === undefined || ttlOverride === null ? defaultTtlMs : normalizeTtlMs(ttlOverride);
            const expiresAt = ms > 0 ? Date.now() + ms : 0;
            touch(key, { value, expiresAt });
            evictOverflow();
            return true;
        },

        /** Returns the stored value, or undefined when missing or expired. Counts a hit/miss. */
        get(key) {
            if (closed) return undefined;
            const entry = entries.get(key);
            if (entry === undefined || isExpired(entry)) {
                if (entry !== undefined) entries.delete(key);
                stats.misses++;
                return undefined;
            }
            stats.hits++;
            touch(key, entry); // refresh LRU recency
            return entry.value;
        },

        /** Returns true when the key exists and has not expired. No hit/miss accounting. */
        has(key) {
            if (closed) return false;
            const entry = entries.get(key);
            if (entry === undefined) return false;
            if (isExpired(entry)) {
                entries.delete(key);
                return false;
            }
            touch(key, entry);
            return true;
        },

        /** Deletes one or more keys (a single key, varargs, or an array). Returns the count removed. */
        del(...keys) {
            const list = keys.length === 1 && Array.isArray(keys[0]) ? keys[0] : keys;
            let deleted = 0;
            for (const key of list) {
                if (entries.delete(key)) deleted++;
            }
            return deleted;
        },

        /** Sets many entries at once: mset([{ key, val, ttl? }, ...]). */
        mset(list) {
            if (!Array.isArray(list)) return false;
            for (const item of list) {
                if (item === null || typeof item !== 'object' || !('key' in item) || !('val' in item)) return false;
                cache.set(item.key, item.val, item.ttl);
            }
            return true;
        },

        /** Returns an object of found entries: mget('a', 'b') -> { a: 1, b: 2 }. Missing keys are omitted. */
        mget(...keys) {
            const list = keys.length === 1 && Array.isArray(keys[0]) ? keys[0] : keys;
            const found = {};
            for (const key of list) {
                if (key === undefined || key === null) continue;
                const value = cache.get(key);
                if (value !== undefined) found[key] = value;
            }
            return found;
        },

        /** Deletes many keys: mdel('a', 'b') or mdel(['a', 'b']). Returns the count removed. */
        mdel(...keys) {
            const list = keys.length === 1 && Array.isArray(keys[0]) ? keys[0] : keys;
            return cache.del(list);
        },

        /** Removes every entry from the cache. */
        flushAll() {
            entries.clear();
        },

        /** Returns every live (non-expired) key. */
        keys() {
            sweep();
            return [...entries.keys()];
        },

        /** Returns cumulative statistics: { hits, misses, keys }. */
        getStats() {
            sweep();
            return { hits: stats.hits, misses: stats.misses, keys: entries.size };
        },

        /** Current number of live entries. */
        get size() {
            sweep();
            return entries.size;
        },

        /** Approximate payload size in bytes (buffers counted, other values not measured). */
        get calculatedSize() {
            sweep();
            let total = 0;
            for (const entry of entries.values()) {
                const v = entry.value;
                if (Buffer.isBuffer(v)) total += v.length;
                else if (ArrayBuffer.isView(v)) total += v.byteLength;
                else if (typeof v === 'string') total += Buffer.byteLength(v);
            }
            return total;
        },

        /**
         * Stops the background sweep timer. The cache remains usable after close()
         * (expiry then happens lazily on access), but no timers are left running —
         * important so sockets can shut down cleanly.
         */
        close() {
            closed = false; // keep lazy access working on purpose
            if (sweepTimer) {
                clearInterval(sweepTimer);
                sweepTimer = null;
            }
        }
    };

    // Background sweep keeps memory bounded even for rarely-read keys.
    // Unref'd so it never keeps the process alive on its own.
    if (typeof setInterval === 'function') {
        sweepTimer = setInterval(sweep, 60_000);
        if (typeof sweepTimer.unref === 'function') sweepTimer.unref();
    }

    return cache;
}
