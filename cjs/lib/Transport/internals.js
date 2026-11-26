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
var internals_exports = {};
__export(internals_exports, {
  BaseKeyType: () => BaseKeyType,
  ChainType: () => ChainType,
  MessageCounterError: () => MessageCounterError,
  PreKeyError: () => PreKeyError,
  ProtocolAddress: () => ProtocolAddress,
  SessionError: () => SessionError,
  SignalError: () => SignalError,
  UntrustedIdentityKeyError: () => UntrustedIdentityKeyError,
  default: () => internals_default,
  errors: () => errors,
  generateIdentityKeyPair: () => generateIdentityKeyPair,
  generatePreKey: () => generatePreKey,
  generateRegistrationId: () => generateRegistrationId,
  generateSignedPreKey: () => generateSignedPreKey,
  queueJob: () => queueJob
});
module.exports = __toCommonJS(internals_exports);
var import_node_crypto = require("node:crypto");
var import_curve = require("./curve.js");
const BaseKeyType = {
  OURS: 1,
  THEIRS: 2
};
const ChainType = {
  SENDING: 1,
  RECEIVING: 2
};
class SignalError extends Error {
}
class UntrustedIdentityKeyError extends SignalError {
  constructor(addr, identityKey) {
    super();
    this.name = "UntrustedIdentityKeyError";
    this.addr = addr;
    this.identityKey = identityKey;
  }
}
class SessionError extends SignalError {
  constructor(message) {
    super(message);
    this.name = "SessionError";
  }
}
class MessageCounterError extends SessionError {
  constructor(message) {
    super(message);
    this.name = "MessageCounterError";
  }
}
class PreKeyError extends SessionError {
  constructor(message) {
    super(message);
    this.name = "PreKeyError";
  }
}
const errors = {
  SignalError,
  UntrustedIdentityKeyError,
  SessionError,
  MessageCounterError,
  PreKeyError
};
const queues = /* @__PURE__ */ new Map();
async function drain(key, queue) {
  try {
    while (queue.head < queue.jobs.length) {
      const job = queue.jobs[queue.head++];
      queue.jobs[queue.head - 1] = null;
      try {
        job.resolve(await job.run());
      } catch (error) {
        job.reject(error);
      }
      if (queue.head >= 1024 && queue.head * 2 >= queue.jobs.length) {
        queue.jobs = queue.jobs.slice(queue.head);
        queue.head = 0;
      }
    }
  } finally {
    if (queues.get(key) === queue) {
      queues.delete(key);
    }
  }
}
function queueJob(key, run) {
  if (typeof run !== "function") {
    return Promise.reject(new TypeError("Job must be a function"));
  }
  let queue = queues.get(key);
  const start = !queue;
  if (!queue) {
    queue = { jobs: [], head: 0 };
    queues.set(key, queue);
  }
  const promise = new Promise((resolve, reject) => {
    queue.jobs.push({ run, resolve, reject });
  });
  if (start) {
    void drain(key, queue);
  }
  return promise;
}
class ProtocolAddress {
  static from(encodedAddress) {
    if (typeof encodedAddress !== "string" || !encodedAddress.match(/.*\.\d+/)) {
      throw new Error("Invalid address encoding");
    }
    const parts = encodedAddress.split(".");
    return new this(parts[0], parseInt(parts[1]));
  }
  constructor(id, deviceId) {
    if (typeof id !== "string") {
      throw new TypeError("id required for addr");
    }
    if (id.indexOf(".") !== -1) {
      throw new TypeError("encoded addr detected");
    }
    this.id = id;
    if (typeof deviceId !== "number") {
      throw new TypeError("number required for deviceId");
    }
    this.deviceId = deviceId;
  }
  toString() {
    return `${this.id}.${this.deviceId}`;
  }
  is(other) {
    if (!(other instanceof ProtocolAddress)) {
      return false;
    }
    return other.id === this.id && other.deviceId === this.deviceId;
  }
}
function isNonNegativeInteger(n) {
  return typeof n === "number" && n % 1 === 0 && n >= 0;
}
const generateIdentityKeyPair = import_curve.generateKeyPair;
function generateRegistrationId() {
  var registrationId = Uint16Array.from((0, import_node_crypto.randomBytes)(2))[0];
  return registrationId & 16383;
}
function generateSignedPreKey(identityKeyPair, signedKeyId) {
  if (!(identityKeyPair.privKey instanceof Buffer) || identityKeyPair.privKey.byteLength != 32 || !(identityKeyPair.pubKey instanceof Buffer) || identityKeyPair.pubKey.byteLength != 33) {
    throw new TypeError("Invalid argument for identityKeyPair");
  }
  if (!isNonNegativeInteger(signedKeyId)) {
    throw new TypeError("Invalid argument for signedKeyId: " + signedKeyId);
  }
  const keyPair = (0, import_curve.generateKeyPair)();
  const sig = (0, import_curve.calculateSignature)(identityKeyPair.privKey, keyPair.pubKey);
  return {
    keyId: signedKeyId,
    keyPair,
    signature: sig
  };
}
function generatePreKey(keyId) {
  if (!isNonNegativeInteger(keyId)) {
    throw new TypeError("Invalid argument for keyId: " + keyId);
  }
  const keyPair = (0, import_curve.generateKeyPair)();
  return {
    keyId,
    keyPair
  };
}
var internals_default = ProtocolAddress;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BaseKeyType,
  ChainType,
  MessageCounterError,
  PreKeyError,
  ProtocolAddress,
  SessionError,
  SignalError,
  UntrustedIdentityKeyError,
  errors,
  generateIdentityKeyPair,
  generatePreKey,
  generateRegistrationId,
  generateSignedPreKey,
  queueJob
});
