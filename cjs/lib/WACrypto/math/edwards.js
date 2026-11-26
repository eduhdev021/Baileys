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
var edwards_exports = {};
__export(edwards_exports, {
  encodeExtendedPoint: () => encodeExtendedPoint,
  scalarMultBase: () => scalarMultBase
});
module.exports = __toCommonJS(edwards_exports);
var import_constants = require("./constants.js");
var import_fe = require("./fe.js");
var import_mod = require("./mod.js");
const _a = (0, import_fe.fe)();
const _b = (0, import_fe.fe)();
const _c = (0, import_fe.fe)();
const _d = (0, import_fe.fe)();
const _e = (0, import_fe.fe)();
const _f = (0, import_fe.fe)();
const _g = (0, import_fe.fe)();
const _h = (0, import_fe.fe)();
function mutablePoint() {
  return { x: (0, import_fe.fe)(), y: (0, import_fe.fe)(), z: (0, import_fe.fe)(), t: (0, import_fe.fe)() };
}
const _addOut = mutablePoint();
const _dblOut = mutablePoint();
const _negOut = mutablePoint();
const _invZinv = (0, import_fe.fe)();
const _invX = (0, import_fe.fe)();
const _invY = (0, import_fe.fe)();
const _invXBytes = new Uint8Array(32);
function addPointInto(out, a, b) {
  (0, import_fe.feSub)(_a, a.y, a.x);
  (0, import_fe.feSub)(_b, b.y, b.x);
  (0, import_fe.feMul)(_a, _a, _b);
  (0, import_fe.feAdd)(_b, a.y, a.x);
  (0, import_fe.feAdd)(_c, b.y, b.x);
  (0, import_fe.feMul)(_b, _b, _c);
  (0, import_fe.feMul)(_c, import_constants.FE_TWO_D, a.t);
  (0, import_fe.feMul)(_c, _c, b.t);
  (0, import_fe.feAdd)(_d, a.z, a.z);
  (0, import_fe.feMul)(_d, _d, b.z);
  (0, import_fe.feSub)(_e, _b, _a);
  (0, import_fe.feSub)(_f, _d, _c);
  (0, import_fe.feAdd)(_g, _d, _c);
  (0, import_fe.feAdd)(_h, _b, _a);
  (0, import_fe.feMul)(out.x, _e, _f);
  (0, import_fe.feMul)(out.y, _g, _h);
  (0, import_fe.feMul)(out.z, _f, _g);
  (0, import_fe.feMul)(out.t, _e, _h);
}
function doublePointInto(out, point) {
  (0, import_fe.feMul)(_a, point.x, point.x);
  (0, import_fe.feMul)(_b, point.y, point.y);
  (0, import_fe.feMul)(_c, point.z, point.z);
  (0, import_fe.feAdd)(_c, _c, _c);
  (0, import_fe.feNeg)(_d, _a);
  (0, import_fe.feAdd)(_e, point.x, point.y);
  (0, import_fe.feMul)(_e, _e, _e);
  (0, import_fe.feAdd)(_f, _a, _b);
  (0, import_fe.feSub)(_e, _e, _f);
  (0, import_fe.feAdd)(_g, _d, _b);
  (0, import_fe.feSub)(_f, _g, _c);
  (0, import_fe.feSub)(_h, _d, _b);
  (0, import_fe.feMul)(out.x, _e, _f);
  (0, import_fe.feMul)(out.y, _g, _h);
  (0, import_fe.feMul)(out.z, _f, _g);
  (0, import_fe.feMul)(out.t, _e, _h);
}
function negatePointInto(out, p) {
  (0, import_fe.feNeg)(out.x, p.x);
  (0, import_fe.feCopy)(out.y, p.y);
  (0, import_fe.feCopy)(out.z, p.z);
  (0, import_fe.feNeg)(out.t, p.t);
}
function clonePoint(p) {
  const x = (0, import_fe.fe)();
  const y = (0, import_fe.fe)();
  const z = (0, import_fe.fe)();
  const t = (0, import_fe.fe)();
  (0, import_fe.feCopy)(x, p.x);
  (0, import_fe.feCopy)(y, p.y);
  (0, import_fe.feCopy)(z, p.z);
  (0, import_fe.feCopy)(t, p.t);
  return { x, y, z, t };
}
function addPoint(a, b) {
  addPointInto(_addOut, a, b);
  return clonePoint(_addOut);
}
function doublePoint(a) {
  doublePointInto(_dblOut, a);
  return clonePoint(_dblOut);
}
const W = 5;
const halfW = 1 << W;
const mask = halfW - 1;
const precomp = new Array(1 << W - 1);
precomp[0] = import_constants.BASE_POINT;
const _dbl = doublePoint(import_constants.BASE_POINT);
for (let i = 1; i < precomp.length; i++) {
  precomp[i] = addPoint(precomp[i - 1], _dbl);
}
const _naf = new Int8Array(256);
const _loopResult = mutablePoint();
const _loopDbl = mutablePoint();
const _loopAdd = mutablePoint();
function scalarMultBase(scalar) {
  let k = (0, import_mod.modGroup)(scalar);
  if (k === 0n)
    return clonePoint(import_constants.IDENTITY_POINT);
  const naf = _naf;
  naf.fill(0);
  let nafLen = 0;
  while (k > 0n) {
    if ((k & 1n) === 1n) {
      let digit = Number(k & BigInt(mask));
      if (digit >= halfW >> 1)
        digit -= halfW;
      naf[nafLen++] = digit;
      k -= BigInt(digit);
    } else {
      nafLen++;
    }
    k >>= 1n;
  }
  (0, import_fe.feCopy)(_loopResult.x, import_constants.IDENTITY_POINT.x);
  (0, import_fe.feCopy)(_loopResult.y, import_constants.IDENTITY_POINT.y);
  (0, import_fe.feCopy)(_loopResult.z, import_constants.IDENTITY_POINT.z);
  (0, import_fe.feCopy)(_loopResult.t, import_constants.IDENTITY_POINT.t);
  for (let i = nafLen - 1; i >= 0; i--) {
    doublePointInto(_loopDbl, _loopResult);
    const tmpX = _loopResult.x;
    _loopResult.x = _loopDbl.x;
    _loopDbl.x = tmpX;
    const tmpY = _loopResult.y;
    _loopResult.y = _loopDbl.y;
    _loopDbl.y = tmpY;
    const tmpZ = _loopResult.z;
    _loopResult.z = _loopDbl.z;
    _loopDbl.z = tmpZ;
    const tmpT = _loopResult.t;
    _loopResult.t = _loopDbl.t;
    _loopDbl.t = tmpT;
    const digit = naf[i];
    if (digit > 0) {
      addPointInto(_loopAdd, _loopResult, precomp[digit - 1 >> 1]);
      const ax = _loopResult.x;
      _loopResult.x = _loopAdd.x;
      _loopAdd.x = ax;
      const ay = _loopResult.y;
      _loopResult.y = _loopAdd.y;
      _loopAdd.y = ay;
      const az = _loopResult.z;
      _loopResult.z = _loopAdd.z;
      _loopAdd.z = az;
      const at = _loopResult.t;
      _loopResult.t = _loopAdd.t;
      _loopAdd.t = at;
    } else if (digit < 0) {
      negatePointInto(_negOut, precomp[-digit - 1 >> 1]);
      addPointInto(_loopAdd, _loopResult, _negOut);
      const ax = _loopResult.x;
      _loopResult.x = _loopAdd.x;
      _loopAdd.x = ax;
      const ay = _loopResult.y;
      _loopResult.y = _loopAdd.y;
      _loopAdd.y = ay;
      const az = _loopResult.z;
      _loopResult.z = _loopAdd.z;
      _loopAdd.z = az;
      const at = _loopResult.t;
      _loopResult.t = _loopAdd.t;
      _loopAdd.t = at;
    }
  }
  return clonePoint(_loopResult);
}
function encodeExtendedPoint(point) {
  (0, import_fe.feInv)(_invZinv, point.z);
  (0, import_fe.feMul)(_invX, point.x, _invZinv);
  (0, import_fe.feMul)(_invY, point.y, _invZinv);
  const encoded = new Uint8Array(32);
  (0, import_fe.fePack)(encoded, _invY);
  (0, import_fe.fePack)(_invXBytes, _invX);
  encoded[31] = encoded[31] & 127 | (_invXBytes[0] & 1) << 7;
  return encoded;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  encodeExtendedPoint,
  scalarMultBase
});
