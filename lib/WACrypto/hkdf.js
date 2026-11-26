/**
 * Pure-TypeScript replacements for the `whatsapp-rust-bridge` WASM functions
 * used by @eduh_dev021/baileys (HKDF, MD5, LTHash, app-state key expansion).
 *
 * The LTHash arithmetic and key-expansion constants are derived from
 * zapo-js v1.12.0 (https://github.com/vinikjkkj/zapo) by vinikjkkj — MIT License.
 * SPDX-License-Identifier: MIT
 */
import { createHash, hkdfSync } from 'node:crypto';

/** Standard MD5 digest (byte-compatible with the WASM bridge `md5`). */
export function md5(buffer) {
    return createHash('md5').update(buffer).digest();
}

/**
 * HKDF-SHA256, byte-compatible with the WASM bridge `hkdf(buffer, expandedLength, info)`:
 * - `info` may be `{ salt?: Uint8Array, info?: string }` (fork signature) or a plain
 *   `string` (classic Baileys signature) for extra compatibility;
 * - missing salt defaults to 32 zero bytes; missing info defaults to an empty string.
 */
export function hkdf(buffer, expandedLength, info = {}) {
    const options = typeof info === 'string' ? { info } : (info ?? {});
    const salt = options.salt ?? Buffer.alloc(32);
    const context = Buffer.from(options.info ?? '', 'utf8');
    return Buffer.from(hkdfSync('sha256', buffer, salt, context, expandedLength));
}
