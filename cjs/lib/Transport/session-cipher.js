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
var session_cipher_exports = {};
__export(session_cipher_exports, {
  default: () => session_cipher_default
});
module.exports = __toCommonJS(session_cipher_exports);
var import_WAProto = require("../../WAProto/index.js");
var import_crypto = require("./crypto.js");
var import_curve = require("./curve.js");
var import_internals = require("./internals.js");
var import_session_builder = __toESM(require("./session-builder.js"));
var import_session_record = __toESM(require("./session-record.js"));
const VERSION = 3;
function assertBuffer(value) {
  if (!Buffer.isBuffer(value)) {
    throw TypeError(`Expected Buffer instead of: ${value.constructor.name}`);
  }
  return value;
}
class SessionCipher {
  constructor(storage, protocolAddress) {
    if (!(protocolAddress instanceof import_internals.ProtocolAddress)) {
      throw new TypeError("protocolAddress must be a ProtocolAddress");
    }
    this.addr = protocolAddress;
    this.storage = storage;
  }
  _encodeTupleByte(number1, number2) {
    if (number1 > 15 || number2 > 15) {
      throw TypeError("Numbers must be 4 bits or less");
    }
    return number1 << 4 | number2;
  }
  _decodeTupleByte(byte) {
    return [byte >> 4, byte & 15];
  }
  toString() {
    return `<SessionCipher(${this.addr.toString()})>`;
  }
  async getRecord() {
    const record = await this.storage.loadSession(this.addr.toString());
    if (record && !(record instanceof import_session_record.default)) {
      throw new TypeError("SessionRecord type expected from loadSession");
    }
    return record;
  }
  async storeRecord(record) {
    record.removeOldSessions();
    await this.storage.storeSession(this.addr.toString(), record);
  }
  async queueJob(awaitable) {
    return await (0, import_internals.queueJob)(this.addr.toString(), awaitable);
  }
  async encrypt(data) {
    assertBuffer(data);
    const ourIdentityKey = await this.storage.getOurIdentity();
    return await this.queueJob(async () => {
      const record = await this.getRecord();
      if (!record) {
        throw new import_internals.errors.SessionError("No sessions");
      }
      const session = record.getOpenSession();
      if (!session) {
        throw new import_internals.errors.SessionError("No open session");
      }
      const remoteIdentityKey = session.indexInfo.remoteIdentityKey;
      if (!await this.storage.isTrustedIdentity(this.addr.id, remoteIdentityKey)) {
        throw new import_internals.errors.UntrustedIdentityKeyError(this.addr.id, remoteIdentityKey);
      }
      const chain = session.getChain(session.currentRatchet.ephemeralKeyPair.pubKey);
      if (chain.chainType === import_internals.ChainType.RECEIVING) {
        throw new Error("Tried to encrypt on a receiving chain");
      }
      this.fillMessageKeys(chain, chain.chainKey.counter + 1);
      const keys = (0, import_crypto.deriveSecrets)(chain.messageKeys[chain.chainKey.counter], Buffer.alloc(32), Buffer.from("WhisperMessageKeys"));
      delete chain.messageKeys[chain.chainKey.counter];
      const msg = import_WAProto.proto.SignalMessage.create();
      msg.ratchetKey = session.currentRatchet.ephemeralKeyPair.pubKey;
      msg.counter = chain.chainKey.counter;
      msg.previousCounter = session.currentRatchet.previousCounter;
      msg.ciphertext = (0, import_crypto.encrypt)(keys[0], data, keys[2].slice(0, 16));
      const msgBuf = import_WAProto.proto.SignalMessage.encode(msg).finish();
      const macInput = Buffer.alloc(msgBuf.byteLength + 33 * 2 + 1);
      macInput.set(ourIdentityKey.pubKey);
      macInput.set(session.indexInfo.remoteIdentityKey, 33);
      macInput[33 * 2] = this._encodeTupleByte(VERSION, VERSION);
      macInput.set(msgBuf, 33 * 2 + 1);
      const mac = (0, import_crypto.calculateMAC)(keys[1], macInput);
      const result = Buffer.alloc(msgBuf.byteLength + 9);
      result[0] = this._encodeTupleByte(VERSION, VERSION);
      result.set(msgBuf, 1);
      result.set(mac.slice(0, 8), msgBuf.byteLength + 1);
      await this.storeRecord(record);
      let type, body;
      if (session.pendingPreKey) {
        type = 3;
        const preKeyMsg = import_WAProto.proto.PreKeySignalMessage.create({
          identityKey: ourIdentityKey.pubKey,
          registrationId: await this.storage.getOurRegistrationId(),
          baseKey: session.pendingPreKey.baseKey,
          signedPreKeyId: session.pendingPreKey.signedKeyId,
          message: result
        });
        if (session.pendingPreKey.preKeyId) {
          preKeyMsg.preKeyId = session.pendingPreKey.preKeyId;
        }
        body = Buffer.concat([
          Buffer.from([this._encodeTupleByte(VERSION, VERSION)]),
          Buffer.from(import_WAProto.proto.PreKeySignalMessage.encode(preKeyMsg).finish())
        ]);
      } else {
        type = 1;
        body = result;
      }
      return {
        type,
        body,
        registrationId: session.registrationId
      };
    });
  }
  async decryptWithSessions(data, sessions) {
    if (!sessions.length) {
      throw new import_internals.errors.SessionError("No sessions available");
    }
    for (const session of sessions) {
      let plaintext;
      try {
        plaintext = await this.doDecryptWhisperMessage(data, session);
        session.indexInfo.used = Date.now();
        return {
          session,
          plaintext
        };
      } catch {
      }
    }
    throw new import_internals.errors.SessionError("No matching sessions found for message");
  }
  async decryptWhisperMessage(data) {
    assertBuffer(data);
    return await this.queueJob(async () => {
      const record = await this.getRecord();
      if (!record) {
        throw new import_internals.errors.SessionError("No session record");
      }
      const result = await this.decryptWithSessions(data, record.getSessions());
      const remoteIdentityKey = result.session.indexInfo.remoteIdentityKey;
      if (!await this.storage.isTrustedIdentity(this.addr.id, remoteIdentityKey)) {
        throw new import_internals.errors.UntrustedIdentityKeyError(this.addr.id, remoteIdentityKey);
      }
      if (record.isClosed(result.session)) {
      }
      await this.storeRecord(record);
      return result.plaintext;
    });
  }
  async decryptPreKeyWhisperMessage(data) {
    assertBuffer(data);
    const versions = this._decodeTupleByte(data[0]);
    if (versions[1] > 3 || versions[0] < 3) {
      throw new Error("Incompatible version number on PreKeySignalMessage");
    }
    return await this.queueJob(async () => {
      let record = await this.getRecord();
      const preKeyProto = import_WAProto.proto.PreKeySignalMessage.decode(data.slice(1));
      if (!record) {
        if (preKeyProto.registrationId == null) {
          throw new Error("No registrationId");
        }
        record = new import_session_record.default();
      }
      const builder = new import_session_builder.default(this.storage, this.addr);
      const preKeyId = await builder.initIncoming(record, preKeyProto);
      const session = record.getSession(preKeyProto.baseKey);
      const plaintext = await this.doDecryptWhisperMessage(preKeyProto.message, session);
      await this.storeRecord(record);
      if (preKeyId !== null) {
        await this.storage.removePreKey(preKeyId);
      }
      return plaintext;
    });
  }
  async doDecryptWhisperMessage(messageBuffer, session) {
    assertBuffer(messageBuffer);
    if (!session) {
      throw new TypeError("session required");
    }
    const versions = this._decodeTupleByte(messageBuffer[0]);
    if (versions[1] > 3 || versions[0] < 3) {
      throw new Error("Incompatible version number on SignalMessage");
    }
    const messageProto = messageBuffer.slice(1, -8);
    const message = import_WAProto.proto.SignalMessage.decode(messageProto);
    this.maybeStepRatchet(session, message.ratchetKey, message.previousCounter);
    const chain = session.getChain(message.ratchetKey);
    if (chain.chainType === import_internals.ChainType.SENDING) {
      throw new Error("Tried to decrypt on a sending chain");
    }
    this.fillMessageKeys(chain, message.counter);
    if (!chain.messageKeys.hasOwnProperty(message.counter)) {
      throw new import_internals.errors.MessageCounterError("Key used already or never filled");
    }
    const messageKey = chain.messageKeys[message.counter];
    delete chain.messageKeys[message.counter];
    const keys = (0, import_crypto.deriveSecrets)(messageKey, Buffer.alloc(32), Buffer.from("WhisperMessageKeys"));
    const ourIdentityKey = await this.storage.getOurIdentity();
    const macInput = Buffer.alloc(messageProto.byteLength + 33 * 2 + 1);
    macInput.set(session.indexInfo.remoteIdentityKey);
    macInput.set(ourIdentityKey.pubKey, 33);
    macInput[33 * 2] = this._encodeTupleByte(VERSION, VERSION);
    macInput.set(messageProto, 33 * 2 + 1);
    (0, import_crypto.verifyMAC)(macInput, keys[1], messageBuffer.slice(-8), 8);
    const plaintext = (0, import_crypto.decrypt)(keys[0], message.ciphertext, keys[2].slice(0, 16));
    delete session.pendingPreKey;
    return plaintext;
  }
  fillMessageKeys(chain, counter) {
    if (chain.chainKey.counter >= counter) {
      return;
    }
    if (counter - chain.chainKey.counter > 2e3) {
      throw new import_internals.errors.SessionError("Over 2000 messages into the future!");
    }
    if (chain.chainKey.key === void 0) {
      throw new import_internals.errors.SessionError("Chain closed");
    }
    while (chain.chainKey.counter < counter) {
      const key = chain.chainKey.key;
      if (key === void 0) {
        throw new import_internals.errors.SessionError("Chain closed");
      }
      const nextCounter = chain.chainKey.counter + 1;
      chain.messageKeys[nextCounter] = (0, import_crypto.calculateMAC)(key, Buffer.from([1]));
      chain.chainKey.key = (0, import_crypto.calculateMAC)(key, Buffer.from([2]));
      chain.chainKey.counter = nextCounter;
    }
  }
  maybeStepRatchet(session, remoteKey, previousCounter) {
    if (session.getChain(remoteKey)) {
      return;
    }
    const ratchet = session.currentRatchet;
    let previousRatchet = session.getChain(ratchet.lastRemoteEphemeralKey);
    if (previousRatchet) {
      this.fillMessageKeys(previousRatchet, previousCounter);
      delete previousRatchet.chainKey.key;
    }
    this.calculateRatchet(session, remoteKey, false);
    const prevCounter = session.getChain(ratchet.ephemeralKeyPair.pubKey);
    if (prevCounter) {
      ratchet.previousCounter = prevCounter.chainKey.counter;
      session.deleteChain(ratchet.ephemeralKeyPair.pubKey);
    }
    ratchet.ephemeralKeyPair = (0, import_curve.generateKeyPair)();
    this.calculateRatchet(session, remoteKey, true);
    ratchet.lastRemoteEphemeralKey = remoteKey;
  }
  calculateRatchet(session, remoteKey, sending) {
    let ratchet = session.currentRatchet;
    const sharedSecret = (0, import_curve.calculateAgreement)(remoteKey, ratchet.ephemeralKeyPair.privKey);
    const masterKey = (0, import_crypto.deriveSecrets)(
      sharedSecret,
      ratchet.rootKey,
      Buffer.from("WhisperRatchet"),
      /*chunks*/
      2
    );
    const chainKey = sending ? ratchet.ephemeralKeyPair.pubKey : remoteKey;
    session.addChain(chainKey, {
      messageKeys: {},
      chainKey: {
        counter: -1,
        key: masterKey[1]
      },
      chainType: sending ? import_internals.ChainType.SENDING : import_internals.ChainType.RECEIVING
    });
    ratchet.rootKey = masterKey[0];
  }
  async hasOpenSession() {
    return await this.queueJob(async () => {
      const record = await this.getRecord();
      if (!record) {
        return false;
      }
      return record.haveOpenSession();
    });
  }
  async closeOpenSession() {
    return await this.queueJob(async () => {
      const record = await this.getRecord();
      if (record) {
        const openSession = record.getOpenSession();
        if (openSession) {
          record.closeSession(openSession);
          await this.storeRecord(record);
        }
      }
    });
  }
}
var session_cipher_default = SessionCipher;
