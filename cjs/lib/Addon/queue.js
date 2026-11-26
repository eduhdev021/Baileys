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
var queue_exports = {};
__export(queue_exports, {
  createQueue: () => createQueue
});
module.exports = __toCommonJS(queue_exports);
function createQueue(concurrency = 1) {
  const limit = Number.isFinite(concurrency) && concurrency > 0 ? Math.floor(concurrency) : 1;
  const pending = [];
  let active = 0;
  function pump() {
    while (active < limit && pending.length > 0) {
      const { task, resolve, reject } = pending.shift();
      active++;
      Promise.resolve().then(task).then(resolve, reject).finally(() => {
        active--;
        pump();
      });
    }
  }
  function add(task) {
    if (typeof task !== "function") {
      return Promise.reject(new TypeError("queue.add() expects a function"));
    }
    return new Promise((resolve, reject) => {
      pending.push({ task, resolve, reject });
      pump();
    });
  }
  return {
    add,
    push: add
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createQueue
});
