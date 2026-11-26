/**
 * Synchronous XEdDSA (sign/verify) for curve25519 keys, derived from the
 * zapo-js v1.12.0 implementation (https://github.com/vinikjkkj/zapo) by
 * vinikjkkj — MIT License. Converted from async to sync and adapted to the
 * `whatsapp-rust-bridge` API surface used by @eduh_dev021/baileys.
 * SPDX-License-Identifier: MIT
 */
import { createHash, createPublicKey, randomBytes, verify as nodeVerify } from 'node:crypto';
import { encodeExtendedPoint, scalarMultBase } from './math/edwards.js';
import { bytesToBigIntLE, bigIntToBytesLE } from './math/le.js';
import { modGroup } from './math/mod.js';
import { assertByteLength, concatBytes } from './util/bytes.js';
import { deriveEdwardsKeyMaterial, montgomeryToEdwardsPublic } from './x25519.js';

const ED25519_SPKI_PREFIX = Uint8Array.from([
    0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00
]);

// 0xFE followed by 31 × 0xFF — XEdDSA nonce-derivation prefix (port of zapo-js).
const PREFIX_SIGNATURE_RANDOM = Uint8Array.from([
    0xfe, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
]);

function sha512Chunks(chunks) {
    const hash = createHash('sha512');
    for (const chunk of chunks) {
        hash.update(chunk);
    }
    return hash.digest();
}

/**
 * Signs `message` with an X25519 (Montgomery) private key using the XEdDSA
 * construction with a random nonce (matching the WASM bridge behaviour).
 * Returns a 64-byte signature.
 */
export function calculateSignature(privateKey, message) {
    assertByteLength(privateKey, 32, `invalid curve25519 private key length ${privateKey.length}`);
    const { clamped, privateScalar, encodedPublic } = deriveEdwardsKeyMaterial(privateKey);
    const pubKeySignBit = encodedPublic[31] & 0x80;
    const randomSuffix = randomBytes(64);
    const r = modGroup(bytesToBigIntLE(sha512Chunks([
        PREFIX_SIGNATURE_RANDOM,
        clamped,
        message,
        randomSuffix
    ])));
    const encodedR = encodeExtendedPoint(scalarMultBase(r));
    const h = modGroup(bytesToBigIntLE(sha512Chunks([encodedR, encodedPublic, message])));
    const s = modGroup(r + h * privateScalar);
    const encodedS = bigIntToBytesLE(s, 32);
    encodedS[31] = (encodedS[31] & 0x7f) | pubKeySignBit;
    return concatBytes([encodedR, encodedS]);
}

/**
 * Verifies an XEdDSA signature over `message` against an X25519 (Montgomery)
 * public key (32 or 33 bytes, Signal `0x05` prefix accepted). Returns a
 * boolean — never throws — matching the WASM bridge contract.
 */
export function verifySignature(publicKey, message, signature) {
    let sig = Uint8Array.from(signature);
    if (sig.byteLength !== 64) {
        return false;
    }
    if ((sig[63] & 0x60) !== 0) {
        return false;
    }
    const lastByteIndex = 63;
    const originalLastByte = sig[lastByteIndex];
    const signBit = originalLastByte & 0x80;
    sig[lastByteIndex] = originalLastByte & 0x7f;
    try {
        const pubKey = publicKey.byteLength === 33 && publicKey[0] === 0x05
            ? publicKey.subarray(1)
            : publicKey;
        const edPublic = montgomeryToEdwardsPublic(pubKey, signBit);
        const keyObject = createPublicKey({
            key: concatBytes([ED25519_SPKI_PREFIX, edPublic]),
            format: 'der',
            type: 'spki'
        });
        return nodeVerify(null, message, keyObject, sig);
    }
    catch {
        return false;
    }
    finally {
        sig[lastByteIndex] = originalLastByte;
    }
}
