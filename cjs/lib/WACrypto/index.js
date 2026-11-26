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
var index_exports = {};
__export(index_exports, {
  LTHashAntiTampering: () => import_lthash.LTHashAntiTampering,
  calculateAgreement: () => import_x25519.calculateAgreement,
  calculateSignature: () => import_xeddsa.calculateSignature,
  clampCurvePrivateKeyInPlace: () => import_x25519.clampCurvePrivateKeyInPlace,
  expandAppStateKeys: () => import_appstate_keys.expandAppStateKeys,
  generateKeyPair: () => import_x25519.generateKeyPair,
  getPublicFromPrivateKey: () => import_x25519.getPublicFromPrivateKey,
  hkdf: () => import_hkdf.hkdf,
  md5: () => import_hkdf.md5,
  montgomeryToEdwardsPublic: () => import_x25519.montgomeryToEdwardsPublic,
  verifySignature: () => import_xeddsa.verifySignature
});
module.exports = __toCommonJS(index_exports);
var import_hkdf = require("./hkdf.js");
var import_x25519 = require("./x25519.js");
var import_xeddsa = require("./xeddsa.js");
var import_lthash = require("./lthash.js");
var import_appstate_keys = require("./appstate-keys.js");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LTHashAntiTampering,
  calculateAgreement,
  calculateSignature,
  clampCurvePrivateKeyInPlace,
  expandAppStateKeys,
  generateKeyPair,
  getPublicFromPrivateKey,
  hkdf,
  md5,
  montgomeryToEdwardsPublic,
  verifySignature
});
