/**
 * `createZip` — builds an in-memory ZIP archive (the sticker-pack upload path
 * uses this to bundle tray icons and stickers into one media file):
 *
 *   const zip = await createZip([
 *     { name: 'sticker-1.webp', data: webpBuffer },
 *     { name: 'sticker-2.webp', data: webpBuffer },
 *     { name: 'tray.webp',      data: trayBuffer }
 *   ]); // -> Buffer
 *
 * Entries whose `data` is an async iterable/stream are awaited; nested names
 * ('dir/file') are preserved. Small or incompressible payloads are STORED,
 * everything else is DEFLATE'd — the output is readable by unzip/7zip and by
 * WhatsApp's media pipeline.
 */
import { deflateRawSync } from 'node:zlib';
import { crc32 } from './crc32.js';

const SIG_LOCAL = 0x04034b50; // PK\x03\x04
const SIG_CENTRAL = 0x02014b50; // PK\x01\x02
const SIG_EOCD = 0x06054b50; // PK\x05\x06
const FLAG_UTF8 = 0x0800;

function dosDateTime(date) {
    const d = date instanceof Date && !isNaN(date) ? date : new Date();
    const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((Math.floor(d.getSeconds() / 2)) & 0x1f);
    const day = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0x0f) << 5) | (d.getDate() & 0x1f);
    return { time, day };
}

/** Normalizes an entry into { name, data: Buffer, date }. */
async function normalizeEntry(entry) {
    if (entry === null || entry === undefined) return null;
    let { name, data } = entry;
    if (typeof name !== 'string' || name.length === 0) {
        throw new TypeError('createZip: every entry needs a non-empty "name"');
    }
    let date = entry.date instanceof Date ? entry.date : undefined;
    if (data && typeof data.pipe === 'function') {
        // Node stream
        const chunks = [];
        for await (const chunk of data) chunks.push(chunk);
        data = Buffer.concat(chunks.map(c => Buffer.isBuffer(c) ? c : Buffer.from(c)));
    }
    else if (data && typeof data[Symbol.asyncIterator] === 'function') {
        const chunks = [];
        for await (const chunk of data) chunks.push(chunk);
        data = Buffer.concat(chunks.map(c => Buffer.isBuffer(c) ? c : Buffer.from(c)));
    }
    if (data === undefined || data === null) return null;
    if (typeof data === 'string') data = Buffer.from(data, 'utf8');
    else if (ArrayBuffer.isView(data)) data = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    else if (data instanceof ArrayBuffer) data = Buffer.from(data);
    else if (!Buffer.isBuffer(data)) throw new TypeError(`createZip: entry "${name}" data must be Buffer/Uint8Array/string/stream`);
    return { name, data, date };
}

export async function createZip(entries) {
    if (entries === null || entries === undefined) {
        throw new TypeError('createZip: expected an array of { name, data } entries');
    }
    const list = [];
    if (Array.isArray(entries) || typeof entries[Symbol.iterator] === 'function') {
        for (const entry of entries) {
            const normalized = await normalizeEntry(entry);
            if (normalized) list.push(normalized);
        }
    }
    else if (typeof entries === 'object') {
        // Object form: { 'name.webp': data, ... }
        for (const [name, data] of Object.entries(entries)) {
            const normalized = await normalizeEntry({ name, data });
            if (normalized) list.push(normalized);
        }
    }
    else {
        throw new TypeError('createZip: expected an array of { name, data } entries');
    }

    const now = dosDateTime(new Date());
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const entry of list) {
        const nameBuf = Buffer.from(entry.name, 'utf8');
        const raw = entry.data;
        const crc = crc32(raw);

        let method = 0;
        let payload = raw;
        if (raw.length > 32) {
            const deflated = deflateRawSync(raw, { level: 6 });
            if (deflated.length < raw.length) {
                method = 8;
                payload = deflated;
            }
        }

        const { time, day } = entry.date ? dosDateTime(entry.date) : now;

        const local = Buffer.alloc(30);
        local.writeUInt32LE(SIG_LOCAL, 0);
        local.writeUInt16LE(20, 4); // version needed
        local.writeUInt16LE(FLAG_UTF8, 6);
        local.writeUInt16LE(method, 8);
        local.writeUInt16LE(time, 10);
        local.writeUInt16LE(day, 12);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(payload.length, 18);
        local.writeUInt32LE(raw.length, 22);
        local.writeUInt16LE(nameBuf.length, 26);
        local.writeUInt16LE(0, 28); // extra length

        const central = Buffer.alloc(46);
        central.writeUInt32LE(SIG_CENTRAL, 0);
        central.writeUInt16LE(0x031e, 4); // made by: unix, zip 3.0
        central.writeUInt16LE(20, 6); // version needed
        central.writeUInt16LE(FLAG_UTF8, 8);
        central.writeUInt16LE(method, 10);
        central.writeUInt16LE(time, 12);
        central.writeUInt16LE(day, 14);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(payload.length, 20);
        central.writeUInt32LE(raw.length, 24);
        central.writeUInt16LE(nameBuf.length, 28);
        central.writeUInt32LE(0o600 << 16, 38); // external attrs: rw permissions
        central.writeUInt32LE(offset, 42);

        localParts.push(local, nameBuf, payload);
        centralParts.push(central, nameBuf);
        offset += local.length + nameBuf.length + payload.length;
    }

    const centralDir = Buffer.concat(centralParts);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(SIG_EOCD, 0);
    eocd.writeUInt16LE(list.length, 8);
    eocd.writeUInt16LE(list.length, 10);
    eocd.writeUInt32LE(centralDir.length, 12);
    eocd.writeUInt32LE(offset, 16);

    return Buffer.concat([...localParts, centralDir, eocd]);
}
