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
var xeddsa_exports = {};
__export(xeddsa_exports, {
  calculateSignature: () => calculateSignature,
  verifySignature: () => verifySignature
});
module.exports = __toCommonJS(xeddsa_exports);
var import_node_crypto = require("node:crypto");
var import_edwards = require("./math/edwards.js");
var import_le = require("./math/le.js");
var import_mod = require("./math/mod.js");
var import_bytes = require("./util/bytes.js");
var import_x25519 = require("./x25519.js");
const ED25519_SPKI_PREFIX = Uint8Array.from([
  48,
  42,
  48,
  5,
  6,
  3,
  43,
  101,
  112,
  3,
  33,
  0
]);
const PREFIX_SIGNATURE_RANDOM = Uint8Array.from([
  254,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255
]);
function sha512Chunks(chunks) {
  const hash = (0, import_node_crypto.createHash)("sha512");
  for (const chunk of chunks) {
    hash.update(chunk);
  }
  return hash.digest();
}
function calculateSignature(privateKey, message) {
  (0, import_bytes.assertByteLength)(privateKey, 32, `invalid curve25519 private key length ${privateKey.length}`);
  const { clamped, privateScalar, encodedPublic } = (0, import_x25519.deriveEdwardsKeyMaterial)(privateKey);
  const pubKeySignBit = encodedPublic[31] & 128;
  const randomSuffix = (0, import_node_crypto.randomBytes)(64);
  const r = (0, import_mod.modGroup)((0, import_le.bytesToBigIntLE)(sha512Chunks([
    PREFIX_SIGNATURE_RANDOM,
    clamped,
    message,
    randomSuffix
  ])));
  const encodedR = (0, import_edwards.encodeExtendedPoint)((0, import_edwards.scalarMultBase)(r));
  const h = (0, import_mod.modGroup)((0, import_le.bytesToBigIntLE)(sha512Chunks([encodedR, encodedPublic, message])));
  const s = (0, import_mod.modGroup)(r + h * privateScalar);
  const encodedS = (0, import_le.bigIntToBytesLE)(s, 32);
  encodedS[31] = encodedS[31] & 127 | pubKeySignBit;
  return (0, import_bytes.concatBytes)([encodedR, encodedS]);
}
function verifySignature(publicKey, message, signature) {
  let sig = Uint8Array.from(signature);
  if (sig.byteLength !== 64) {
    return false;
  }
  if ((sig[63] & 96) !== 0) {
    return false;
  }
  const lastByteIndex = 63;
  const originalLastByte = sig[lastByteIndex];
  const signBit = originalLastByte & 128;
  sig[lastByteIndex] = originalLastByte & 127;
  try {
    const pubKey = publicKey.byteLength === 33 && publicKey[0] === 5 ? publicKey.subarray(1) : publicKey;
    const edPublic = (0, import_x25519.montgomeryToEdwardsPublic)(pubKey, signBit);
    const keyObject = (0, import_node_crypto.createPublicKey)({
      key: (0, import_bytes.concatBytes)([ED25519_SPKI_PREFIX, edPublic]),
      format: "der",
      type: "spki"
    });
    return (0, import_node_crypto.verify)(null, message, keyObject, sig);
  } catch {
    return false;
  } finally {
    sig[lastByteIndex] = originalLastByte;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculateSignature,
  verifySignature
});
