/**
 * Pure-TypeScript X25519 (curve25519) operations backed by Node.js native crypto.
 *
 * Replaces the `whatsapp-rust-bridge` WASM dependency of the original fork.
 * Function signatures and output shapes are kept byte-compatible with the
 * WASM bridge so no other code changes are needed.
 *
 * Key-derivation logic (Edwards encoding of the public key) is derived from
 * zapo-js v1.12.0 (https://github.com/vinikjkkj/zapo) by vinikjkkj — MIT License.
 * SPDX-License-Identifier: MIT
 */
import {
    createPrivateKey,
    createPublicKey,
    diffieHellman,
    generateKeyPairSync
} from 'node:crypto';
import { fe, feAdd, feFromBytes, feInv, feMul, fePack, feSub } from './math/fe.js';
import { FE_ONE } from './math/constants.js';
import { encodeExtendedPoint, scalarMultBase } from './math/edwards.js';
import { bytesToBigIntLE } from './math/le.js';
import { assertByteLength, concatBytes } from './util/bytes.js';

const X25519_PKCS8_PREFIX = Uint8Array.from([
    0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x6e, 0x04, 0x22, 0x04, 0x20
]);
const X25519_SPKI_PREFIX = Uint8Array.from([
    0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x6e, 0x03, 0x21, 0x00
]);

const VERSION_BYTE = 0x05;

/** Applies the standard curve25519 scalar clamping in place. Ported from zapo-js. */
export function clampCurvePrivateKeyInPlace(privateKey) {
    assertByteLength(privateKey, 32, `invalid curve25519 private key length ${privateKey.length}`);
    privateKey[0] &= 248;
    privateKey[31] &= 127;
    privateKey[31] |= 64;
    return privateKey;
}

// p-1 = 2^255-20 in LE bytes: 0xEC, 0xFF×30, 0x7F
// Mask bit 255 before comparing (non-canonical inputs may have it set)
function isFieldPMinus1(b) {
    if (b[0] !== 0xec || (b[31] & 0x7f) !== 0x7f)
        return false;
    for (let i = 1; i < 31; i++)
        if (b[i] !== 0xff)
            return false;
    return true;
}

// Pre-allocated temps for montgomeryToEdwardsPublic (safe: single-threaded)
const _mx = fe();
const _m1 = fe();
const _m2 = fe();
const _m3 = fe();

/**
 * Converts a 32-byte Montgomery (curve25519) public key to its Edwards form
 * for XEdDSA verification, applying the supplied `signBit` (`0x80` mask).
 * Ported from zapo-js (crypto/curves/X25519.js).
 */
export function montgomeryToEdwardsPublic(curvePublicKey, signBit) {
    assertByteLength(curvePublicKey, 32, `invalid curve25519 public key length ${curvePublicKey.length}`);
    if (isFieldPMinus1(curvePublicKey)) {
        throw new Error('invalid curve25519 low-order public key');
    }
    feFromBytes(_mx, curvePublicKey);
    feSub(_m1, _mx, FE_ONE);
    feAdd(_m2, _mx, FE_ONE);
    feInv(_m3, _m2);
    feMul(_m1, _m1, _m3);
    const encoded = new Uint8Array(32);
    fePack(encoded, _m1);
    encoded[31] = (encoded[31] & 0x7f) | (signBit & 0x80);
    return encoded;
}

/** Derives the clamped private scalar and its Edwards-encoded public key. */
export function deriveEdwardsKeyMaterial(privateKey) {
    const clamped = Uint8Array.from(privateKey);
    clampCurvePrivateKeyInPlace(clamped);
    const privateScalar = bytesToBigIntLE(clamped);
    const encodedPublic = encodeExtendedPoint(scalarMultBase(privateScalar));
    return { clamped, privateScalar, encodedPublic };
}

function privateToKeyObject(privKey) {
    return createPrivateKey({
        key: concatBytes([X25519_PKCS8_PREFIX, privKey]),
        format: 'der',
        type: 'pkcs8'
    });
}

function publicToKeyObject(pubKey) {
    return createPublicKey({
        key: concatBytes([X25519_SPKI_PREFIX, pubKey]),
        format: 'der',
        type: 'spki'
    });
}

/** Accepts raw 32-byte public keys and Signal version-prefixed (0x05) 33-byte keys. */
function normalizePublicKey(pubKey) {
    if (pubKey.byteLength === 33 && pubKey[0] === VERSION_BYTE) {
        return pubKey.subarray(1);
    }
    assertByteLength(pubKey, 32, `invalid curve25519 public key length ${pubKey.byteLength}`);
    return pubKey;
}

/**
 * Generates a fresh X25519 key pair.
 * `pubKey` is 33 bytes: `[0x05, ...32-byte public]` (Signal version byte),
 * `privKey` is the clamped 32-byte scalar — identical to the WASM bridge output.
 */
export function generateKeyPair() {
    const { publicKey, privateKey } = generateKeyPairSync('x25519');
    const rawPub = publicKey.export({ format: 'der', type: 'spki' }).subarray(X25519_SPKI_PREFIX.length);
    const rawPriv = privateKey.export({ format: 'der', type: 'pkcs8' }).subarray(X25519_PKCS8_PREFIX.length);
    clampCurvePrivateKeyInPlace(rawPriv);
    return {
        pubKey: concatBytes([Uint8Array.of(VERSION_BYTE), rawPub]),
        privKey: rawPriv
    };
}

/**
 * Derives the 33-byte public key (`[0x05, ...]`) from a 32-byte private key,
 * using the Edwards (XEdDSA) encoding — byte-compatible with the WASM bridge.
 */
export function getPublicFromPrivateKey(privKey) {
    const { encodedPublic } = deriveEdwardsKeyMaterial(privKey);
    return concatBytes([Uint8Array.of(VERSION_BYTE), encodedPublic]);
}

/** Standard X25519 Diffie-Hellman between a 32/33-byte public and 32-byte private key. */
export function calculateAgreement(pubKey, privKey) {
    assertByteLength(privKey, 32, `invalid curve25519 private key length ${privKey.byteLength}`);
    const priv = privateToKeyObject(privKey);
    const pub = publicToKeyObject(normalizePublicKey(pubKey));
    return diffieHellman({ privateKey: priv, publicKey: pub });
}
