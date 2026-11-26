/**
 * Vendored from zapo-js v1.12.0 (https://github.com/vinikjkkj/zapo)
 * Copyright (c) vinikjkkj — MIT License <https://github.com/vinikjkkj/zapo/blob/main/LICENSE>
 * Modified for use inside @eduh_dev021/baileys (ESM import paths only).
 * SPDX-License-Identifier: MIT
 */

import { FIELD_P, GROUP_L } from './constants.js';
export function mod(value, modulus = FIELD_P) {
    const remainder = value % modulus;
    return remainder >= 0n ? remainder : remainder + modulus;
}
export function modGroup(value) {
    return mod(value, GROUP_L);
}
