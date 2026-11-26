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
var appstate_keys_exports = {};
__export(appstate_keys_exports, {
  expandAppStateKeys: () => expandAppStateKeys
});
module.exports = __toCommonJS(appstate_keys_exports);
var import_hkdf = require("./hkdf.js");
const MUTATION_KEYS_INFO = "WhatsApp Mutation Keys";
const DERIVED_KEY_LENGTH = 160;
function expandAppStateKeys(keydata) {
  const expanded = (0, import_hkdf.hkdf)(keydata, DERIVED_KEY_LENGTH, { info: MUTATION_KEYS_INFO });
  return {
    indexKey: expanded.subarray(0, 32),
    valueEncryptionKey: expanded.subarray(32, 64),
    valueMacKey: expanded.subarray(64, 96),
    snapshotMacKey: expanded.subarray(96, 128),
    patchMacKey: expanded.subarray(128, 160)
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  expandAppStateKeys
});
