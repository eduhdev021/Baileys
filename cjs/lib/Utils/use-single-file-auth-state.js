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
var use_single_file_auth_state_exports = {};
__export(use_single_file_auth_state_exports, {
  useSingleFileAuthState: () => useSingleFileAuthState
});
module.exports = __toCommonJS(use_single_file_auth_state_exports);
var import_promises = require("node:fs/promises");
var import_WAProto = require("../../WAProto/index.js");
var import_Addon = require("../Addon/index.js");
var import_auth_utils = require("./auth-utils.js");
var import_generics = require("./generics.js");
const FLUSH_DELAY_MS = 3e3;
const files = /* @__PURE__ */ new Map();
const useSingleFileAuthState = async (fileName) => {
  let shared = files.get(fileName);
  if (!shared)
    files.set(fileName, shared = { mutex: (0, import_Addon.createMutex)(), flush: null });
  const { mutex } = shared;
  await shared.flush?.();
  const tempFile = fileName + ".temp";
  const store = /* @__PURE__ */ Object.create(null);
  let ver = 0, saved = 0, timer = null;
  await mutex.runExclusive(async () => {
    try {
      Object.assign(store, JSON.parse(await (0, import_promises.readFile)(fileName, "utf-8"), import_generics.BufferJSON.reviver));
    } catch (err) {
      if (err.code === "EISDIR")
        throw new Error(`found something that is not a file at ${fileName}, either delete it or specify a different location`);
      if (err.code !== "ENOENT")
        await (0, import_promises.rename)(fileName, fileName + ".corrupt").catch(() => {
        });
    }
  });
  const flush = () => {
    clearTimeout(timer);
    timer = null;
    return mutex.runExclusive(async () => {
      if (ver === saved)
        return;
      const v = ver;
      try {
        const fh = await (0, import_promises.open)(tempFile, "w");
        try {
          const json = (0, import_generics.serializeAuthValue)(store);
          if (typeof json !== "string")
            throw new Error("auth store is not serializable");
          await fh.writeFile(json);
          await fh.datasync();
        } finally {
          await fh.close();
        }
        await (0, import_promises.rename)(tempFile, fileName);
        saved = v;
      } catch {
        schedule();
      }
    });
  };
  const schedule = () => {
    timer ?? (timer = setTimeout(flush, FLUSH_DELAY_MS));
  };
  shared.flush = flush;
  const creds = store.creds ?? (store.creds = (0, import_auth_utils.initAuthCreds)());
  return {
    state: {
      creds,
      keys: {
        get: (type, ids) => {
          const data = {};
          for (const id of ids) {
            const value = store[type + id];
            data[id] = value && type === "app-state-sync-key" ? import_WAProto.proto.Message.AppStateSyncKeyData.fromObject(value) : value;
          }
          return data;
        },
        set: (data) => {
          for (const type in data) {
            const items = data[type];
            for (const id in items) {
              const value = items[id];
              if (value === void 0 || typeof value === "function" || typeof value === "symbol") {
                console.warn("[baileys:auth-state] skipping unpersistable value:", { type, id: String(id), valueType: typeof value });
                continue;
              }
              if (value)
                store[type + id] = typeof value.constructor?.toObject === "function" && typeof value.toJSON === "function" && value.constructor !== Object ? value.constructor.toObject(value) : value;
              else
                delete store[type + id];
            }
          }
          ver++;
          schedule();
        }
      }
    },
    saveCreds: () => {
      ver++;
      return flush();
    },
    flush
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  useSingleFileAuthState
});
