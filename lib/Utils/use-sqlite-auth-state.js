import { proto } from '../../WAProto/index.js';
import { initAuthCreds } from './auth-utils.js';
import { BufferJSON, serializeAuthValue } from './generics.js';
// Refactored useSqliteAuthState to use bun:sqlite, node:sqlite and better-sqlite3 with synchronous prepared statements
const CREDS_KEY = '__creds__';
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
        return (await import('bun:sqlite')).Database;
    try {
        return (await import('node:sqlite')).DatabaseSync;
    }
    catch { }
    try {
        const mod = await import('better-sqlite3');
        return mod.default ?? mod;
    }
    catch (cause) {
        throw new Error('No SQLite driver found. Use Bun, Node >= 22.13, or install "better-sqlite3".', { cause });
    }
};
export async function useSqliteAuthState(dbPath, ownedDatabase) {
    const owned = !ownedDatabase;
    let db = ownedDatabase;
    if (owned) {
        const Database = await loadDriver();
        db = new Database(dbPath);
    }
    db.exec(SCHEMA);
    const acts = {
        credsGet: db.prepare('SELECT value FROM creds WHERE key = ?'),
        credsSet: db.prepare('INSERT OR REPLACE INTO creds (key, value) VALUES (?, ?)'),
        keyGet: db.prepare('SELECT value FROM signal_keys WHERE type = ? AND id = ?'),
        keySet: db.prepare('INSERT OR REPLACE INTO signal_keys (type, id, value) VALUES (?, ?, ?)'),
        keyDel: db.prepare('DELETE FROM signal_keys WHERE type = ? AND id = ?'),
        begin: db.prepare('BEGIN IMMEDIATE'),
        commit: db.prepare('COMMIT'),
        rollback: db.prepare('ROLLBACK')
    };
    const row = acts.credsGet.get(CREDS_KEY);
    const creds = row ? JSON.parse(row.value, BufferJSON.reviver) : initAuthCreds();
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
                        const value = JSON.parse(r.value, BufferJSON.reviver);
                        data[id] = type === 'app-state-sync-key'
                            ? proto.Message.AppStateSyncKeyData.fromObject(value)
                            : value;
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
                                if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
                                    // nothing persistable — keep existing state intact (same policy as useMultiFileAuthState)
                                    console.warn('[baileys:auth-state] skipping unpersistable value:', { type, id: String(id), valueType: typeof value });
                                    continue;
                                }
                                if (value) {
                                    const json = serializeAuthValue(value);
                                    if (typeof json === 'string')
                                        acts.keySet.run(type, id, json);
                                }
                                else
                                    acts.keyDel.run(type, id);
                            }
                        }
                        acts.commit.run();
                    }
                    catch (err) {
                        try {
                            acts.rollback.run();
                        }
                        catch { }
                        throw err;
                    }
                }
            }
        },
        saveCreds: () => {
            const json = serializeAuthValue(creds);
            if (typeof json !== 'string' || json === lastCreds)
                return;
            acts.credsSet.run(CREDS_KEY, json);
            lastCreds = json;
        },
        close: () => owned && db.close()
    };
}
