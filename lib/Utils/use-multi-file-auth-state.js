import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { proto } from '../../WAProto/index.js';
import { createMutex } from '../Addon/index.js';
import { initAuthCreds } from './auth-utils.js';
import { BufferJSON, serializeAuthValue } from './generics.js';
// Refactored useMultiFileAuthState with atomic writes and per-file mutex for better stability and RAM consumption
const WRITE_BATCH = 32;
const locks = new Map();
const noop = () => { };
/**
 * Report a value that cannot be persisted. Skipping it (instead of throwing) keeps the
 * whole commit alive: a single bad entry must never abort message sends or crash the
 * socket with ERR_INVALID_ARG_TYPE. The log includes the write origin so the culprit
 * writer can be identified from the user's logs.
 */
const warnedUnpersistable = new Set();
const warnUnpersistable = (logger, category, id, value, path, reason) => {
    // warn once per category/id/reason — a repeated value would otherwise spam
    // the user's console on every send
    const dedupeKey = `${category}|${id}|${reason}`;
    if (warnedUnpersistable.size > 500)
        warnedUnpersistable.clear();
    if (warnedUnpersistable.has(dedupeKey))
        return;
    warnedUnpersistable.add(dedupeKey);
    let origin = '';
    try {
        origin = new Error().stack
            ?.split('\n')
            .slice(4, 8)
            .map((l) => l.trim())
            .join(' <- ') || '';
    }
    catch { }
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
            logger.warn(info, 'skipping unpersistable auth-state value');
        }
        else {
            console.warn('[baileys:auth-state] skipping unpersistable value:', info);
        }
    }
    catch { }
};
const withLock = async (path, fn) => {
    let entry = locks.get(path);
    if (!entry)
        locks.set(path, entry = { mutex: createMutex(), refs: 0 });
    entry.refs++;
    try {
        return await entry.mutex.runExclusive(fn);
    }
    finally {
        if (!--entry.refs)
            locks.delete(path);
    }
};
const writeAtomic = async (path, json, durable) => {
    // last-resort guard: a non-string can never reach fs.writeFile here, otherwise it
    // would throw ERR_INVALID_ARG_TYPE and kill the surrounding send/receive flow
    if (typeof json !== 'string')
        return;
    const tmp = path + '.tmp';
    const fh = await open(tmp, 'w');
    try {
        await fh.writeFile(json);
        if (durable)
            await fh.datasync();
    }
    finally {
        await fh.close();
    }
    await rename(tmp, path);
};
const readJson = (path, quarantine) => withLock(path, async () => {
    let raw;
    try {
        raw = await readFile(path, 'utf-8');
    }
    catch (err) {
        if (err.code === 'ENOENT')
            return null;
        throw err;
    }
    try {
        return JSON.parse(raw, BufferJSON.reviver);
    }
    catch {
        if (quarantine)
            await rename(path, path + '.corrupt').catch(noop);
        return null;
    }
});
const fixFileName = (file) => file.replace(/\//g, '__').replace(/:/g, '-');
export const useMultiFileAuthState = async (folder, logger) => {
    try {
        await mkdir(folder, { recursive: true });
    }
    catch (err) {
        if (err.code === 'EEXIST' || err.code === 'ENOTDIR')
            throw new Error(`Found something that is not a directory at ${folder}, either delete it or specify a different location`);
        throw err;
    }
    const pathOf = (file) => join(folder, fixFileName(file));
    const credsPath = pathOf('creds.json');
    const creds = await readJson(credsPath, true) ?? initAuthCreds();
    let lastCreds;
    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(ids.map(async (id) => {
                        let value = await readJson(pathOf(`${type}-${id}.json`));
                        if (type === 'app-state-sync-key' && value) {
                            value = proto.Message.AppStateSyncKeyData.fromObject(value);
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
                            // a function/symbol is truthy but can never be serialized (JSON.stringify
                            // returns undefined for it) — it used to crash the whole commit with
                            // ERR_INVALID_ARG_TYPE. Skip it and warn; deleting the file would
                            // silently destroy valid state.
                            if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
                                warnUnpersistable(logger, category, id, value, path, value === undefined ? 'value is undefined' : 'value is a function/symbol');
                                continue;
                            }
                            tasks.push(value
                                ? () => withLock(path, () => writeAtomic(path, serializeAuthValue(value, (reason) => warnUnpersistable(logger, category, id, value, path, reason)), false))
                                : () => withLock(path, () => unlink(path).catch((err) => {
                                    if (err.code !== 'ENOENT')
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
            const json = serializeAuthValue(creds, (reason) => warnUnpersistable(logger, 'creds', 'creds', creds, credsPath, reason));
            if (json === undefined || json === lastCreds)
                return Promise.resolve();
            return withLock(credsPath, async () => {
                await writeAtomic(credsPath, json, true);
                lastCreds = json;
            });
        }
    };
};
