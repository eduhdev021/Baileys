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
  BASE_POINT: () => BASE_POINT,
  FE_ONE: () => FE_ONE,
  FE_TWO_D: () => FE_TWO_D,
  FIELD_P: () => FIELD_P,
  GROUP_L: () => GROUP_L,
  IDENTITY_POINT: () => IDENTITY_POINT
});
module.exports = __toCommonJS(constants_exports);
var import_fe = require("./fe.js");
const FIELD_P = (1n << 255n) - 19n;
const GROUP_L = (1n << 252n) + 27742317777372353535851937790883648493n;
const FE_TWO_D = (0, import_fe.feFromBigInt)(16295367250680780974490674513165176452449235426866156013048779062215315747161n);
const FE_ONE = (0, import_fe.feFromBigInt)(1n);
const BASE_POINT = Object.freeze({
  x: (0, import_fe.feFromBigInt)(15112221349535400772501151409588531511454012693041857206046113283949847762202n),
  y: (0, import_fe.feFromBigInt)(46316835694926478169428394003475163141307993866256225615783033603165251855960n),
  z: (0, import_fe.feFromBigInt)(1n),
  t: (0, import_fe.feFromBigInt)(46827403850823179245072216630277197565144205554125654976674165829533817101731n)
});
const IDENTITY_POINT = Object.freeze({
  x: (0, import_fe.feFromBigInt)(0n),
  y: (0, import_fe.feFromBigInt)(1n),
  z: (0, import_fe.feFromBigInt)(1n),
  t: (0, import_fe.feFromBigInt)(0n)
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BASE_POINT,
  FE_ONE,
  FE_TWO_D,
  FIELD_P,
  GROUP_L,
  IDENTITY_POINT
});
