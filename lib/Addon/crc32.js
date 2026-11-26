/**
 * Shared CRC32 (IEEE 802.3, reflected, polynomial 0xEDB88320).
 * Used by the ZIP writer and the PNG encoder in this addon layer.
 */
const TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
        c = (c & 1) !== 0 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    TABLE[n] = c;
}

/** Computes the CRC-32 checksum of the given bytes, returned as an unsigned 32-bit integer. */
export function crc32(data, start = 0) {
    let c = (start ^ 0xFFFFFFFF) >>> 0;
    for (let i = 0; i < data.length; i++) {
        c = (TABLE[(c ^ data[i]) & 0xFF] ^ (c >>> 8)) >>> 0;
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
}
