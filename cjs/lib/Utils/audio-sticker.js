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
var audio_sticker_exports = {};
__export(audio_sticker_exports, {
  buildAudioStickerPayload: () => buildAudioStickerPayload,
  downloadAudioSticker: () => downloadAudioSticker,
  extractAudioSticker: () => extractAudioSticker,
  isAudioSticker: () => isAudioSticker,
  sendAudioSticker: () => sendAudioSticker
});
module.exports = __toCommonJS(audio_sticker_exports);
var import_node_crypto = require("node:crypto");
var import_WAProto = require("../../WAProto/index.js");
var import_Addon = require("../Addon/index.js");
var import_generics = require("./generics.js");
var import_messages = require("./messages.js");
var import_messages_media = require("./messages-media.js");
var import_sticker_reaction = require("./sticker-reaction.js");
const FIELD_STICKER_AUDIO = 26;
const FIELD_AUDIO_STICKER = 134;
const MAX_STICKER_BYTES = 2 * 1024 * 1024;
const MAX_AUDIO_BYTES = 16 * 1024 * 1024;
const AUDIO_MIMETYPE = "audio/ogg; codecs=opus";
function lengthDelimitedField(fieldNumber, payload) {
  const tag = varintBytes(BigInt(fieldNumber) << 3n | 2n);
  return Buffer.concat([tag, varintBytes(payload.length), payload]);
}
function varintBytes(value) {
  const out = [];
  let rest = BigInt(value);
  while (rest > 0x7fn) {
    out.push(Number(rest & 0x7fn | 0x80n));
    rest >>= 7n;
  }
  out.push(Number(rest));
  return Buffer.from(out);
}
function readVarint(buffer, offset) {
  let result = 0n;
  let shift = 0n;
  while (offset < buffer.length) {
    const byte = buffer[offset];
    offset += 1;
    result |= BigInt(byte & 127) << shift;
    if ((byte & 128) === 0)
      return { value: result, offset };
    shift += 7n;
  }
  throw new Error("varint truncado");
}
function readDelimitedField(raw, fieldNumber) {
  try {
    const tag = readVarint(raw, 0);
    if (Number(tag.value >> 3n) !== fieldNumber || Number(tag.value & 7n) !== 2)
      return null;
    const len = readVarint(raw, tag.offset);
    const start = len.offset;
    const end = start + Number(len.value);
    if (end > raw.length)
      return null;
    return raw.subarray(start, end);
  } catch {
    return null;
  }
}
function pickField(unknowns, fieldNumber) {
  if (!Array.isArray(unknowns))
    return null;
  for (const raw of unknowns) {
    if (!Buffer.isBuffer(raw) && !(raw instanceof Uint8Array))
      continue;
    const payload = readDelimitedField(Buffer.from(raw), fieldNumber);
    if (payload)
      return payload;
  }
  return null;
}
function camposUnknowns(holder) {
  const lista = Array.isArray(holder?.$unknowns) ? holder.$unknowns : [];
  return [...new Set(lista.map((raw) => {
    try {
      return Number(readVarint(Buffer.from(raw), 0).value >> 3n);
    } catch {
      return "?";
    }
  }))].join(",");
}
function audioDoSticker(sticker) {
  if (!sticker)
    return null;
  if (sticker.audioMessage)
    return sticker.audioMessage;
  const raw = pickField(sticker.$unknowns, FIELD_STICKER_AUDIO);
  if (!raw)
    return null;
  try {
    return import_WAProto.proto.Message.AudioMessage.decode(raw);
  } catch {
    return null;
  }
}
function isAudioSticker(message) {
  if (!message || typeof message !== "object")
    return false;
  if (message.audioStickerMessage)
    return true;
  if (pickField(message.$unknowns, FIELD_AUDIO_STICKER))
    return true;
  const sticker = message.stickerMessage;
  if (!sticker)
    return false;
  return Boolean(audioDoSticker(sticker) || message.audioMessage || pickField(message.$unknowns, FIELD_STICKER_AUDIO));
}
function computeFirstFrameSidecar(mediaKey, firstFrameBuf) {
  const derived = (0, import_node_crypto.hkdfSync)("sha256", mediaKey, Buffer.alloc(32), Buffer.from("WhatsApp Image Keys"), 112);
  const encKey = derived.subarray(0, 32);
  const macKey = derived.subarray(32, 64);
  const iv = Buffer.alloc(16, 0);
  const cipher = (0, import_node_crypto.createCipheriv)("aes-256-cbc", encKey, iv);
  const encFirstFrame = Buffer.concat([cipher.update(firstFrameBuf), cipher.final()]);
  const hmac = (0, import_node_crypto.createHmac)("sha256", macKey);
  hmac.update(Buffer.concat([iv, encFirstFrame]));
  return hmac.digest().subarray(0, 10);
}
function detectWebpDimensions(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 30)
    return null;
  const fourcc = buffer.subarray(12, 16).toString("ascii");
  try {
    if (fourcc === "VP8X" && buffer.length >= 30) {
      const w = buffer.readUIntLE(24, 3) + 1 & 16777215;
      const h = buffer.readUIntLE(27, 3) + 1 & 16777215;
      return { width: w, height: h };
    }
    if (fourcc === "VP8 " && buffer.length >= 30) {
      const w = buffer.readUInt16LE(26) & 16383;
      const h = buffer.readUInt16LE(28) & 16383;
      return { width: w, height: h };
    }
    if (fourcc === "VP8L" && buffer.length >= 25) {
      const bits = buffer.readUInt32LE(21);
      const w = (bits & 16383) + 1;
      const h = (bits >> 14 & 16383) + 1;
      return { width: w, height: h };
    }
  } catch {
    return null;
  }
  return null;
}
function stickerContextInfo(quotedRef) {
  if (!quotedRef?.key?.id)
    return void 0;
  const participant = quotedRef.key.participant || quotedRef.key.remoteJid;
  const info = { stanzaId: quotedRef.key.id };
  if (participant)
    info.participant = participant;
  if (quotedRef.message)
    info.quotedMessage = quotedRef.message;
  return info;
}
function buildAudioStickerPayload(stickerMessage, audioMessage, quotedRef) {
  const audioField = lengthDelimitedField(
    FIELD_STICKER_AUDIO,
    import_WAProto.proto.Message.AudioMessage.encode(audioMessage).finish()
  );
  const innerMessage = {
    stickerMessage: {
      ...stickerMessage,
      $unknowns: [...stickerMessage.$unknowns ?? [], audioField]
    }
  };
  const audioStickerBytes = import_WAProto.proto.Message.FutureProofMessage.encode({
    message: innerMessage
  }).finish();
  const messageSecret = (0, import_node_crypto.randomBytes)(32);
  const payload = {
    audioStickerMessage: { message: innerMessage },
    messageContextInfo: { messageSecret },
    $unknowns: [lengthDelimitedField(FIELD_AUDIO_STICKER, audioStickerBytes)]
  };
  const contextInfo = stickerContextInfo(quotedRef);
  if (contextInfo)
    innerMessage.stickerMessage.contextInfo = contextInfo;
  return payload;
}
async function sendAudioSticker(sock, jid, options = {}, quotedRef) {
  if (!Buffer.isBuffer(options?.stickerBuffer) || options.stickerBuffer.length < 12) {
    throw new import_Addon.HttpError("Figurinha inv\xE1lida: buffer do sticker ausente ou pequeno demais", { statusCode: 400 });
  }
  const stickerBuffer = options.stickerBuffer;
  if (stickerBuffer.length > MAX_STICKER_BYTES) {
    throw new import_Addon.HttpError("A figurinha excede 2 MiB", { statusCode: 400 });
  }
  const firstFrameLength = (0, import_sticker_reaction.extractFirstFrameLength)(stickerBuffer);
  const isAnimated = options.isAnimated ?? firstFrameLength !== null;
  const stickerPrepared = await (0, import_messages.prepareWAMessageMedia)(
    { sticker: stickerBuffer },
    { upload: sock.waUploadToServer }
  );
  let stickerMessage = stickerPrepared.stickerMessage || {};
  if (!Object.keys(stickerMessage).length) {
    throw new import_Addon.HttpError("Upload da figurinha n\xE3o devolveu um stickerMessage", { statusCode: 500 });
  }
  let width = options.width;
  let height = options.height;
  if (width == null || height == null) {
    const dims = detectWebpDimensions(stickerBuffer);
    width = width ?? (dims?.width ?? 512);
    height = height ?? (dims?.height ?? 512);
  }
  stickerMessage = { ...stickerMessage };
  stickerMessage.mimetype = "image/webp";
  stickerMessage.isAnimated = Boolean(isAnimated);
  if (firstFrameLength)
    stickerMessage.firstFrameLength = firstFrameLength;
  stickerMessage.width = width;
  stickerMessage.height = height;
  stickerMessage.stickerSentTs = Date.now();
  if (isAnimated && !stickerMessage.firstFrameSidecar && stickerMessage.mediaKey) {
    const mediaKeyBuf = Buffer.isBuffer(stickerMessage.mediaKey) ? stickerMessage.mediaKey : Buffer.from(stickerMessage.mediaKey);
    try {
      stickerMessage.firstFrameSidecar = computeFirstFrameSidecar(mediaKeyBuf, stickerBuffer.subarray(0, firstFrameLength));
    } catch {
    }
  }
  const contextInfo = stickerContextInfo(quotedRef);
  if (contextInfo)
    stickerMessage.contextInfo = contextInfo;
  if (!Buffer.isBuffer(options.audioBuffer) || options.audioBuffer.length < 12) {
    throw new import_Addon.HttpError("Nenhum \xE1udio convertido para figurinha com som", { statusCode: 400 });
  }
  if (options.audioBuffer.length > MAX_AUDIO_BYTES) {
    throw new import_Addon.HttpError("O \xE1udio excede 16 MiB", { statusCode: 400 });
  }
  if (options.audioBuffer.subarray(0, 4).toString("ascii") !== "OggS") {
    throw new import_Addon.HttpError("O \xE1udio da figurinha precisa estar em OGG/Opus", { statusCode: 400 });
  }
  const audioPrepared = await (0, import_messages.prepareWAMessageMedia)(
    { audio: options.audioBuffer, mimetype: AUDIO_MIMETYPE, ptt: false },
    { upload: sock.waUploadToServer }
  );
  let uploadedNode = audioPrepared.audioMessage || null;
  if (!uploadedNode?.url && !uploadedNode?.directPath) {
    throw new import_Addon.HttpError("Upload do \xE1udio da figurinha n\xE3o devolveu um audioMessage", { statusCode: 500 });
  }
  const segundos = Number(options.audioSeconds);
  const audioSegundos = Number.isFinite(segundos) && segundos > 0 ? Math.max(1, Math.round(segundos)) : Number.isFinite(Number(uploadedNode.seconds)) && Number(uploadedNode.seconds) > 0 ? Math.max(1, Math.round(Number(uploadedNode.seconds))) : 1;
  const audioMessage = {
    url: uploadedNode.url,
    directPath: uploadedNode.directPath,
    mediaKey: uploadedNode.mediaKey,
    fileEncSha256: uploadedNode.fileEncSha256,
    fileSha256: uploadedNode.fileSha256,
    fileLength: uploadedNode.fileLength,
    mediaKeyTimestamp: uploadedNode.mediaKeyTimestamp,
    streamingSidecar: uploadedNode.streamingSidecar,
    mimetype: AUDIO_MIMETYPE,
    ptt: false,
    seconds: audioSegundos
  };
  const payload = buildAudioStickerPayload(stickerMessage, audioMessage, quotedRef);
  const messageId = (0, import_generics.generateMessageIDV2)(sock.user?.id || "");
  await sock.relayMessage(jid, payload, { messageId });
  return messageId;
}
function extractAudioSticker(input) {
  const bruto = input?.message ?? input ?? {};
  const holders = [];
  const addHolder = (holder) => {
    if (holder && typeof holder === "object" && !holders.includes(holder))
      holders.push(holder);
  };
  addHolder(bruto);
  for (const valor of Object.values(bruto && typeof bruto === "object" ? bruto : {})) {
    if (!valor || typeof valor !== "object")
      continue;
    addHolder(valor);
    if (valor.message && typeof valor.message === "object")
      addHolder(valor.message);
  }
  let future = null;
  for (const holder of holders) {
    const rawEnvelope = pickField(holder?.$unknowns, FIELD_AUDIO_STICKER);
    if (!rawEnvelope)
      continue;
    try {
      future = import_WAProto.proto.Message.FutureProofMessage.decode(rawEnvelope);
      break;
    } catch {
    }
  }
  const envelopeMsg = holders.map((holder) => holder?.audioStickerMessage?.message).find(Boolean) || future?.message || null;
  const candidatos = [];
  const adicionar = (st, audio, origem) => {
    if (!st || candidatos.some((c) => c.st === st))
      return;
    candidatos.push({ st, audio: audio || audioDoSticker(st), origem });
  };
  adicionar(envelopeMsg?.stickerMessage, envelopeMsg?.audioMessage, "envelope");
  adicionar(future?.message?.stickerMessage, future?.message?.audioMessage, "campo-134");
  for (const holder of holders) {
    const envelopeRaw = holder?.audioStickerMessage;
    if (!((Buffer.isBuffer(envelopeRaw) || envelopeRaw instanceof Uint8Array) && envelopeRaw.length))
      continue;
    try {
      const dec = import_WAProto.proto.Message.FutureProofMessage.decode(Buffer.from(envelopeRaw));
      adicionar(dec?.message?.stickerMessage, dec?.message?.audioMessage, "envelope-bytes");
    } catch {
    }
  }
  const audioIrmao = holders.map((h) => h?.audioMessage || audioDoSticker(h)).find(Boolean) || null;
  adicionar(bruto?.stickerMessage, audioIrmao, "sticker-comum");
  let escolhido = null;
  for (const candidato of candidatos) {
    if (!candidato.st?.url && !candidato.st?.directPath)
      continue;
    if (candidato.audio)
      return { stickerMessage: candidato.st, audioMessage: candidato.audio, origem: candidato.origem };
    if (!escolhido)
      escolhido = candidato;
  }
  return escolhido ? { stickerMessage: escolhido.st, audioMessage: escolhido.audio, origem: escolhido.origem } : { stickerMessage: null, audioMessage: null, origem: null };
}
async function downloadAudioSticker(input, {
  maxBytes = MAX_STICKER_BYTES * 4,
  sock = null,
  stanzaId = ""
} = {}) {
  const extraido = extractAudioSticker(input);
  const stickerMessage = extraido.stickerMessage;
  const audioMessage = extraido.audioMessage;
  const downloadPart = async (part, kind) => {
    if (!part?.url && !part?.directPath)
      return null;
    try {
      const stream = await (0, import_messages_media.downloadContentFromMessage)(part, kind);
      if (Buffer.isBuffer(stream))
        return stream;
      return await (0, import_messages_media.toBuffer)(stream);
    } catch {
      return null;
    }
  };
  const [stickerBuffer, audioBuffer] = await Promise.all([
    downloadPart(stickerMessage, "sticker"),
    downloadPart(audioMessage, "audio")
  ]);
  return {
    stickerBuffer,
    audioBuffer,
    isAnimated: Boolean(stickerMessage?.isAnimated),
    seconds: Number(audioMessage?.seconds) || 0,
    origem: extraido.origem
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildAudioStickerPayload,
  downloadAudioSticker,
  extractAudioSticker,
  isAudioSticker,
  sendAudioSticker
});
