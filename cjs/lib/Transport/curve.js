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
var curve_exports = {};
__export(curve_exports, {
  calculateAgreement: () => calculateAgreement,
  calculateSignature: () => calculateSignature,
  generateKeyPair: () => generateKeyPair,
  getPublicFromPrivateKey: () => getPublicFromPrivateKey,
  verifySignature: () => verifySignature
});
module.exports = __toCommonJS(curve_exports);
var import_WACrypto = require("../WACrypto/index.js");
function validatePrivKey(privKey) {
  if (privKey === void 0) {
    throw new Error("Undefined private key");
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
    throw new Error("Invalid public key");
  }
  if (pubKey.byteLength == 33) {
    return pubKey.slice(1);
  } else {
    console.error("WARNING: Expected pubkey of length 33, please report the ST and client that generated the pubkey");
    return pubKey;
  }
}
function getPublicFromPrivateKey(privKey) {
  return Buffer.from((0, import_WACrypto.getPublicFromPrivateKey)(privKey));
}
function generateKeyPair() {
  const kp = (0, import_WACrypto.generateKeyPair)();
  return {
    pubKey: Buffer.from(kp.pubKey),
    privKey: Buffer.from(kp.privKey)
  };
}
function calculateAgreement(pubKey, privKey) {
  pubKey = scrubPubKeyFormat(pubKey);
  validatePrivKey(privKey);
  return Buffer.from((0, import_WACrypto.calculateAgreement)(pubKey, privKey));
}
function calculateSignature(privKey, message) {
  validatePrivKey(privKey);
  if (!message) {
    throw new Error("Invalid message");
  }
  return Buffer.from((0, import_WACrypto.calculateSignature)(privKey, message));
}
function verifySignature(pubKey, msg, sig, isInit) {
  if (isInit)
    return true;
  pubKey = scrubPubKeyFormat(pubKey);
  if (!msg) {
    throw new Error("Invalid message");
  }
  if (!sig || sig.byteLength != 64) {
    throw new Error("Invalid signature");
  }
  return (0, import_WACrypto.verifySignature)(pubKey, msg, sig);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculateAgreement,
  calculateSignature,
  generateKeyPair,
  getPublicFromPrivateKey,
  verifySignature
});
