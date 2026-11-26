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
var lthash_exports = {};
__export(lthash_exports, {
  LTHashAntiTampering: () => LTHashAntiTampering
});
module.exports = __toCommonJS(lthash_exports);
var import_hkdf = require("./hkdf.js");
const LT_HASH_SIZE = 128;
const POINT_SIZE = 2;
const PATCH_INTEGRITY_INFO = "WhatsApp Patch Integrity";
function expandValue(value) {
  return (0, import_hkdf.hkdf)(value, LT_HASH_SIZE, { info: PATCH_INTEGRITY_INFO });
}
function pointwise(left, right, combine, out) {
  if (left.byteLength !== right.byteLength) {
    throw new Error("lt hash input length mismatch");
  }
  if (left.byteLength % POINT_SIZE !== 0) {
    throw new Error("lt hash input alignment mismatch");
  }
  for (let offset = 0; offset < left.byteLength; offset += POINT_SIZE) {
    const value = combine(left[offset] | left[offset + 1] << 8, right[offset] | right[offset + 1] << 8);
    out[offset] = value & 255;
    out[offset + 1] = value >>> 8 & 255;
  }
  return out;
}
class LTHashAntiTampering {
  subtractThenAdd(hash, subBuffs, addBuffs) {
    const out = Buffer.from(hash);
    for (const value of subBuffs ?? []) {
      pointwise(out, expandValue(value), (l, r) => l - r, out);
    }
    for (const value of addBuffs ?? []) {
      pointwise(out, expandValue(value), (l, r) => l + r, out);
    }
    return out;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LTHashAntiTampering
});
