/**
 * App-state mutation key expansion, derived from zapo-js v1.12.0
 * (https://github.com/vinikjkkj/zapo) by vinikjkkj — MIT License
 * (WaAppStateCrypto.deriveKeys / WA_APP_STATE_KDF_INFO.MUTATION_KEYS).
 * SPDX-License-Identifier: MIT
 */
import { hkdf } from './hkdf.js';

/** HKDF info used by WhatsApp for app-state mutation keys. */
const MUTATION_KEYS_INFO = 'WhatsApp Mutation Keys';
const DERIVED_KEY_LENGTH = 160;

/**
 * Expands an app-state sync `keydata` into the five 32-byte mutation keys.
 * Byte-compatible with the WASM bridge `expandAppStateKeys`.
 */
export function expandAppStateKeys(keydata) {
    const expanded = hkdf(keydata, DERIVED_KEY_LENGTH, { info: MUTATION_KEYS_INFO });
    return {
        indexKey: expanded.subarray(0, 32),
        valueEncryptionKey: expanded.subarray(32, 64),
        valueMacKey: expanded.subarray(64, 96),
        snapshotMacKey: expanded.subarray(96, 128),
        patchMacKey: expanded.subarray(128, 160)
    };
}
