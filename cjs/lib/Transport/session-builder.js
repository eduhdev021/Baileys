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
var session_builder_exports = {};
__export(session_builder_exports, {
  default: () => session_builder_default
});
module.exports = __toCommonJS(session_builder_exports);
var import_crypto = require("./crypto.js");
var import_curve = require("./curve.js");
var import_internals = require("./internals.js");
var import_session_record = __toESM(require("./session-record.js"));
class SessionBuilder {
  constructor(storage, protocolAddress) {
    this.addr = protocolAddress;
    this.storage = storage;
  }
  async initOutgoing(device) {
    const fqAddr = this.addr.toString();
    return await (0, import_internals.queueJob)(fqAddr, async () => {
      if (!await this.storage.isTrustedIdentity(this.addr.id, device.identityKey)) {
        throw new import_internals.errors.UntrustedIdentityKeyError(this.addr.id, device.identityKey);
      }
      (0, import_curve.verifySignature)(device.identityKey, device.signedPreKey.publicKey, device.signedPreKey.signature, true);
      const baseKey = (0, import_curve.generateKeyPair)();
      const devicePreKey = device.preKey && device.preKey.publicKey;
      const session = await this.initSession(true, baseKey, void 0, device.identityKey, devicePreKey, device.signedPreKey.publicKey, device.registrationId);
      session.pendingPreKey = {
        signedKeyId: device.signedPreKey.keyId,
        baseKey: baseKey.pubKey
      };
      if (device.preKey) {
        session.pendingPreKey.preKeyId = device.preKey.keyId;
      }
      let record = await this.storage.loadSession(fqAddr);
      if (!record) {
        record = new import_session_record.default();
      } else {
        const openSession = record.getOpenSession();
        if (openSession) {
          record.closeSession(openSession);
        }
      }
      record.setSession(session);
      await this.storage.storeSession(fqAddr, record);
    });
  }
  async initIncoming(record, message) {
    const fqAddr = this.addr.toString();
    if (!await this.storage.isTrustedIdentity(fqAddr, message.identityKey)) {
      throw new import_internals.errors.UntrustedIdentityKeyError(this.addr.id, message.identityKey);
    }
    if (record.getSession(message.baseKey)) {
      return;
    }
    const preKeyPair = message.preKeyId == null ? void 0 : await this.storage.loadPreKey(message.preKeyId);
    if (message.preKeyId && !preKeyPair) {
      throw new import_internals.errors.PreKeyError("Invalid PreKey ID");
    }
    const signedPreKeyPair = await this.storage.loadSignedPreKey(message.signedPreKeyId);
    if (!signedPreKeyPair) {
      throw new import_internals.errors.PreKeyError("Missing SignedPreKey");
    }
    const existingOpenSession = record.getOpenSession();
    if (existingOpenSession) {
      record.closeSession(existingOpenSession);
    }
    record.setSession(await this.initSession(false, preKeyPair, signedPreKeyPair, message.identityKey, message.baseKey, void 0, message.registrationId));
    return message.preKeyId;
  }
  async initSession(isInitiator, ourEphemeralKey, ourSignedKey, theirIdentityPubKey, theirEphemeralPubKey, theirSignedPubKey, registrationId) {
    if (isInitiator) {
      if (ourSignedKey) {
        throw new Error("Invalid call to initSession");
      }
      ourSignedKey = ourEphemeralKey;
    } else {
      if (theirSignedPubKey) {
        throw new Error("Invalid call to initSession");
      }
      theirSignedPubKey = theirEphemeralPubKey;
    }
    let sharedSecret;
    if (!ourEphemeralKey || !theirEphemeralPubKey) {
      sharedSecret = new Uint8Array(32 * 4);
    } else {
      sharedSecret = new Uint8Array(32 * 5);
    }
    for (var i = 0; i < 32; i++) {
      sharedSecret[i] = 255;
    }
    const ourIdentityKey = await this.storage.getOurIdentity();
    const a1 = (0, import_curve.calculateAgreement)(theirSignedPubKey, ourIdentityKey.privKey);
    const a2 = (0, import_curve.calculateAgreement)(theirIdentityPubKey, ourSignedKey.privKey);
    const a3 = (0, import_curve.calculateAgreement)(theirSignedPubKey, ourSignedKey.privKey);
    if (isInitiator) {
      sharedSecret.set(new Uint8Array(a1), 32);
      sharedSecret.set(new Uint8Array(a2), 32 * 2);
    } else {
      sharedSecret.set(new Uint8Array(a1), 32 * 2);
      sharedSecret.set(new Uint8Array(a2), 32);
    }
    sharedSecret.set(new Uint8Array(a3), 32 * 3);
    if (ourEphemeralKey && theirEphemeralPubKey) {
      const a4 = (0, import_curve.calculateAgreement)(theirEphemeralPubKey, ourEphemeralKey.privKey);
      sharedSecret.set(new Uint8Array(a4), 32 * 4);
    }
    const masterKey = (0, import_crypto.deriveSecrets)(Buffer.from(sharedSecret), Buffer.alloc(32), Buffer.from("WhisperText"));
    const session = import_session_record.default.createEntry();
    session.registrationId = registrationId;
    session.currentRatchet = {
      rootKey: masterKey[0],
      ephemeralKeyPair: isInitiator ? (0, import_curve.generateKeyPair)() : ourSignedKey,
      lastRemoteEphemeralKey: theirSignedPubKey,
      previousCounter: 0
    };
    session.indexInfo = {
      created: Date.now(),
      used: Date.now(),
      remoteIdentityKey: theirIdentityPubKey,
      baseKey: isInitiator ? ourEphemeralKey.pubKey : theirEphemeralPubKey,
      baseKeyType: isInitiator ? import_internals.BaseKeyType.OURS : import_internals.BaseKeyType.THEIRS,
      closed: -1
    };
    if (isInitiator) {
      this.calculateSendingRatchet(session, theirSignedPubKey);
    }
    return session;
  }
  calculateSendingRatchet(session, remoteKey) {
    const ratchet = session.currentRatchet;
    const sharedSecret = (0, import_curve.calculateAgreement)(remoteKey, ratchet.ephemeralKeyPair.privKey);
    const masterKey = (0, import_crypto.deriveSecrets)(sharedSecret, ratchet.rootKey, Buffer.from("WhisperRatchet"));
    session.addChain(ratchet.ephemeralKeyPair.pubKey, {
      messageKeys: {},
      chainKey: {
        counter: -1,
        key: masterKey[1]
      },
      chainType: import_internals.ChainType.SENDING
    });
    ratchet.rootKey = masterKey[0];
  }
}
var session_builder_default = SessionBuilder;
