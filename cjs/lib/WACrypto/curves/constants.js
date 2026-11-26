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
var constants_exports = {};
__export(constants_exports, {
  ED25519_PKCS8_PREFIX: () => ED25519_PKCS8_PREFIX,
  ED25519_SPKI_PREFIX: () => ED25519_SPKI_PREFIX,
  X25519_PKCS8_PREFIX: () => X25519_PKCS8_PREFIX,
  X25519_SPKI_PREFIX: () => X25519_SPKI_PREFIX
});
module.exports = __toCommonJS(constants_exports);
var import_bytes = require("../util/bytes.js");
const X25519_PKCS8_PREFIX = (0, import_bytes.hexToBytes)("302e020100300506032b656e04220420");
const X25519_SPKI_PREFIX = (0, import_bytes.hexToBytes)("302a300506032b656e032100");
const ED25519_PKCS8_PREFIX = (0, import_bytes.hexToBytes)("302e020100300506032b657004220420");
const ED25519_SPKI_PREFIX = (0, import_bytes.hexToBytes)("302a300506032b6570032100");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ED25519_PKCS8_PREFIX,
  ED25519_SPKI_PREFIX,
  X25519_PKCS8_PREFIX,
  X25519_SPKI_PREFIX
});
