var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var crypto_exports = {};
__export(crypto_exports, {
  calculateMAC: () => calculateMAC,
  decrypt: () => decrypt,
  deriveSecrets: () => deriveSecrets,
  encrypt: () => encrypt,
  hash: () => hash,
  verifyMAC: () => verifyMAC
});
module.exports = __toCommonJS(crypto_exports);
var import_node_crypto = require("node:crypto");
var import_strict = __toESM(require("node:assert/strict"), 1);
var import_WACrypto = require("../WACrypto/index.js");
function assertBuffer(value) {
  if (!Buffer.isBuffer(value)) {
    throw TypeError(`Expected Buffer instead of: ${value.constructor.name}`);
  }
  return value;
}
function encrypt(key, data, iv) {
  assertBuffer(key);
  assertBuffer(data);
  assertBuffer(iv);
  const cipher = (0, import_node_crypto.createCipheriv)("aes-256-cbc", key, iv);
  return Buffer.concat([cipher.update(data), cipher.final()]);
}
function decrypt(key, data, iv) {
  assertBuffer(key);
  assertBuffer(data);
  assertBuffer(iv);
  const decipher = (0, import_node_crypto.createDecipheriv)("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}
function calculateMAC(key, data) {
  assertBuffer(key);
  assertBuffer(data);
  const hmac = (0, import_node_crypto.createHmac)("sha256", key);
  hmac.update(data);
  return Buffer.from(hmac.digest());
}
function hash(data) {
  assertBuffer(data);
  const sha512 = (0, import_node_crypto.createHash)("sha512");
  sha512.update(data);
  return sha512.digest();
}
function deriveSecrets(input, salt, info, chunks) {
  assertBuffer(input);
  assertBuffer(salt);
  assertBuffer(info);
  if (salt.byteLength != 32) {
    throw new Error("Got salt of incorrect length");
  }
  chunks = chunks || 3;
  (0, import_strict.default)(chunks >= 1 && chunks <= 3);
  const result = (0, import_WACrypto.hkdf)(input, chunks * 32, { salt, info: info.toString("utf8") });
  const output = new Array(chunks);
  for (let i = 0; i < chunks; i++) {
    output[i] = Buffer.from(result.buffer, result.byteOffset + i * 32, 32);
  }
  return output;
}
function verifyMAC(data, key, mac, length) {
  const calculatedMac = calculateMAC(key, data).slice(0, length);
  if (mac.length !== length || calculatedMac.length !== length) {
    throw new Error("Bad MAC length");
  }
  if (!mac.equals(calculatedMac)) {
    throw new Error("Bad MAC");
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculateMAC,
  decrypt,
  deriveSecrets,
  encrypt,
  hash,
  verifyMAC
});
