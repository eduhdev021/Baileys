/**
 * LT-Hash (anti-tampering) — summation based hash that maintains the integrity
 * of a collection over a series of mutations. Ported to synchronous pure
 * TypeScript from zapo-js v1.12.0 (https://github.com/vinikjkkj/zapo) by
 * vinikjkkj — MIT License (WaAppStateCrypto LT-hash arithmetic).
 * SPDX-License-Identifier: MIT
 */
import { hkdf } from './hkdf.js';

const LT_HASH_SIZE = 128;
const POINT_SIZE = 2;
/** HKDF info used by WhatsApp for the patch-integrity (LT-hash) expansion. */
const PATCH_INTEGRITY_INFO = 'WhatsApp Patch Integrity';

function expandValue(value) {
    return hkdf(value, LT_HASH_SIZE, { info: PATCH_INTEGRITY_INFO });
}

/**
 * Point-wise 16-bit little-endian combination of `left` with `right`.
 * Keeps the exact overflow semantics of zapo-js `pointwiseWithOverflow`.
 */
function pointwise(left, right, combine, out) {
    if (left.byteLength !== right.byteLength) {
        throw new Error('lt hash input length mismatch');
    }
    if (left.byteLength % POINT_SIZE !== 0) {
        throw new Error('lt hash input alignment mismatch');
    }
    for (let offset = 0; offset < left.byteLength; offset += POINT_SIZE) {
        const value = combine(left[offset] | (left[offset + 1] << 8), right[offset] | (right[offset + 1] << 8));
        out[offset] = value & 0xff;
        out[offset + 1] = (value >>> 8) & 0xff;
    }
    return out;
}

/**
 * Drop-in synchronous replacement for the WASM bridge `LTHashAntiTampering`
 * class, with the exact call signature used by this library's internals:
 * `subtractThenAdd(hash, subBuffs, addBuffs)`.
 */
export class LTHashAntiTampering {
    subtractThenAdd(hash, subBuffs, addBuffs) {
        const out = Buffer.from(hash);
        for (const value of subBuffs ?? []) {
            pointwise(out, expandValue(value), (l, r) => l - r, out);
        }
        for (const value of addBuffs ?? []) {
            pointwise(out, expandValue(value), (l, r) => l + r, out);
        }
        return out;
    }
}
