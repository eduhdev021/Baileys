var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var index_exports = {};
__export(index_exports, {
  MessageCounterError: () => import_internals3.MessageCounterError,
  PreKeyError: () => import_internals3.PreKeyError,
  ProtocolAddress: () => import_internals2.default,
  SessionBuilder: () => import_session_builder.default,
  SessionCipher: () => import_session_cipher.default,
  SessionError: () => import_internals3.SessionError,
  SessionRecord: () => import_session_record.default,
  SignalError: () => import_internals3.SignalError,
  UntrustedIdentityKeyError: () => import_internals3.UntrustedIdentityKeyError,
  crypto: () => crypto,
  curve: () => curve,
  keyhelper: () => keyhelper
});
module.exports = __toCommonJS(index_exports);
var crypto = __toESM(require("./crypto.js"));
var curve = __toESM(require("./curve.js"));
var import_internals = require("./internals.js");
var import_internals2 = __toESM(require("./internals.js"));
var import_session_builder = __toESM(require("./session-builder.js"));
var import_session_cipher = __toESM(require("./session-cipher.js"));
var import_session_record = __toESM(require("./session-record.js"));
var import_internals3 = require("./internals.js");
const keyhelper = { generateIdentityKeyPair: import_internals.generateIdentityKeyPair, generateRegistrationId: import_internals.generateRegistrationId, generateSignedPreKey: import_internals.generateSignedPreKey, generatePreKey: import_internals.generatePreKey };
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MessageCounterError,
  PreKeyError,
  ProtocolAddress,
  SessionBuilder,
  SessionCipher,
  SessionError,
  SessionRecord,
  SignalError,
  UntrustedIdentityKeyError,
  crypto,
  curve,
  keyhelper
});
