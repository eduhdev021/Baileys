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
var use_multi_file_auth_state_exports = {};
__export(use_multi_file_auth_state_exports, {
  useMultiFileAuthState: () => useMultiFileAuthState
});
module.exports = __toCommonJS(use_multi_file_auth_state_exports);
var import_promises = require("node:fs/promises");
var import_node_path = require("node:path");
var import_WAProto = require("../../WAProto/index.js");
var import_Addon = require("../Addon/index.js");
var import_auth_utils = require("./auth-utils.js");
var import_generics = require("./generics.js");
const WRITE_BATCH = 32;
const locks = /* @__PURE__ */ new Map();
const noop = () => {
};
const warnedUnpersistable = /* @__PURE__ */ new Set();
const warnUnpersistable = (logger, category, id, value, path, reason) => {
  const dedupeKey = `${category}|${id}|${reason}`;
  if (warnedUnpersistable.size > 500)
    warnedUnpersistable.clear();
  if (warnedUnpersistable.has(dedupeKey))
    return;
  warnedUnpersistable.add(dedupeKey);
  let origin = "";
  try {
    origin = new Error().stack?.split("\n").slice(4, 8).map((l) => l.trim()).join(" <- ") || "";
  } catch {
  }
  const info = {
    category,
    id: String(id),
    valueType: typeof value,
    isProtoInstance: !!value?.toJSON && !!value?.$type,
    file: path,
    reason,
    origin
  };
  try {
    if (logger?.warn) {
      logger.warn(info, "skipping unpersistable auth-state value");
    } else {
      console.warn("[baileys:auth-state] skipping unpersistable value:", info);
    }
  } catch {
  }
};
const withLock = async (path, fn) => {
  let entry = locks.get(path);
  if (!entry)
    locks.set(path, entry = { mutex: (0, import_Addon.createMutex)(), refs: 0 });
  entry.refs++;
  try {
    return await entry.mutex.runExclusive(fn);
  } finally {
    if (!--entry.refs)
      locks.delete(path);
  }
};
const writeAtomic = async (path, json, durable) => {
  if (typeof json !== "string")
    return;
  const tmp = path + ".tmp";
  const fh = await (0, import_promises.open)(tmp, "w");
  try {
    await fh.writeFile(json);
    if (durable)
      await fh.datasync();
  } finally {
    await fh.close();
  }
  await (0, import_promises.rename)(tmp, path);
};
const readJson = (path, quarantine) => withLock(path, async () => {
  let raw;
  try {
    raw = await (0, import_promises.readFile)(path, "utf-8");
  } catch (err) {
    if (err.code === "ENOENT")
      return null;
    throw err;
  }
  try {
    return JSON.parse(raw, import_generics.BufferJSON.reviver);
  } catch {
    if (quarantine)
      await (0, import_promises.rename)(path, path + ".corrupt").catch(noop);
    return null;
  }
});
const fixFileName = (file) => file.replace(/\//g, "__").replace(/:/g, "-");
const useMultiFileAuthState = async (folder, logger) => {
  try {
    await (0, import_promises.mkdir)(folder, { recursive: true });
  } catch (err) {
    if (err.code === "EEXIST" || err.code === "ENOTDIR")
      throw new Error(`Found something that is not a directory at ${folder}, either delete it or specify a different location`);
    throw err;
  }
  const pathOf = (file) => (0, import_node_path.join)(folder, fixFileName(file));
  const credsPath = pathOf("creds.json");
  const creds = await readJson(credsPath, true) ?? (0, import_auth_utils.initAuthCreds)();
  let lastCreds;
  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(ids.map(async (id) => {
            let value = await readJson(pathOf(`${type}-${id}.json`));
            if (type === "app-state-sync-key" && value) {
              value = import_WAProto.proto.Message.AppStateSyncKeyData.fromObject(value);
            }
            data[id] = value;
          }));
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            const items = data[category];
            for (const id in items) {
              const value = items[id];
              const path = pathOf(`${category}-${id}.json`);
              if (value === void 0 || typeof value === "function" || typeof value === "symbol") {
                warnUnpersistable(logger, category, id, value, path, value === void 0 ? "value is undefined" : "value is a function/symbol");
                continue;
              }
              tasks.push(value ? () => withLock(path, () => writeAtomic(path, (0, import_generics.serializeAuthValue)(value, (reason) => warnUnpersistable(logger, category, id, value, path, reason)), false)) : () => withLock(path, () => (0, import_promises.unlink)(path).catch((err) => {
                if (err.code !== "ENOENT")
                  throw err;
              })));
            }
          }
          for (let i = 0; i < tasks.length; i += WRITE_BATCH) {
            await Promise.all(tasks.slice(i, i + WRITE_BATCH).map((run) => run()));
          }
        }
      }
    },
    saveCreds: () => {
      const json = (0, import_generics.serializeAuthValue)(creds, (reason) => warnUnpersistable(logger, "creds", "creds", creds, credsPath, reason));
      if (json === void 0 || json === lastCreds)
        return Promise.resolve();
      return withLock(credsPath, async () => {
        await writeAtomic(credsPath, json, true);
        lastCreds = json;
      });
    }
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  useMultiFileAuthState
});
