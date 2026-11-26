import { readFile, rename, open } from 'node:fs/promises';
import { proto } from '../../WAProto/index.js';
import { createMutex } from '../Addon/index.js';
import { initAuthCreds } from './auth-utils.js';
import { BufferJSON, serializeAuthValue } from './generics.js';
// Refactored useSingleFileAuthState with debounced atomic flush and shared mutex for better stability and RAM consumption
const FLUSH_DELAY_MS = 3000;
const files = new Map();
export const useSingleFileAuthState = async (fileName) => {
    let shared = files.get(fileName);
    if (!shared)
        files.set(fileName, shared = { mutex: createMutex(), flush: null });
    const { mutex } = shared;
    await shared.flush?.();
    const tempFile = fileName + '.temp';
    const store = Object.create(null);
    let ver = 0, saved = 0, timer = null;
    await mutex.runExclusive(async () => {
        try {
            Object.assign(store, JSON.parse(await readFile(fileName, 'utf-8'), BufferJSON.reviver));
        }
        catch (err) {
            if (err.code === 'EISDIR')
                throw new Error(`found something that is not a file at ${fileName}, either delete it or specify a different location`);
            if (err.code !== 'ENOENT')
                await rename(fileName, fileName + '.corrupt').catch(() => { });
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
                const fh = await open(tempFile, 'w');
                try {
                    const json = serializeAuthValue(store);
                    if (typeof json !== 'string')
                        throw new Error('auth store is not serializable');
                    await fh.writeFile(json);
                    await fh.datasync();
                }
                finally {
                    await fh.close();
                }
                await rename(tempFile, fileName);
                saved = v;
            }
            catch {
                schedule();
            }
        });
    };
    const schedule = () => {
        timer ?? (timer = setTimeout(flush, FLUSH_DELAY_MS));
    };
    shared.flush = flush;
    const creds = store.creds ?? (store.creds = initAuthCreds());
    return {
        state: {
            creds,
            keys: {
                get: (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        const value = store[type + id];
                        data[id] = value && type === 'app-state-sync-key'
                            ? proto.Message.AppStateSyncKeyData.fromObject(value)
                            : value;
                    }
                    return data;
                },
                set: (data) => {
                    for (const type in data) {
                        const items = data[type];
                        for (const id in items) {
                            const value = items[id];
                            if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
                                // nothing persistable — keep existing state intact (same policy as useMultiFileAuthState)
                                console.warn('[baileys:auth-state] skipping unpersistable value:', { type, id: String(id), valueType: typeof value });
                                continue;
                            }
                            if (value)
                                // normalize protobuf instances now so the debounced flush cannot
                                // serialize them through toJSON() (which converts bytes to plain strings)
                                store[type + id] = typeof value.constructor?.toObject === 'function' && typeof value.toJSON === 'function' && value.constructor !== Object
                                    ? value.constructor.toObject(value)
                                    : value;
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
