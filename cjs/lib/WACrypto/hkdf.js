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
var hkdf_exports = {};
__export(hkdf_exports, {
  hkdf: () => hkdf,
  md5: () => md5
});
module.exports = __toCommonJS(hkdf_exports);
var import_node_crypto = require("node:crypto");
function md5(buffer) {
  return (0, import_node_crypto.createHash)("md5").update(buffer).digest();
}
function hkdf(buffer, expandedLength, info = {}) {
  const options = typeof info === "string" ? { info } : info ?? {};
  const salt = options.salt ?? Buffer.alloc(32);
  const context = Buffer.from(options.info ?? "", "utf8");
  return Buffer.from((0, import_node_crypto.hkdfSync)("sha256", buffer, salt, context, expandedLength));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  hkdf,
  md5
});
