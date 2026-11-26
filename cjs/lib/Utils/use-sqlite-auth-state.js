var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var use_sqlite_auth_state_exports = {};
__export(use_sqlite_auth_state_exports, {
  useSqliteAuthState: () => useSqliteAuthState
});
module.exports = __toCommonJS(use_sqlite_auth_state_exports);
var import_WAProto = require("../../WAProto/index.js");
var import_auth_utils = require("./auth-utils.js");
var import_generics = require("./generics.js");
const CREDS_KEY = "__creds__";
const SCHEMA = `
PRAGMA busy_timeout = 5000;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
CREATE TABLE IF NOT EXISTS creds (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS signal_keys (
    type TEXT NOT NULL,
    id TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (type, id)
) WITHOUT ROWID;
DROP INDEX IF EXISTS signal_keys_type_idx;
`;
const loadDriver = async () => {
  if (process.versions.bun)
    return (await import("bun:sqlite")).Database;
  try {
    return (await import("node:sqlite")).DatabaseSync;
  } catch {
  }
  try {
    const mod = await import("better-sqlite3");
    return mod.default ?? mod;
  } catch (cause) {
    throw new Error('No SQLite driver found. Use Bun, Node >= 22.13, or install "better-sqlite3".', { cause });
  }
};
async function useSqliteAuthState(dbPath, ownedDatabase) {
  const owned = !ownedDatabase;
  let db = ownedDatabase;
  if (owned) {
    const Database = await loadDriver();
    db = new Database(dbPath);
  }
  db.exec(SCHEMA);
  const acts = {
    credsGet: db.prepare("SELECT value FROM creds WHERE key = ?"),
    credsSet: db.prepare("INSERT OR REPLACE INTO creds (key, value) VALUES (?, ?)"),
    keyGet: db.prepare("SELECT value FROM signal_keys WHERE type = ? AND id = ?"),
    keySet: db.prepare("INSERT OR REPLACE INTO signal_keys (type, id, value) VALUES (?, ?, ?)"),
    keyDel: db.prepare("DELETE FROM signal_keys WHERE type = ? AND id = ?"),
    begin: db.prepare("BEGIN IMMEDIATE"),
    commit: db.prepare("COMMIT"),
    rollback: db.prepare("ROLLBACK")
  };
  const row = acts.credsGet.get(CREDS_KEY);
  const creds = row ? JSON.parse(row.value, import_generics.BufferJSON.reviver) : (0, import_auth_utils.initAuthCreds)();
  let lastCreds = row?.value;
  return {
    state: {
      creds,
      keys: {
        get: (type, ids) => {
          const data = {};
          for (const id of ids) {
            const r = acts.keyGet.get(type, id);
            if (!r)
              continue;
            const value = JSON.parse(r.value, import_generics.BufferJSON.reviver);
            data[id] = type === "app-state-sync-key" ? import_WAProto.proto.Message.AppStateSyncKeyData.fromObject(value) : value;
          }
          return data;
        },
        set: (data) => {
          acts.begin.run();
          try {
            for (const type in data) {
              const items = data[type];
              for (const id in items) {
                const value = items[id];
                if (value === void 0 || typeof value === "function" || typeof value === "symbol") {
                  console.warn("[baileys:auth-state] skipping unpersistable value:", { type, id: String(id), valueType: typeof value });
                  continue;
                }
                if (value) {
                  const json = (0, import_generics.serializeAuthValue)(value);
                  if (typeof json === "string")
                    acts.keySet.run(type, id, json);
                } else
                  acts.keyDel.run(type, id);
              }
            }
            acts.commit.run();
          } catch (err) {
            try {
              acts.rollback.run();
            } catch {
            }
            throw err;
          }
        }
      }
    },
    saveCreds: () => {
      const json = (0, import_generics.serializeAuthValue)(creds);
      if (typeof json !== "string" || json === lastCreds)
        return;
      acts.credsSet.run(CREDS_KEY, json);
      lastCreds = json;
    },
    close: () => owned && db.close()
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  useSqliteAuthState
});
