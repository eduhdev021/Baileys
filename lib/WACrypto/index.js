/**
 * @eduh_dev021/baileys — internal WhatsApp crypto module.
 *
 * Pure-TypeScript replacements (derived from zapo-js v1.12.0, MIT —
 * https://github.com/vinikjkkj/zapo) for every function the library used to
 * import from the `whatsapp-rust-bridge` WASM dependency. All signatures and
 * output shapes are byte-compatible with the WASM bridge.
 * SPDX-License-Identifier: MIT
 */
export { md5, hkdf } from './hkdf.js';
export {
    generateKeyPair,
    getPublicFromPrivateKey,
    calculateAgreement,
    clampCurvePrivateKeyInPlace,
    montgomeryToEdwardsPublic
} from './x25519.js';
export { calculateSignature, verifySignature } from './xeddsa.js';
export { LTHashAntiTampering } from './lthash.js';
export { expandAppStateKeys } from './appstate-keys.js';
