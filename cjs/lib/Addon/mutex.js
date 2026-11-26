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
var mutex_exports = {};
__export(mutex_exports, {
  createMutex: () => createMutex
});
module.exports = __toCommonJS(mutex_exports);
function createMutex() {
  let locked = false;
  const queue = [];
  function dispatchNext() {
    const next = queue.shift();
    if (next) {
      next.resolve(release);
    } else {
      locked = false;
    }
  }
  function release() {
    dispatchNext();
  }
  function acquire() {
    return new Promise((resolve, reject) => {
      if (!locked) {
        locked = true;
        resolve(release);
      } else {
        queue.push({ resolve, reject });
      }
    });
  }
  function tryAcquire() {
    if (locked) return void 0;
    locked = true;
    return release;
  }
  async function runExclusive(task) {
    const releaseFn = await acquire();
    try {
      return await task();
    } finally {
      releaseFn();
    }
  }
  return {
    /** Alias of acquire(). */
    lock: acquire,
    /** Acquires the lock, resolving to a release function. */
    acquire,
    /** Acquires without waiting: returns a release function, or undefined when locked. */
    tryAcquire,
    /** Alias of tryAcquire(). */
    tryLock: tryAcquire,
    /** Runs `task` while holding the lock; resolves/rejects with the task result. */
    runExclusive,
    /** True while the lock is held. */
    isLocked: () => locked
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createMutex
});
