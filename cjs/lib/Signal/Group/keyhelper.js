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
var keyhelper_exports = {};
__export(keyhelper_exports, {
  generateSenderKey: () => generateSenderKey,
  generateSenderKeyId: () => generateSenderKeyId,
  generateSenderSigningKey: () => generateSenderSigningKey
});
module.exports = __toCommonJS(keyhelper_exports);
var import_node_crypto = require("node:crypto");
var import_Transport = require("../../Transport/index.js");
function generateSenderKey() {
  return (0, import_node_crypto.randomBytes)(32);
}
function generateSenderKeyId() {
  return (0, import_node_crypto.randomInt)(2147483647);
}
function generateSenderSigningKey(key) {
  if (!key) {
    key = import_Transport.curve.generateKeyPair();
  }
  return {
    public: Buffer.from(key.pubKey),
    private: Buffer.from(key.privKey)
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateSenderKey,
  generateSenderKeyId,
  generateSenderSigningKey
});
