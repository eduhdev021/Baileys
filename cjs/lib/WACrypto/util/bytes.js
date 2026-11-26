var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var bytes_exports = {};
__export(bytes_exports, {
  EMPTY_BYTES: () => EMPTY_BYTES,
  TEXT_DECODER: () => TEXT_DECODER,
  TEXT_ENCODER: () => TEXT_ENCODER,
  ZERO_BYTES: () => ZERO_BYTES,
  assertByteLength: () => assertByteLength,
  base64ToBytes: () => base64ToBytes,
  base64ToBytesChecked: () => base64ToBytesChecked,
  bytesToBase64: () => bytesToBase64,
  bytesToBase64UrlSafe: () => bytesToBase64UrlSafe,
  bytesToHex: () => bytesToHex,
  concatBytes: () => concatBytes,
  decodeBase64Url: () => decodeBase64Url,
  decodeProtoBytes: () => decodeProtoBytes,
  hexToBytes: () => hexToBytes,
  intToBytes: () => intToBytes,
  readAllBytes: () => readAllBytes,
  removeAt: () => removeAt,
  toBytesView: () => toBytesView,
  toChunkBytes: () => toChunkBytes,
  uint8Equal: () => uint8Equal,
  uint8TimingSafeEqual: () => uint8TimingSafeEqual
});
module.exports = __toCommonJS(bytes_exports);
var import_node_crypto = require("node:crypto");
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const ZERO_BYTES = new Uint8Array([0]);
const EMPTY_BYTES = Object.freeze(new Uint8Array(0));
const HEX_CHARS = "0123456789abcdef";
const HEX_TABLE = /* @__PURE__ */ (() => {
  const table = new Array(256);
  for (let i = 0; i < 256; i += 1) {
    table[i] = HEX_CHARS[i >> 4] + HEX_CHARS[i & 15];
  }
  return table;
})();
const HEX_LOOKUP = /* @__PURE__ */ (() => {
  const table = new Int8Array(128).fill(-1);
  for (let i = 48; i <= 57; i += 1)
    table[i] = i - 48;
  for (let i = 65; i <= 70; i += 1)
    table[i] = i - 65 + 10;
  for (let i = 97; i <= 102; i += 1)
    table[i] = i - 97 + 10;
  return table;
})();
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const BASE64URL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const BASE64_LOOKUP = /* @__PURE__ */ (() => {
  const table = new Uint8Array(128).fill(255);
  for (let i = 0; i < BASE64_CHARS.length; i += 1) {
    table[BASE64_CHARS.charCodeAt(i)] = i;
  }
  table[61] = 0;
  return table;
})();
function bytesToHex(value) {
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    out += HEX_TABLE[value[i]];
  }
  return out;
}
function hexToBytes(value) {
  const len = value.length;
  if (len & 1) {
    throw new Error("hex string must have even length");
  }
  const out = new Uint8Array(len >> 1);
  for (let i = 0; i < len; i += 2) {
    const hiCode = value.charCodeAt(i);
    const loCode = value.charCodeAt(i + 1);
    const hi = hiCode < 128 ? HEX_LOOKUP[hiCode] : -1;
    const lo = loCode < 128 ? HEX_LOOKUP[loCode] : -1;
    if ((hi | lo) < 0) {
      throw new Error("invalid hex character");
    }
    out[i >> 1] = hi << 4 | lo;
  }
  return out;
}
function bytesToBase64(value) {
  return encodeBase64(value, BASE64_CHARS, true);
}
function base64ToBytes(value) {
  const len = value.length;
  if (len === 0)
    return EMPTY_BYTES;
  if ((len & 3) !== 0) {
    throw new Error("base64 string length must be multiple of 4");
  }
  let padding = 0;
  if (value.charCodeAt(len - 1) === 61)
    padding += 1;
  if (value.charCodeAt(len - 2) === 61)
    padding += 1;
  const outLen = (len * 3 >> 2) - padding;
  const out = new Uint8Array(outLen);
  let j = 0;
  const mainLen = len - 4;
  let i = 0;
  for (; i < mainLen; i += 4) {
    const a2 = lookupBase64(value.charCodeAt(i));
    const b2 = lookupBase64(value.charCodeAt(i + 1));
    const c = lookupBase64(value.charCodeAt(i + 2));
    const d = lookupBase64(value.charCodeAt(i + 3));
    out[j++] = a2 << 2 | b2 >> 4;
    out[j++] = (b2 & 15) << 4 | c >> 2;
    out[j++] = (c & 3) << 6 | d;
  }
  const a = lookupBase64(value.charCodeAt(i));
  const b = lookupBase64(value.charCodeAt(i + 1));
  out[j++] = a << 2 | b >> 4;
  if (j < outLen) {
    const c = lookupBase64(value.charCodeAt(i + 2));
    out[j++] = (b & 15) << 4 | c >> 2;
    if (j < outLen) {
      const d = lookupBase64(value.charCodeAt(i + 3));
      out[j++] = (c & 3) << 6 | d;
    }
  }
  return out;
}
function base64ToBytesChecked(value, field) {
  if (value.length === 0) {
    throw new Error(`invalid base64 payload for ${field}`);
  }
  return base64ToBytes(value);
}
function decodeBase64Url(value, field) {
  if (!value) {
    throw new Error(`missing ${field}`);
  }
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return base64ToBytesChecked(padded, field);
}
function assertByteLength(value, expectedLength, errorMessage) {
  if (value.length !== expectedLength) {
    throw new Error(errorMessage);
  }
}
function decodeProtoBytes(value, field) {
  if (value === null || value === void 0) {
    throw new Error(`missing protobuf bytes field ${field}`);
  }
  if (value instanceof Uint8Array) {
    return value;
  }
  return base64ToBytes(value);
}
function lookupBase64(code) {
  if (code > 127) {
    throw new Error("invalid base64 character");
  }
  const v = BASE64_LOOKUP[code];
  if (v === 255) {
    throw new Error("invalid base64 character");
  }
  return v;
}
function bytesToBase64UrlSafe(value) {
  return encodeBase64(value, BASE64URL_CHARS, false);
}
function encodeBase64(value, alphabet, pad) {
  const len = value.length;
  if (len === 0)
    return "";
  const remainder = len % 3;
  const mainLen = len - remainder;
  const chunks = Math.ceil(len / 3);
  const out = new Array(pad ? chunks * 4 : Math.ceil(len * 4 / 3));
  let k = 0;
  for (let i = 0; i < mainLen; i += 3) {
    const a = value[i];
    const b = value[i + 1];
    const c = value[i + 2];
    out[k++] = alphabet[a >> 2];
    out[k++] = alphabet[(a & 3) << 4 | b >> 4];
    out[k++] = alphabet[(b & 15) << 2 | c >> 6];
    out[k++] = alphabet[c & 63];
  }
  if (remainder === 1) {
    const a = value[mainLen];
    out[k++] = alphabet[a >> 2];
    out[k++] = alphabet[(a & 3) << 4];
    if (pad) {
      out[k++] = "=";
      out[k++] = "=";
    }
  } else if (remainder === 2) {
    const a = value[mainLen];
    const b = value[mainLen + 1];
    out[k++] = alphabet[a >> 2];
    out[k++] = alphabet[(a & 3) << 4 | b >> 4];
    out[k++] = alphabet[(b & 15) << 2];
    if (pad) {
      out[k++] = "=";
    }
  }
  return out.join("");
}
function concatBytes(parts) {
  let total = 0;
  for (let i = 0; i < parts.length; i += 1) {
    total += parts[i].length;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (let i = 0; i < parts.length; i += 1) {
    out.set(parts[i], offset);
    offset += parts[i].length;
  }
  return out;
}
function toBytesView(value) {
  if (value instanceof Uint8Array) {
    return value.constructor === Uint8Array ? value : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}
function toChunkBytes(chunk) {
  if (typeof chunk === "string") {
    return TEXT_ENCODER.encode(chunk);
  }
  if (chunk instanceof Uint8Array || chunk instanceof ArrayBuffer || ArrayBuffer.isView(chunk)) {
    return toBytesView(chunk);
  }
  throw new Error(`unsupported stream chunk type: ${typeof chunk}`);
}
function uint8TimingSafeEqual(left, right) {
  if (left.byteLength !== right.byteLength) {
    return false;
  }
  return (0, import_node_crypto.timingSafeEqual)(left, right);
}
function uint8Equal(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
function removeAt(items, index) {
  if (items.length === 0) {
    return [];
  }
  if (index < 0 || index >= items.length) {
    const out2 = new Array(items.length);
    for (let i = 0; i < items.length; i += 1) {
      out2[i] = items[i];
    }
    return out2;
  }
  const out = new Array(items.length - 1);
  let k = 0;
  for (let i = 0; i < items.length; i += 1) {
    if (i !== index) {
      out[k++] = items[i];
    }
  }
  return out;
}
function intToBytes(byteLength, value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`invalid integer value: ${value}`);
  }
  const out = new Uint8Array(byteLength);
  let current = value;
  for (let i = byteLength - 1; i >= 0; i -= 1) {
    out[i] = current & 255;
    current = Math.floor(current / 256);
  }
  return out;
}
async function readAllBytes(stream, options = {}) {
  const maxBytes = options.maxBytes;
  if (maxBytes !== void 0 && (!Number.isSafeInteger(maxBytes) || maxBytes < 0)) {
    throw new Error(`invalid max bytes limit: ${maxBytes}`);
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    const bytes = toChunkBytes(chunk);
    chunks.push(bytes);
    total += bytes.byteLength;
    if (maxBytes !== void 0 && total > maxBytes) {
      const error = new Error(`stream exceeded max bytes limit (${maxBytes})`);
      stream.destroy(error);
      throw error;
    }
  }
  if (total === 0) {
    return EMPTY_BYTES;
  }
  if (chunks.length === 1) {
    return chunks[0];
  }
  return concatBytes(chunks);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EMPTY_BYTES,
  TEXT_DECODER,
  TEXT_ENCODER,
  ZERO_BYTES,
  assertByteLength,
  base64ToBytes,
  base64ToBytesChecked,
  bytesToBase64,
  bytesToBase64UrlSafe,
  bytesToHex,
  concatBytes,
  decodeBase64Url,
  decodeProtoBytes,
  hexToBytes,
  intToBytes,
  readAllBytes,
  removeAt,
  toBytesView,
  toChunkBytes,
  uint8Equal,
  uint8TimingSafeEqual
});
