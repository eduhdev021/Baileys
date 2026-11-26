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
var sticker_reaction_exports = {};
__export(sticker_reaction_exports, {
  extractFirstFrameLength: () => extractFirstFrameLength,
  prepareStickerMessage: () => prepareStickerMessage,
  resolveParentKey: () => resolveParentKey,
  sendStickerReaction: () => sendStickerReaction
});
module.exports = __toCommonJS(sticker_reaction_exports);
var import_node_crypto = require("node:crypto");
var import_node_fs = require("node:fs");
var import_node_fs2 = require("node:fs");
var import_node_os = __toESM(require("node:os"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_WAProto = require("../../WAProto/index.js");
var import_Addon = require("../Addon/index.js");
var import_messages = require("./messages.js");
var import_messages_media = require("./messages-media.js");
function extractFirstFrameLength(buffer) {
  if (!buffer || buffer.length < 12)
    return null;
  const riff = Buffer.from(buffer.subarray(0, 4)).toString("ascii");
  const webp = Buffer.from(buffer.subarray(8, 12)).toString("ascii");
  if (riff !== "RIFF" || webp !== "WEBP")
    return null;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const fourcc = Buffer.from(buffer.subarray(offset, offset + 4)).toString("ascii");
    const size = buffer.readUInt32LE(offset + 4);
    const chunkTotal = 8 + size + size % 2;
    offset += chunkTotal;
    if (fourcc === "ANMF") {
      return offset;
    }
  }
  return null;
}
function resolveParentKey(chatId, target) {
  let key = target?.key;
  if (!key && target && "id" in target && ("remoteJid" in target || chatId)) {
    key = target;
  }
  if (!key || !key.id) {
    throw new import_Addon.HttpError("Invalid message key: target message id is required", { statusCode: 400 });
  }
  const isGroup = typeof chatId === "string" && chatId.endsWith("@g.us");
  const remoteJid = key.remoteJid || chatId;
  const fromMe = Boolean(key.fromMe);
  let participant;
  if (isGroup && !fromMe) {
    participant = key.participant;
  }
  return {
    remoteJid,
    fromMe,
    id: key.id,
    ...participant ? { participant } : {}
  };
}
function hkdfMediaKey(mediaKey, hkdfInfo = "WhatsApp Image Keys") {
  return (0, import_node_crypto.hkdfSync)("sha256", mediaKey, Buffer.alloc(32), Buffer.from(hkdfInfo), 112);
}
function computeFirstFrameSidecar(mediaKey, firstFrameBuf) {
  const derived = hkdfMediaKey(mediaKey);
  const encKey = derived.subarray(0, 32);
  const macKey = derived.subarray(32, 64);
  const iv = Buffer.alloc(16, 0);
  const cipher = (0, import_node_crypto.createCipheriv)("aes-256-cbc", encKey, iv);
  const encFirstFrame = Buffer.concat([cipher.update(firstFrameBuf), cipher.final()]);
  const hmac = (0, import_node_crypto.createHmac)("sha256", macKey);
  hmac.update(Buffer.concat([iv, encFirstFrame]));
  return hmac.digest().subarray(0, 10);
}
async function prepareStickerMessage(source, { upload, isAnimated } = {}) {
  if (source && !Buffer.isBuffer(source) && typeof source === "object" && "fileSha256" in source && "mediaKey" in source) {
    const node = { ...source };
    node.height = node.height || 64;
    node.width = node.width || 64;
    node.mimetype = node.mimetype || "image/webp";
    node.isAvatar = Boolean(node.isAvatar);
    node.isAiSticker = Boolean(node.isAiSticker);
    node.isLottie = Boolean(node.isLottie);
    node.contextInfo = node.contextInfo || {};
    node.stickerSentTs = node.stickerSentTs || Date.now();
    return node;
  }
  let buffer;
  if (Buffer.isBuffer(source)) {
    buffer = source;
  } else if (typeof source === "string") {
    if (/^https?:\/\//.test(source)) {
      buffer = await downloadToBuffer(source);
    } else if ((0, import_node_fs2.existsSync)(source)) {
      buffer = await import_node_fs.promises.readFile(source);
    } else {
      throw new import_Addon.HttpError(`Sticker file path not found: ${source}`, { statusCode: 404 });
    }
  } else if (source && typeof source === "object" && typeof source.url === "string") {
    buffer = await downloadToBuffer(source.url);
  } else {
    throw new import_Addon.HttpError("Invalid sticker source provided", { statusCode: 400 });
  }
  const animated = isAnimated !== void 0 ? isAnimated : buffer.includes(Buffer.from("ANMF")) || buffer.includes(Buffer.from("ANIM"));
  const baseNode = async (tempFilePath) => {
    const preparedMedia = await (0, import_messages.prepareWAMessageMedia)({ sticker: tempFilePath }, { upload });
    const node = preparedMedia.stickerMessage;
    node.height = 64;
    node.width = 64;
    node.mimetype = "image/webp";
    node.isAnimated = animated;
    node.isAvatar = false;
    node.isAiSticker = false;
    node.isLottie = false;
    node.contextInfo = node.contextInfo || {};
    node.stickerSentTs = Date.now();
    if (!node.url && node.directPath) {
      node.url = `https://mmg.whatsapp.net${node.directPath}`;
    }
    return node;
  };
  if (animated) {
    const firstFrameLen = extractFirstFrameLength(buffer);
    if (firstFrameLen && firstFrameLen > 0 && firstFrameLen < buffer.length) {
      const tempFilePath = import_node_path.default.join(import_node_os.default.tmpdir(), `sticker_rx_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`);
      await import_node_fs.promises.writeFile(tempFilePath, buffer);
      try {
        const node = await baseNode(tempFilePath);
        node.firstFrameLength = firstFrameLen;
        if (node.mediaKey) {
          const mediaKeyBuf = Buffer.isBuffer(node.mediaKey) ? node.mediaKey : Buffer.from(node.mediaKey);
          try {
            node.firstFrameSidecar = computeFirstFrameSidecar(mediaKeyBuf, buffer.subarray(0, firstFrameLen));
          } catch {
          }
        }
        return node;
      } finally {
        await import_node_fs.promises.unlink(tempFilePath).catch(() => {
        });
      }
    }
  }
  return baseNode(buffer);
}
async function downloadToBuffer(url) {
  const stream = await (0, import_messages_media.getHttpStream)(url);
  return (0, import_messages_media.toBuffer)(stream);
}
async function sendStickerReaction(sock, chatId, target, sticker, options = {}) {
  const count = Math.max(1, Math.min(options.count ?? 1, 20));
  const delayMs = options.delayMs ?? 300;
  const parentKey = resolveParentKey(chatId, target);
  const stickerMessage = await prepareStickerMessage(sticker, { upload: sock.waUploadToServer, isAnimated: options.isAnimated });
  const results = [];
  for (let i = 0; i < count; i++) {
    const content = import_WAProto.proto.Message.fromObject({
      messageContextInfo: {
        messageSecret: (0, import_node_crypto.randomBytes)(32),
        messageAssociation: {
          associationType: import_WAProto.proto.MessageAssociation.AssociationType.STICKER_ANNOTATION,
          parentMessageKey: parentKey
        }
      },
      associatedChildMessage: {
        message: {
          stickerMessage
        }
      }
    });
    const reactionMsg = (0, import_messages.generateWAMessageFromContent)(chatId, content, {
      userJid: sock.user?.id || ""
    });
    const autoId = reactionMsg.key?.id;
    const messageId = i === 0 && options.messageId ? options.messageId : typeof autoId === "function" ? autoId() : autoId;
    await sock.relayMessage(chatId, reactionMsg.message, {
      messageId,
      additionalAttributes: {
        type: "text"
      }
    });
    results.push({ messageId, parentKey, message: reactionMsg });
    if (i < count - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return results;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  extractFirstFrameLength,
  prepareStickerMessage,
  resolveParentKey,
  sendStickerReaction
});
