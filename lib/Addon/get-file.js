/**
 * `getFile` — normalizes any supported media source into a local file path so
 * the media pipeline can stream from disk:
 *
 *   - a Buffer / Uint8Array / ArrayBuffer  -> written to a temp file, path returned
 *   - a Readable stream                    -> piped to a temp file, path returned
 *   - an http(s) URL string                -> downloaded to a temp file, path returned
 *   - an existing local path string        -> returned unchanged (no copy)
 *
 *   const path = await getFile(await downloadMediaMessage(msg));
 *   await fs.unlink(path); // clean up when done
 *
 * Anything else (plain objects, numbers, ...) throws
 * `Invalid source type, expects URL, ArrayBuffer, or Readable`.
 * Non-2xx downloads throw `HTTP <status> <statusText>`.
 */
import { createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const INVALID_SOURCE = 'Invalid source type, expects URL, ArrayBuffer, or Readable';

function tempFilePath() {
    return path.join(tmpdir(), `BAILEYS_${process.pid}_${randomBytes(4).toString('hex')}.tmp`);
}

function toBuffer(data) {
    if (Buffer.isBuffer(data)) return data;
    if (data instanceof ArrayBuffer) return Buffer.from(data);
    if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    return null;
}

async function writeTemp(buffer) {
    const filePath = tempFilePath();
    await unlink(filePath).catch(() => { });
    const { writeFile } = await import('node:fs/promises');
    await writeFile(filePath, buffer);
    return filePath;
}

async function downloadToFile(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    const filePath = tempFilePath();
    const body = response.body;
    if (!body) throw new Error('HTTP response had no body');
    await pipeline(Readable.fromWeb(body), createWriteStream(filePath));
    return filePath;
}

async function streamToFile(stream) {
    const filePath = tempFilePath();
    await unlink(filePath).catch(() => { });
    await pipeline(stream, createWriteStream(filePath));
    return filePath;
}

function isHttpUrl(value) {
    return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

/**
 * Resolves any supported media source to a local file path. See the module
 * header for the accepted input shapes.
 */
export async function getFile(source) {
    if (source === null || source === undefined) {
        throw new TypeError(INVALID_SOURCE);
    }

    // Raw byte sources
    const buffer = toBuffer(source);
    if (buffer) return writeTemp(buffer);

    // Streams (Node Readable and web ReadableStream)
    if (typeof source.pipe === 'function') return streamToFile(source);
    if (typeof source.getReader === 'function') return streamToFile(Readable.fromWeb(source));

    // Strings: URL -> download, local path -> pass through
    if (typeof source === 'string') {
        if (isHttpUrl(source)) return downloadToFile(source.trim());
        return source;
    }

    // Blob (works on Node >= 18 via fetch's Blob / File)
    if (typeof Blob !== 'undefined' && source instanceof Blob) {
        return writeTemp(Buffer.from(await source.arrayBuffer()));
    }

    throw new TypeError(INVALID_SOURCE);
}
