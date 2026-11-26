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
var crc32_exports = {};
__export(crc32_exports, {
  crc32: () => crc32
});
module.exports = __toCommonJS(crc32_exports);
const TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) !== 0 ? 3988292384 ^ c >>> 1 : c >>> 1;
  }
  TABLE[n] = c;
}
function crc32(data, start = 0) {
  let c = (start ^ 4294967295) >>> 0;
  for (let i = 0; i < data.length; i++) {
    c = (TABLE[(c ^ data[i]) & 255] ^ c >>> 8) >>> 0;
  }
  return (c ^ 4294967295) >>> 0;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  crc32
});
