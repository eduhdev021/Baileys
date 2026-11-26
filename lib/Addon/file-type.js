/**
 * `detectFileType` — inspects the magic bytes of a buffer or file and returns
 * a `{ mime, ext }` pair (or `{}` when nothing matches):
 *
 *   await detectFileType('/tmp/audio.ogg');   // -> { mime: 'application/ogg', ext: 'ogx' }
 *   await detectFileType(pngBuffer);          // -> { mime: 'image/png',       ext: 'png' }
 *
 * Detection is fully self-contained (built-in signature table). When the
 * optional peer packages `magic-bytes.js` or `file-type` are installed they
 * are preferred, in that order, exactly as this library documents.
 */
import { readFile } from 'node:fs/promises';

/** Built-in signature table. Order matters: most specific first. */
const SIGNATURES = [
    // Images
    { sig: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], mime: 'image/png', ext: 'png' },
    { sig: [0xFF, 0xD8, 0xFF], mime: 'image/jpeg', ext: 'jpg' },
    { sig: 'GIF87a', mime: 'image/gif', ext: 'gif' },
    { sig: 'GIF89a', mime: 'image/gif', ext: 'gif' },
    { sig: 'BM', mime: 'image/bmp', ext: 'bmp' },
    { sig: [0x00, 0x00, 0x01, 0x00], mime: 'image/x-icon', ext: 'ico' },
    // RIFF containers (WEBP/WAV/AVI) — checked together below via container() handlers
    { container: 'riff' },
    // ISO BMFF containers (mp4/mov/3gp/m4a) — handled via brand table
    { container: 'ftyp' },
    // Matroska
    { sig: [0x1A, 0x45, 0xDF, 0xA3], container: 'ebml' },
    // Ogg
    { sig: 'OggS', mime: 'application/ogg', ext: 'ogx' },
    // Audio
    { sig: 'ID3', mime: 'audio/mpeg', ext: 'mp3' },
    { sig: 'fLaC', mime: 'audio/flac', ext: 'flac' },
    { sig: '#!AMR', mime: 'audio/amr', ext: 'amr' },
    { sig: 'FORM', container: 'iff' },
    // Documents / archives
    { sig: '%PDF', mime: 'application/pdf', ext: 'pdf' },
    { sig: 'PK\x03\x04', mime: 'application/zip', ext: 'zip' },
    { sig: 'PK\x05\x06', mime: 'application/zip', ext: 'zip' },
    { sig: 'PK\x07\x08', mime: 'application/zip', ext: 'zip' },
    { sig: [0x1F, 0x8B], mime: 'application/gzip', ext: 'gz' },
    { sig: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C], mime: 'application/x-7z-compressed', ext: '7z' },
    { sig: 'Rar!\x1A\x07', mime: 'application/x-rar-compressed', ext: 'rar' },
    { sig: [0xFD, 0x37, 0x7A, 0x58, 0x5A, 0x00], mime: 'application/x-xz', ext: 'xz' },
    { sig: 'BZh', mime: 'application/x-bzip2', ext: 'bz2' },
    { sig: [0x25, 0x21, 0x50, 0x53], mime: 'application/postscript', ext: 'ps' },
    { sig: '\x7FELF', mime: 'application/x-executable', ext: 'bin' },
    { sig: [0xCA, 0xFE, 0xBA, 0xBE], mime: 'application/x-java-applet', ext: 'class' },
    { sig: 'wOFF', mime: 'font/woff', ext: 'woff' },
    { sig: 'wOF2', mime: 'font/woff2', ext: 'woff2' },
    { sig: [0x00, 0x01, 0x00, 0x00], mime: 'font/ttf', ext: 'ttf' },
    { sig: 'OTTO', mime: 'font/otf', ext: 'otf' }
];

function matchesSig(header, sig) {
    if (typeof sig === 'string') sig = [...Buffer.from(sig, 'latin1')];
    if (header.length < sig.length) return false;
    return sig.every((byte, i) => header[i] === byte);
}

/** Reads an ISO BMFF `ftyp` brand at offset 4 and maps it to a type. */
function fromFtypBrand(header) {
    if (header.length < 12) return null;
    const brand = header.subarray(8, 12).toString('latin1');
    const major = brand;
    if (/^qt/.test(major)) return { mime: 'video/quicktime', ext: 'mov' };
    if (/^3g?p?/.test(major)) return { mime: 'video/3gpp', ext: '3gp' };
    if (/^M4A/.test(major)) return { mime: 'audio/mp4', ext: 'm4a' };
    if (/^M4V/.test(major)) return { mime: 'video/x-m4v', ext: 'm4v' };
    return { mime: 'video/mp4', ext: 'mp4' };
}

/** RIFF container dispatch: WEBP / WAVE / AVI / ACON. */
function fromRiff(header) {
    if (header.length < 12) return null;
    const type = header.subarray(8, 12).toString('latin1');
    switch (type) {
        case 'WEBP': return { mime: 'image/webp', ext: 'webp' };
        case 'WAVE': return { mime: 'audio/wav', ext: 'wav' };
        case 'AVI ': return { mime: 'video/x-msvideo', ext: 'avi' };
        default: return null;
    }
}

/** Matroska dispatch by DocType string in the first bytes. */
function fromEbml(header) {
    const head = header.toString('latin1');
    if (head.includes('webm')) return { mime: 'video/webm', ext: 'webm' };
    if (head.includes('matroska')) return { mime: 'video/x-matroska', ext: 'mkv' };
    return { mime: 'video/x-matroska', ext: 'mkv' };
}

/** MPEG audio frame sync (0xFF Ex/Fx/Fy/Fz). */
function fromMpegSync(header) {
    if (header.length < 2) return null;
    if (header[0] === 0xFF && (header[1] & 0xE0) === 0xE0) {
        // Layer info: 0xFF Fx -> mp3 layer III, treat any valid sync as mpeg audio
        return { mime: 'audio/mpeg', ext: 'mp3' };
    }
    return null;
}

function builtinDetect(header) {
    for (const def of SIGNATURES) {
        if (def.container === 'riff' && matchesSig(header, 'RIFF')) return fromRiff(header);
        if (def.container === 'ftyp' && header.length >= 8 && header.subarray(4, 8).toString('latin1') === 'ftyp') return fromFtypBrand(header);
        if (def.container === 'ebml' && matchesSig(header, def.sig)) return fromEbml(header);
        if (def.container === 'iff' && matchesSig(header, 'FORM')) {
            const type = header.subarray(8, 12).toString('latin1');
            if (type === 'AIFF') return { mime: 'audio/aiff', ext: 'aiff' };
            return null;
        }
        if (def.sig && matchesSig(header, def.sig)) {
            return { mime: def.mime, ext: def.ext };
        }
    }
    return fromMpegSync(header);
}

async function loadOptionalDetector() {
    // Preferred: magic-bytes.js -> file-type, per the documented priority.
    try {
        const magic = await import('magic-bytes.js');
        if (typeof magic.filetypemime === 'function') {
            return async (buffer) => {
                const mime = magic.filetypemime(buffer);
                return mime ? { mime, ext: extFromMime(mime) } : null;
            };
        }
    }
    catch { /* optional peer not installed — fall through */ }
    try {
        const fileType = await import('file-type');
        const fn = fileType.fileTypeFromBuffer || fileType.default?.fileTypeFromBuffer || fileType.default;
        if (typeof fn === 'function') {
            return async (buffer) => {
                const result = await fn(buffer);
                return result ? { mime: result.mime, ext: result.ext } : null;
            };
        }
    }
    catch { /* optional peer not installed — fall through */ }
    return null;
}

function extFromMime(mime) {
    const map = {
        'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp',
        'image/bmp': 'bmp', 'image/tiff': 'tif', 'video/mp4': 'mp4', 'video/webm': 'webm',
        'video/quicktime': 'mov', 'video/x-msvideo': 'avi', 'video/x-matroska': 'mkv',
        'video/3gpp': '3gp', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg',
        'application/ogg': 'ogx', 'audio/flac': 'flac', 'audio/amr': 'amr', 'audio/mp4': 'm4a',
        'audio/aiff': 'aiff', 'application/pdf': 'pdf', 'application/zip': 'zip',
        'application/gzip': 'gz', 'application/x-7z-compressed': '7z',
        'application/x-rar-compressed': 'rar', 'application/x-bzip2': 'bz2',
        'application/x-xz': 'xz'
    };
    return map[mime] || (mime.split('/')[1] || 'bin').split(';')[0];
}

let optionalDetector; // lazily resolved per process

/**
 * Detects the file type of a Buffer/Uint8Array or a path to a file on disk.
 * Resolves to `{ mime, ext }`, or `{}` when the type cannot be determined.
 */
export async function detectFileType(input) {
    let buffer;
    if (typeof input === 'string') {
        buffer = await readFile(input);
    }
    else if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
        buffer = input;
    }
    else if (input && typeof input.pipe === 'function') {
        const chunks = [];
        for await (const chunk of input) chunks.push(chunk);
        buffer = Buffer.concat(chunks);
    }
    else {
        throw new TypeError('detectFileType: expects a Buffer, Uint8Array or a file path');
    }

    const header = buffer.subarray(0, Math.min(buffer.length, 128));
    if (header.length === 0) return {};

    optionalDetector ||= await loadOptionalDetector();
    if (optionalDetector) {
        try {
            const result = await optionalDetector(buffer);
            if (result) return result;
        }
        catch { /* fall through to the built-in table */ }
    }

    const detected = builtinDetect(header);
    return detected ? { ...detected } : {};
}
