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
var le_exports = {};
__export(le_exports, {
  bigIntToBytesLE: () => bigIntToBytesLE,
  bytesToBigIntLE: () => bytesToBigIntLE
});
module.exports = __toCommonJS(le_exports);
function bytesToBigIntLE(bytes) {
  let out = 0n;
  for (let i = bytes.length - 1; i >= 0; i -= 1) {
    out = (out << 8n) + BigInt(bytes[i]);
  }
  return out;
}
function bigIntToBytesLE(value, length) {
  const out = new Uint8Array(length);
  let current = value;
  for (let i = 0; i < length; i += 1) {
    out[i] = Number(current & 0xffn);
    current >>= 8n;
  }
  return out;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  bigIntToBytesLE,
  bytesToBigIntLE
});
