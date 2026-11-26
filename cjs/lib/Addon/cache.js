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
var cache_exports = {};
__export(cache_exports, {
  createCache: () => createCache
});
module.exports = __toCommonJS(cache_exports);
function createCache(options = {}) {
  const max = Number.isFinite(options.max) && options.max > 0 ? Math.floor(options.max) : Infinity;
  const entries = /* @__PURE__ */ new Map();
  const stats = { hits: 0, misses: 0 };
  let sweepTimer = null;
  let closed = false;
  const defaultTtlMs = normalizeTtlMs(options.ttl);
  function normalizeTtlMs(t) {
    if (t === void 0 || t === null || t === false) return 0;
    const n = Number(t);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return n * 1e3;
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
      const ms = ttlOverride === void 0 || ttlOverride === null ? defaultTtlMs : normalizeTtlMs(ttlOverride);
      const expiresAt = ms > 0 ? Date.now() + ms : 0;
      touch(key, { value, expiresAt });
      evictOverflow();
      return true;
    },
    /** Returns the stored value, or undefined when missing or expired. Counts a hit/miss. */
    get(key) {
      if (closed) return void 0;
      const entry = entries.get(key);
      if (entry === void 0 || isExpired(entry)) {
        if (entry !== void 0) entries.delete(key);
        stats.misses++;
        return void 0;
      }
      stats.hits++;
      touch(key, entry);
      return entry.value;
    },
    /** Returns true when the key exists and has not expired. No hit/miss accounting. */
    has(key) {
      if (closed) return false;
      const entry = entries.get(key);
      if (entry === void 0) return false;
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
        if (item === null || typeof item !== "object" || !("key" in item) || !("val" in item)) return false;
        cache.set(item.key, item.val, item.ttl);
      }
      return true;
    },
    /** Returns an object of found entries: mget('a', 'b') -> { a: 1, b: 2 }. Missing keys are omitted. */
    mget(...keys) {
      const list = keys.length === 1 && Array.isArray(keys[0]) ? keys[0] : keys;
      const found = {};
      for (const key of list) {
        if (key === void 0 || key === null) continue;
        const value = cache.get(key);
        if (value !== void 0) found[key] = value;
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
        else if (typeof v === "string") total += Buffer.byteLength(v);
      }
      return total;
    },
    /**
     * Stops the background sweep timer. The cache remains usable after close()
     * (expiry then happens lazily on access), but no timers are left running —
     * important so sockets can shut down cleanly.
     */
    close() {
      closed = false;
      if (sweepTimer) {
        clearInterval(sweepTimer);
        sweepTimer = null;
      }
    }
  };
  if (typeof setInterval === "function") {
    sweepTimer = setInterval(sweep, 6e4);
    if (typeof sweepTimer.unref === "function") sweepTimer.unref();
  }
  return cache;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createCache
});
