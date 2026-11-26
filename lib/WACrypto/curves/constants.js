/**
 * Vendored from zapo-js v1.12.0 (https://github.com/vinikjkkj/zapo)
 * Copyright (c) vinikjkkj — MIT License <https://github.com/vinikjkkj/zapo/blob/main/LICENSE>
 * Modified for use inside @eduh_dev021/baileys (ESM import paths only).
 * SPDX-License-Identifier: MIT
 */

import { hexToBytes } from '../util/bytes.js';
export const X25519_PKCS8_PREFIX = hexToBytes('302e020100300506032b656e04220420');
export const X25519_SPKI_PREFIX = hexToBytes('302a300506032b656e032100');
export const ED25519_PKCS8_PREFIX = hexToBytes('302e020100300506032b657004220420');
export const ED25519_SPKI_PREFIX = hexToBytes('302a300506032b6570032100');
