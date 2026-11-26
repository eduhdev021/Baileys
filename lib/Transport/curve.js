/**
 * Curve25519/XEdDSA primitives. Backed by the internal pure-TypeScript
 * WACrypto module (Node.js native crypto) — the `whatsapp-rust-bridge`
 * WASM dependency was removed in @eduh_dev021/baileys 1.0.0.
 */
import { generateKeyPair as waGenerateKeyPair, calculateAgreement as waCalculateAgreement, calculateSignature as waCalculateSignature, verifySignature as waVerifySignature, getPublicFromPrivateKey as waGetPublicFromPrivateKey } from '../WACrypto/index.js';
function validatePrivKey(privKey) {
    if (privKey === undefined) {
        throw new Error('Undefined private key');
    }
    if (!Buffer.isBuffer(privKey)) {
        throw new Error(`Invalid private key type: ${privKey?.constructor?.name ?? typeof privKey}`);
    }
    if (privKey.byteLength != 32) {
        throw new Error(`Incorrect private key length: ${privKey.byteLength}`);
    }
}
function scrubPubKeyFormat(pubKey) {
    if (!Buffer.isBuffer(pubKey)) {
        throw new Error(`Invalid public key type: ${pubKey?.constructor?.name ?? typeof pubKey}`);
    }
    if ((pubKey.byteLength !== 33 || pubKey[0] !== 5) && pubKey.byteLength !== 32) {
        throw new Error('Invalid public key');
    }
    if (pubKey.byteLength == 33) {
        return pubKey.slice(1);
    }
    else {
        console.error('WARNING: Expected pubkey of length 33, please report the ST and client that generated the pubkey');
        return pubKey;
    }
}
export function getPublicFromPrivateKey(privKey) {
    return Buffer.from(waGetPublicFromPrivateKey(privKey));
}
export function generateKeyPair() {
    const kp = waGenerateKeyPair();
    return {
        pubKey: Buffer.from(kp.pubKey),
        privKey: Buffer.from(kp.privKey)
    };
}
export function calculateAgreement(pubKey, privKey) {
    pubKey = scrubPubKeyFormat(pubKey);
    validatePrivKey(privKey);
    return Buffer.from(waCalculateAgreement(pubKey, privKey));
}
export function calculateSignature(privKey, message) {
    validatePrivKey(privKey);
    if (!message) {
        throw new Error('Invalid message');
    }
    return Buffer.from(waCalculateSignature(privKey, message));
}
export function verifySignature(pubKey, msg, sig, isInit) {
    if (isInit)
        return true;
    pubKey = scrubPubKeyFormat(pubKey);
    if (!msg) {
        throw new Error('Invalid message');
    }
    if (!sig || sig.byteLength != 64) {
        throw new Error('Invalid signature');
    }
    return waVerifySignature(pubKey, msg, sig);
}
