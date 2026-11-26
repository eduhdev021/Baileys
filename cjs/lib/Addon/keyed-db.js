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
var keyed_db_exports = {};
__export(keyed_db_exports, {
  KeyedDB: () => KeyedDB
});
module.exports = __toCommonJS(keyed_db_exports);
var __classPrivateFieldSet = function(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet = function(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _KeyedDB_instances, _KeyedDB_spec, _KeyedDB_idGetter, _KeyedDB_items, _KeyedDB_byId, _KeyedDB_key, _KeyedDB_id, _KeyedDB_lowerBound, _KeyedDB_sameKey, _KeyedDB_insertNew;
function snapshotProperties(value) {
  if (value === null || typeof value !== "object" && typeof value !== "function") {
    return null;
  }
  return Object.getOwnPropertyDescriptors(value);
}
function restoreProperties(value, snapshot) {
  if (!snapshot) {
    return;
  }
  for (const key of Reflect.ownKeys(value)) {
    if (!Object.prototype.hasOwnProperty.call(snapshot, key)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor?.configurable) {
        Reflect.deleteProperty(value, key);
      }
    }
  }
  Object.defineProperties(value, snapshot);
}
class KeyedDB {
  constructor(key, id) {
    _KeyedDB_instances.add(this);
    _KeyedDB_spec.set(this, void 0);
    _KeyedDB_idGetter.set(this, void 0);
    _KeyedDB_items.set(this, []);
    _KeyedDB_byId.set(this, /* @__PURE__ */ new Map());
    if (typeof key?.key !== "function" || typeof key?.compare !== "function") {
      throw new TypeError("key must provide key(value) and compare(a, b) functions");
    }
    if (id !== void 0 && typeof id !== "function") {
      throw new TypeError("id must be a function");
    }
    __classPrivateFieldSet(this, _KeyedDB_spec, key, "f");
    __classPrivateFieldSet(this, _KeyedDB_idGetter, id, "f");
  }
  clear() {
    __classPrivateFieldGet(this, _KeyedDB_items, "f").length = 0;
    __classPrivateFieldGet(this, _KeyedDB_byId, "f").clear();
  }
  insertIfAbsent(...values) {
    const inserted = [];
    for (const value of values) {
      if (!value) {
        continue;
      }
      const id = __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_id).call(this, value);
      if (__classPrivateFieldGet(this, _KeyedDB_byId, "f").has(id)) {
        continue;
      }
      const key = __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_key).call(this, value);
      const index = __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_lowerBound).call(this, key);
      if (index < __classPrivateFieldGet(this, _KeyedDB_items, "f").length && __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_sameKey).call(this, __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_key).call(this, __classPrivateFieldGet(this, _KeyedDB_items, "f")[index]), key)) {
        continue;
      }
      __classPrivateFieldGet(this, _KeyedDB_items, "f").splice(index, 0, value);
      __classPrivateFieldGet(this, _KeyedDB_byId, "f").set(id, value);
      inserted.push(value);
    }
    return inserted;
  }
  upsert(...values) {
    const updated = [];
    for (const value of values) {
      if (!value) {
        continue;
      }
      const id = __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_id).call(this, value);
      const previous = __classPrivateFieldGet(this, _KeyedDB_byId, "f").get(id);
      const exists = __classPrivateFieldGet(this, _KeyedDB_byId, "f").has(id);
      const key = __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_key).call(this, value);
      const index = __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_lowerBound).call(this, key);
      if (index < __classPrivateFieldGet(this, _KeyedDB_items, "f").length && __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_sameKey).call(this, __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_key).call(this, __classPrivateFieldGet(this, _KeyedDB_items, "f")[index]), key) && __classPrivateFieldGet(this, _KeyedDB_items, "f")[index] !== previous) {
        throw new Error(`duplicate key: ${String(key)}`);
      }
      if (!exists) {
        __classPrivateFieldGet(this, _KeyedDB_items, "f").splice(index, 0, value);
        __classPrivateFieldGet(this, _KeyedDB_byId, "f").set(id, value);
        continue;
      }
      const oldKey = __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_key).call(this, previous);
      const oldIndex = __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_lowerBound).call(this, oldKey);
      if (__classPrivateFieldGet(this, _KeyedDB_items, "f")[oldIndex] !== previous) {
        throw new Error("KeyedDB index is inconsistent");
      }
      if (__classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_sameKey).call(this, oldKey, key)) {
        __classPrivateFieldGet(this, _KeyedDB_items, "f")[oldIndex] = value;
      } else {
        __classPrivateFieldGet(this, _KeyedDB_items, "f").splice(oldIndex, 1);
        __classPrivateFieldGet(this, _KeyedDB_items, "f").splice(__classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_lowerBound).call(this, key), 0, value);
      }
      __classPrivateFieldGet(this, _KeyedDB_byId, "f").set(id, value);
      updated.push(value);
    }
    return updated;
  }
  update(id, callback) {
    if (typeof callback !== "function") {
      throw new TypeError("update must be a function");
    }
    if (!__classPrivateFieldGet(this, _KeyedDB_byId, "f").has(id)) {
      return void 0;
    }
    const value = __classPrivateFieldGet(this, _KeyedDB_byId, "f").get(id);
    const oldId = __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_id).call(this, value);
    const oldKey = __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_key).call(this, value);
    const oldIndex = __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_lowerBound).call(this, oldKey);
    if (__classPrivateFieldGet(this, _KeyedDB_items, "f")[oldIndex] !== value) {
      throw new Error("KeyedDB index is inconsistent");
    }
    const snapshot = snapshotProperties(value);
    let removed = false;
    try {
      callback(value);
      const nextId = __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_id).call(this, value);
      const nextKey = __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_key).call(this, value);
      if (!Object.is(nextId, oldId) && __classPrivateFieldGet(this, _KeyedDB_byId, "f").has(nextId)) {
        throw new Error(`duplicate ID: ${String(nextId)}`);
      }
      if (__classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_sameKey).call(this, oldKey, nextKey)) {
        if (!Object.is(nextId, oldId)) {
          __classPrivateFieldGet(this, _KeyedDB_byId, "f").delete(oldId);
          __classPrivateFieldGet(this, _KeyedDB_byId, "f").set(nextId, value);
        }
        return 1;
      }
      __classPrivateFieldGet(this, _KeyedDB_items, "f").splice(oldIndex, 1);
      removed = true;
      const nextIndex = __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_lowerBound).call(this, nextKey);
      if (nextIndex < __classPrivateFieldGet(this, _KeyedDB_items, "f").length && __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_sameKey).call(this, __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_key).call(this, __classPrivateFieldGet(this, _KeyedDB_items, "f")[nextIndex]), nextKey)) {
        throw new Error(`duplicate key: ${String(nextKey)}`);
      }
      __classPrivateFieldGet(this, _KeyedDB_items, "f").splice(nextIndex, 0, value);
      removed = false;
      if (!Object.is(nextId, oldId)) {
        __classPrivateFieldGet(this, _KeyedDB_byId, "f").delete(oldId);
        __classPrivateFieldGet(this, _KeyedDB_byId, "f").set(nextId, value);
      }
      return 2;
    } catch (error) {
      restoreProperties(value, snapshot);
      if (removed) {
        __classPrivateFieldGet(this, _KeyedDB_items, "f").splice(oldIndex, 0, value);
      }
      throw error;
    }
  }
  get(id) {
    return __classPrivateFieldGet(this, _KeyedDB_byId, "f").get(id);
  }
  deleteById(id, assertPresent = true) {
    if (!__classPrivateFieldGet(this, _KeyedDB_byId, "f").has(id)) {
      if (assertPresent) {
        throw new Error("Value not found");
      }
      return void 0;
    }
    return this.delete(__classPrivateFieldGet(this, _KeyedDB_byId, "f").get(id));
  }
  delete(value) {
    if (value == null) {
      return null;
    }
    const key = __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_key).call(this, value);
    const index = __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_lowerBound).call(this, key);
    if (index >= __classPrivateFieldGet(this, _KeyedDB_items, "f").length || !__classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_sameKey).call(this, __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_key).call(this, __classPrivateFieldGet(this, _KeyedDB_items, "f")[index]), key)) {
      return null;
    }
    const removed = __classPrivateFieldGet(this, _KeyedDB_items, "f").splice(index, 1)[0];
    __classPrivateFieldGet(this, _KeyedDB_byId, "f").delete(__classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_id).call(this, removed));
    return removed;
  }
  filter(predicate = () => true) {
    if (typeof predicate !== "function") {
      throw new TypeError("predicate must be a function");
    }
    const result = new KeyedDB(__classPrivateFieldGet(this, _KeyedDB_spec, "f"), __classPrivateFieldGet(this, _KeyedDB_idGetter, "f"));
    for (let index = 0; index < __classPrivateFieldGet(this, _KeyedDB_items, "f").length; index++) {
      const value = __classPrivateFieldGet(this, _KeyedDB_items, "f")[index];
      if (predicate(value, index)) {
        __classPrivateFieldGet(result, _KeyedDB_items, "f").push(value);
        __classPrivateFieldGet(result, _KeyedDB_byId, "f").set(__classPrivateFieldGet(result, _KeyedDB_instances, "m", _KeyedDB_id).call(result, value), value);
      }
    }
    return result;
  }
  all() {
    return __classPrivateFieldGet(this, _KeyedDB_items, "f").slice();
  }
  toJSON() {
    return __classPrivateFieldGet(this, _KeyedDB_items, "f");
  }
}
_KeyedDB_spec = /* @__PURE__ */ new WeakMap(), _KeyedDB_idGetter = /* @__PURE__ */ new WeakMap(), _KeyedDB_items = /* @__PURE__ */ new WeakMap(), _KeyedDB_byId = /* @__PURE__ */ new WeakMap(), _KeyedDB_instances = /* @__PURE__ */ new WeakSet(), _KeyedDB_key = function _KeyedDB_key2(value) {
  return __classPrivateFieldGet(this, _KeyedDB_spec, "f").key(value);
}, _KeyedDB_id = function _KeyedDB_id2(value) {
  const id = __classPrivateFieldGet(this, _KeyedDB_idGetter, "f") ? __classPrivateFieldGet(this, _KeyedDB_idGetter, "f").call(this, value) : String(__classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_key).call(this, value));
  if (id == null) {
    throw new TypeError("ID must not be null or undefined");
  }
  return id;
}, _KeyedDB_lowerBound = function _KeyedDB_lowerBound2(key) {
  let low = 0;
  let high = __classPrivateFieldGet(this, _KeyedDB_items, "f").length;
  while (low < high) {
    const mid = low + (high - low >>> 1);
    if (__classPrivateFieldGet(this, _KeyedDB_spec, "f").compare(__classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_key).call(this, __classPrivateFieldGet(this, _KeyedDB_items, "f")[mid]), key) < 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}, _KeyedDB_sameKey = function _KeyedDB_sameKey2(a, b) {
  return __classPrivateFieldGet(this, _KeyedDB_spec, "f").compare(a, b) === 0;
}, _KeyedDB_insertNew = function _KeyedDB_insertNew2(value, id = __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_id).call(this, value), key = __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_key).call(this, value)) {
  if (__classPrivateFieldGet(this, _KeyedDB_byId, "f").has(id)) {
    throw new Error(`duplicate ID: ${String(id)}`);
  }
  const index = __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_lowerBound).call(this, key);
  if (index < __classPrivateFieldGet(this, _KeyedDB_items, "f").length && __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_sameKey).call(this, __classPrivateFieldGet(this, _KeyedDB_instances, "m", _KeyedDB_key).call(this, __classPrivateFieldGet(this, _KeyedDB_items, "f")[index]), key)) {
    throw new Error(`duplicate key: ${String(key)}`);
  }
  __classPrivateFieldGet(this, _KeyedDB_items, "f").splice(index, 0, value);
  __classPrivateFieldGet(this, _KeyedDB_byId, "f").set(id, value);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  KeyedDB
});
