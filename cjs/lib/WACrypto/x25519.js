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
var x25519_exports = {};
__export(x25519_exports, {
  calculateAgreement: () => calculateAgreement,
  clampCurvePrivateKeyInPlace: () => clampCurvePrivateKeyInPlace,
  deriveEdwardsKeyMaterial: () => deriveEdwardsKeyMaterial,
  generateKeyPair: () => generateKeyPair,
  getPublicFromPrivateKey: () => getPublicFromPrivateKey,
  montgomeryToEdwardsPublic: () => montgomeryToEdwardsPublic
});
module.exports = __toCommonJS(x25519_exports);
var import_node_crypto = require("node:crypto");
var import_fe = require("./math/fe.js");
var import_constants = require("./math/constants.js");
var import_edwards = require("./math/edwards.js");
var import_le = require("./math/le.js");
var import_bytes = require("./util/bytes.js");
const X25519_PKCS8_PREFIX = Uint8Array.from([
  48,
  46,
  2,
  1,
  0,
  48,
  5,
  6,
  3,
  43,
  101,
  110,
  4,
  34,
  4,
  32
]);
const X25519_SPKI_PREFIX = Uint8Array.from([
  48,
  42,
  48,
  5,
  6,
  3,
  43,
  101,
  110,
  3,
  33,
  0
]);
const VERSION_BYTE = 5;
function clampCurvePrivateKeyInPlace(privateKey) {
  (0, import_bytes.assertByteLength)(privateKey, 32, `invalid curve25519 private key length ${privateKey.length}`);
  privateKey[0] &= 248;
  privateKey[31] &= 127;
  privateKey[31] |= 64;
  return privateKey;
}
function isFieldPMinus1(b) {
  if (b[0] !== 236 || (b[31] & 127) !== 127)
    return false;
  for (let i = 1; i < 31; i++)
    if (b[i] !== 255)
      return false;
  return true;
}
const _mx = (0, import_fe.fe)();
const _m1 = (0, import_fe.fe)();
const _m2 = (0, import_fe.fe)();
const _m3 = (0, import_fe.fe)();
function montgomeryToEdwardsPublic(curvePublicKey, signBit) {
  (0, import_bytes.assertByteLength)(curvePublicKey, 32, `invalid curve25519 public key length ${curvePublicKey.length}`);
  if (isFieldPMinus1(curvePublicKey)) {
    throw new Error("invalid curve25519 low-order public key");
  }
  (0, import_fe.feFromBytes)(_mx, curvePublicKey);
  (0, import_fe.feSub)(_m1, _mx, import_constants.FE_ONE);
  (0, import_fe.feAdd)(_m2, _mx, import_constants.FE_ONE);
  (0, import_fe.feInv)(_m3, _m2);
  (0, import_fe.feMul)(_m1, _m1, _m3);
  const encoded = new Uint8Array(32);
  (0, import_fe.fePack)(encoded, _m1);
  encoded[31] = encoded[31] & 127 | signBit & 128;
  return encoded;
}
function deriveEdwardsKeyMaterial(privateKey) {
  const clamped = Uint8Array.from(privateKey);
  clampCurvePrivateKeyInPlace(clamped);
  const privateScalar = (0, import_le.bytesToBigIntLE)(clamped);
  const encodedPublic = (0, import_edwards.encodeExtendedPoint)((0, import_edwards.scalarMultBase)(privateScalar));
  return { clamped, privateScalar, encodedPublic };
}
function privateToKeyObject(privKey) {
  return (0, import_node_crypto.createPrivateKey)({
    key: (0, import_bytes.concatBytes)([X25519_PKCS8_PREFIX, privKey]),
    format: "der",
    type: "pkcs8"
  });
}
function publicToKeyObject(pubKey) {
  return (0, import_node_crypto.createPublicKey)({
    key: (0, import_bytes.concatBytes)([X25519_SPKI_PREFIX, pubKey]),
    format: "der",
    type: "spki"
  });
}
function normalizePublicKey(pubKey) {
  if (pubKey.byteLength === 33 && pubKey[0] === VERSION_BYTE) {
    return pubKey.subarray(1);
  }
  (0, import_bytes.assertByteLength)(pubKey, 32, `invalid curve25519 public key length ${pubKey.byteLength}`);
  return pubKey;
}
function generateKeyPair() {
  const { publicKey, privateKey } = (0, import_node_crypto.generateKeyPairSync)("x25519");
  const rawPub = publicKey.export({ format: "der", type: "spki" }).subarray(X25519_SPKI_PREFIX.length);
  const rawPriv = privateKey.export({ format: "der", type: "pkcs8" }).subarray(X25519_PKCS8_PREFIX.length);
  clampCurvePrivateKeyInPlace(rawPriv);
  return {
    pubKey: (0, import_bytes.concatBytes)([Uint8Array.of(VERSION_BYTE), rawPub]),
    privKey: rawPriv
  };
}
function getPublicFromPrivateKey(privKey) {
  const { encodedPublic } = deriveEdwardsKeyMaterial(privKey);
  return (0, import_bytes.concatBytes)([Uint8Array.of(VERSION_BYTE), encodedPublic]);
}
function calculateAgreement(pubKey, privKey) {
  (0, import_bytes.assertByteLength)(privKey, 32, `invalid curve25519 private key length ${privKey.byteLength}`);
  const priv = privateToKeyObject(privKey);
  const pub = publicToKeyObject(normalizePublicKey(pubKey));
  return (0, import_node_crypto.diffieHellman)({ privateKey: priv, publicKey: pub });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculateAgreement,
  clampCurvePrivateKeyInPlace,
  deriveEdwardsKeyMaterial,
  generateKeyPair,
  getPublicFromPrivateKey,
  montgomeryToEdwardsPublic
});
