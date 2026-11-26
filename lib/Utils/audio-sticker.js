import { randomBytes, createHmac, createCipheriv, hkdfSync } from 'node:crypto';
import { proto } from '../../WAProto/index.js';
import { HttpError } from '../Addon/index.js';
import { generateMessageIDV2 } from './generics.js';
import { prepareWAMessageMedia } from './messages.js';
import { downloadContentFromMessage, toBuffer } from './messages-media.js';
import { extractFirstFrameLength } from './sticker-reaction.js';

/**
 * Figurinha com som (audioStickerMessage) — figurinha WebP com um áudio OGG/Opus
 * embutido, que o WhatsApp reproduz ao tocar a figurinha.
 *
 * Wire format (descoberto pelo WhatsApp):
 *
 *   Message
 *    └─ audioStickerMessage  (campo 134, tag 1074) — FutureProofMessage
 *        └─ message          (campo 1)  — Message
 *            └─ stickerMessage (campo 26)  — StickerMessage
 *                ├─ …campos normais (url, directPath, mediaKey,
 *                │   firstFrameLength, isAnimated, contextInfo…)
 *                └─ audioMessage (campo 26) ← O SOM DA FIGURINHA
 *
 * O WAProto do fork NÃO declara `audioStickerMessage` (campo 134) nem
 * `StickerMessage.audioMessage` (campo 26), então os bytes desses campos
 * viajam como `$unknowns` crus (o encoder os escreve via `writer.raw()`).
 * O `relayMessage` preserva o `message` original (com `$unknowns`) na
 * codificação, e `normalizeMessageContent` descompacta o envelope
 * `audioStickerMessage` apenas para detectar o tipo (sticker).
 */

/* Campos no WAProto do WhatsApp (tag = field << 3 | 2). */
const FIELD_STICKER_AUDIO = 26;   // StickerMessage.audioMessage  → tag 210
const FIELD_AUDIO_STICKER = 134;  // Message.audioStickerMessage → tag 1074
const MAX_STICKER_BYTES = 2 * 1024 * 1024;
const MAX_AUDIO_BYTES = 16 * 1024 * 1024;
const AUDIO_MIMETYPE = 'audio/ogg; codecs=opus';

/** Empacota um campo length-delimited (wire type 2) já com tag e comprimento. */
function lengthDelimitedField(fieldNumber, payload) {
    const tag = varintBytes((BigInt(fieldNumber) << 3n) | 2n);
    return Buffer.concat([tag, varintBytes(payload.length), payload]);
}

function varintBytes(value) {
    const out = [];
    let rest = BigInt(value);
    while (rest > 0x7fn) {
        out.push(Number((rest & 0x7fn) | 0x80n));
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
        result |= BigInt(byte & 0x7f) << shift;
        if ((byte & 0x80) === 0)
            return { value: result, offset };
        shift += 7n;
    }
    throw new Error('varint truncado');
}

/** Extrai o payload de um campo length-delimited dentro de um $unknowns. */
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
    }
    catch {
        return null;
    }
}

/** Busca o payload de um campo length-delimited dentro de um $unknowns. */
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

/** Campos presentes num $unknowns — diagnóstico. */
function camposUnknowns(holder) {
    const lista = Array.isArray(holder?.$unknowns) ? holder.$unknowns : [];
    return [...new Set(lista.map((raw) => {
        try {
            return Number(readVarint(Buffer.from(raw), 0).value >> 3n);
        }
        catch {
            return '?';
        }
    }))].join(',');
}

/** Áudio embutido num stickerMessage (campo declarado OU $unknowns). */
function audioDoSticker(sticker) {
    if (!sticker)
        return null;
    if (sticker.audioMessage)
        return sticker.audioMessage;
    const raw = pickField(sticker.$unknowns, FIELD_STICKER_AUDIO);
    if (!raw)
        return null;
    try {
        return proto.Message.AudioMessage.decode(raw);
    }
    catch {
        return null;
    }
}

/**
 * True quando a mensagem é uma figurinha com som.
 * Aceita o envelope declarado, o $unknowns de campo 134, ou o áudio já
 * descompactado dentro do stickerMessage.
 */
export function isAudioSticker(message) {
    if (!message || typeof message !== 'object')
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

/**
 * Deriva o firstFrameSidecar (10 bytes) de uma figurinha animada:
 * AES-256-CBC (zero IV, encKey derivado) da primeira frame + HMAC-SHA256.
 */
function computeFirstFrameSidecar(mediaKey, firstFrameBuf) {
    const derived = hkdfSync('sha256', mediaKey, Buffer.alloc(32), Buffer.from('WhatsApp Image Keys'), 112);
    const encKey = derived.subarray(0, 32);
    const macKey = derived.subarray(32, 64);
    const iv = Buffer.alloc(16, 0);
    const cipher = createCipheriv('aes-256-cbc', encKey, iv);
    const encFirstFrame = Buffer.concat([cipher.update(firstFrameBuf), cipher.final()]);
    const hmac = createHmac('sha256', macKey);
    hmac.update(Buffer.concat([iv, encFirstFrame]));
    return hmac.digest().subarray(0, 10);
}

/**
 * Detecta as dimensões de um WebP (VP8/VP8L/VP8X). Devolve {width,height}
 * ou null quando não conseguir.
 */
function detectWebpDimensions(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 30)
        return null;
    const fourcc = buffer.subarray(12, 16).toString('ascii');
    try {
        if (fourcc === 'VP8X' && buffer.length >= 30) {
            const w = (buffer.readUIntLE(24, 3) + 1) & 0xffffff;
            const h = (buffer.readUIntLE(27, 3) + 1) & 0xffffff;
            return { width: w, height: h };
        }
        if (fourcc === 'VP8 ' && buffer.length >= 30) {
            const w = buffer.readUInt16LE(26) & 0x3fff;
            const h = buffer.readUInt16LE(28) & 0x3fff;
            return { width: w, height: h };
        }
        if (fourcc === 'VP8L' && buffer.length >= 25) {
            const bits = buffer.readUInt32LE(21);
            const w = (bits & 0x3fff) + 1;
            const h = ((bits >> 14) & 0x3fff) + 1;
            return { width: w, height: h };
        }
    }
    catch {
        return null;
    }
    return null;
}

/** Devolve o contextInfo no formato proto puro (stanzaId/participant/quotedMessage). */
function stickerContextInfo(quotedRef) {
    if (!quotedRef?.key?.id)
        return undefined;
    const participant = quotedRef.key.participant || quotedRef.key.remoteJid;
    const info = { stanzaId: quotedRef.key.id };
    if (participant)
        info.participant = participant;
    if (quotedRef.message)
        info.quotedMessage = quotedRef.message;
    return info;
}

/**
 * Monta o payload da figurinha com som (sem enviar).
 * @param {object} stickerMessage IStickerMessage já enviado (url/directPath/mediaKey).
 * @param {object} audioMessage IAudioMessage já enviado (url/directPath/mediaKey).
 * @param {object} [quotedRef] { key:{id,participant?,remoteJid?}, message } | null.
 * @returns {object} payload pronto para relayMessage.
 */
export function buildAudioStickerPayload(stickerMessage, audioMessage, quotedRef) {
    const audioField = lengthDelimitedField(
        FIELD_STICKER_AUDIO,
        proto.Message.AudioMessage.encode(audioMessage).finish()
    );
    const innerMessage = {
        stickerMessage: {
            ...stickerMessage,
            $unknowns: [...(stickerMessage.$unknowns ?? []), audioField]
        }
    };
    const audioStickerBytes = proto.Message.FutureProofMessage.encode({
        message: innerMessage
    }).finish();
    const messageSecret = randomBytes(32);
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

/**
 * Prepara e envia a figurinha com som.
 *
 * @param {object} sock socket Baileys (relayMessage + waUploadToServer).
 * @param {string} jid destino.
 * @param {object} options {
 *   stickerBuffer: Buffer (image/webp, ≤2 MiB),   // obrigatório
 *   audioBuffer?: Buffer (ogg/opus),
 *   audioSeconds?: number,                          // duração real (sem corte)
 *   isAnimated?: boolean,                          // default: detectado pelo ANMF
 *   width?: number, height?: number,               // dimensões (default: detectadas/512)
 * }
 * @param {object} [quotedRef] { key:{id,participant?,remoteJid?}, message } | null
 * @returns {Promise<string>} messageId
 */
export async function sendAudioSticker(sock, jid, options = {}, quotedRef) {
    if (!Buffer.isBuffer(options?.stickerBuffer) || options.stickerBuffer.length < 12) {
        throw new HttpError('Figurinha inválida: buffer do sticker ausente ou pequeno demais', { statusCode: 400 });
    }
    const stickerBuffer = options.stickerBuffer;
    if (stickerBuffer.length > MAX_STICKER_BYTES) {
        throw new HttpError('A figurinha excede 2 MiB', { statusCode: 400 });
    }

    const firstFrameLength = extractFirstFrameLength(stickerBuffer);
    const isAnimated = options.isAnimated ?? firstFrameLength !== null;

    /* Upload do sticker no caminho nativo — o firstFrameLength viaja junto e
     * a criptografia devolve firstFrameSidecar (obrigatório p/ renderizar fig animada). */
    const stickerPrepared = await prepareWAMessageMedia(
        { sticker: stickerBuffer },
        { upload: sock.waUploadToServer }
    );
    let stickerMessage = stickerPrepared.stickerMessage || {};
    if (!Object.keys(stickerMessage).length) {
        throw new HttpError('Upload da figurinha não devolveu um stickerMessage', { statusCode: 500 });
    }

    /* Dimensões: detecta do WebP, senão 512x512. */
    let width = options.width;
    let height = options.height;
    if (width == null || height == null) {
        const dims = detectWebpDimensions(stickerBuffer);
        width = width ?? (dims?.width ?? 512);
        height = height ?? (dims?.height ?? 512);
    }

    stickerMessage = { ...stickerMessage };
    stickerMessage.mimetype = 'image/webp';
    stickerMessage.isAnimated = Boolean(isAnimated);
    if (firstFrameLength)
        stickerMessage.firstFrameLength = firstFrameLength;
    stickerMessage.width = width;
    stickerMessage.height = height;
    stickerMessage.stickerSentTs = Date.now();
    if (isAnimated && !stickerMessage.firstFrameSidecar && stickerMessage.mediaKey) {
        const mediaKeyBuf = Buffer.isBuffer(stickerMessage.mediaKey)
            ? stickerMessage.mediaKey
            : Buffer.from(stickerMessage.mediaKey);
        try {
            stickerMessage.firstFrameSidecar = computeFirstFrameSidecar(mediaKeyBuf, stickerBuffer.subarray(0, firstFrameLength));
        }
        catch {
            // sidecar é best-effort; a figurinha segue sem ele
        }
    }

    const contextInfo = stickerContextInfo(quotedRef);
    if (contextInfo)
        stickerMessage.contextInfo = contextInfo;

    /* Áudio: OGG/Opus obrigatório. Nunca reaproveita o audioMessage recebido. */
    if (!Buffer.isBuffer(options.audioBuffer) || options.audioBuffer.length < 12) {
        throw new HttpError('Nenhum áudio convertido para figurinha com som', { statusCode: 400 });
    }
    if (options.audioBuffer.length > MAX_AUDIO_BYTES) {
        throw new HttpError('O áudio excede 16 MiB', { statusCode: 400 });
    }
    if (options.audioBuffer.subarray(0, 4).toString('ascii') !== 'OggS') {
        throw new HttpError('O áudio da figurinha precisa estar em OGG/Opus', { statusCode: 400 });
    }

    const audioPrepared = await prepareWAMessageMedia(
        { audio: options.audioBuffer, mimetype: AUDIO_MIMETYPE, ptt: false },
        { upload: sock.waUploadToServer }
    );
    let uploadedNode = audioPrepared.audioMessage || null;
    if (!uploadedNode?.url && !uploadedNode?.directPath) {
        throw new HttpError('Upload do áudio da figurinha não devolveu um audioMessage', { statusCode: 500 });
    }

    const segundos = Number(options.audioSeconds);
    const audioSegundos = Number.isFinite(segundos) && segundos > 0
        ? Math.max(1, Math.round(segundos))
        : (Number.isFinite(Number(uploadedNode.seconds)) && Number(uploadedNode.seconds) > 0
            ? Math.max(1, Math.round(Number(uploadedNode.seconds)))
            : 1);

    /* Whitelist: nada de $unknowns/contextInfo do áudio original entra no proto. */
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
    const messageId = generateMessageIDV2(sock.user?.id || '');
    await sock.relayMessage(jid, payload, { messageId });
    return messageId;
}

/**
 * Extrai o stickerMessage + audioMessage de uma figurinha com som recebida.
 * Aceita um objeto decodificado (com $unknowns ou envelope declarado) ou
 * bytes crus da mensagem (Uint8Array/Buffer) — o fork descarta $unknowns no
 * decode, então bytes crus são a forma mais robusta de receber.
 *
 * @returns {{ stickerMessage: object|null, audioMessage: object|null, origem: string|null }}
 */
export function extractAudioSticker(input) {
    const bruto = input?.message ?? input ?? {};
    const holders = [];
    const addHolder = (holder) => {
        if (holder && typeof holder === 'object' && !holders.includes(holder))
            holders.push(holder);
    };
    addHolder(bruto);
    for (const valor of Object.values(bruto && typeof bruto === 'object' ? bruto : {})) {
        if (!valor || typeof valor !== 'object')
            continue;
        addHolder(valor);
        if (valor.message && typeof valor.message === 'object')
            addHolder(valor.message);
    }

    /* Envelope de campo 134 pode estar no $unknowns de algum holder. */
    let future = null;
    for (const holder of holders) {
        const rawEnvelope = pickField(holder?.$unknowns, FIELD_AUDIO_STICKER);
        if (!rawEnvelope)
            continue;
        try {
            future = proto.Message.FutureProofMessage.decode(rawEnvelope);
            break;
        }
        catch { /* envelope corrompido: tenta o próximo holder */ }
    }

    const envelopeMsg = holders
        .map((holder) => holder?.audioStickerMessage?.message)
        .find(Boolean) || future?.message || null;

    const candidatos = [];
    const adicionar = (st, audio, origem) => {
        if (!st || candidatos.some((c) => c.st === st))
            return;
        candidatos.push({ st, audio: audio || audioDoSticker(st), origem });
    };
    adicionar(envelopeMsg?.stickerMessage, envelopeMsg?.audioMessage, 'envelope');
    adicionar(future?.message?.stickerMessage, future?.message?.audioMessage, 'campo-134');

    for (const holder of holders) {
        const envelopeRaw = holder?.audioStickerMessage;
        if (!((Buffer.isBuffer(envelopeRaw) || envelopeRaw instanceof Uint8Array) && envelopeRaw.length))
            continue;
        try {
            const dec = proto.Message.FutureProofMessage.decode(Buffer.from(envelopeRaw));
            adicionar(dec?.message?.stickerMessage, dec?.message?.audioMessage, 'envelope-bytes');
        }
        catch { /* ignora */ }
    }

    const audioIrmao = holders.map((h) => h?.audioMessage || audioDoSticker(h)).find(Boolean) || null;
    adicionar(bruto?.stickerMessage, audioIrmao, 'sticker-comum');

    let escolhido = null;
    for (const candidato of candidatos) {
        if (!candidato.st?.url && !candidato.st?.directPath)
            continue;
        if (candidato.audio)
            return { stickerMessage: candidato.st, audioMessage: candidato.audio, origem: candidato.origem };
        if (!escolhido)
            escolhido = candidato;
    }
    return escolhido
        ? { stickerMessage: escolhido.st, audioMessage: escolhido.audio, origem: escolhido.origem }
        : { stickerMessage: null, audioMessage: null, origem: null };
}

/**
 * Baixa o WebP e o áudio embutido de uma figurinha com som recebida.
 * Devolve { stickerBuffer, audioBuffer, isAnimated, seconds }.
 *
 * @param {object} input mensagem decodificada ou { message }.
 * @param {object} [options] { maxBytes, sock, stanzaId }
 */
export async function downloadAudioSticker(input, {
    maxBytes = MAX_STICKER_BYTES * 4,
    sock = null,
    stanzaId = ''
} = {}) {
    const extraido = extractAudioSticker(input);
    const stickerMessage = extraido.stickerMessage;
    const audioMessage = extraido.audioMessage;

    const downloadPart = async (part, kind) => {
        if (!part?.url && !part?.directPath)
            return null;
        try {
            const stream = await downloadContentFromMessage(part, kind);
            if (Buffer.isBuffer(stream))
                return stream;
            return await toBuffer(stream);
        }
        catch {
            return null;
        }
    };

    const [stickerBuffer, audioBuffer] = await Promise.all([
        downloadPart(stickerMessage, 'sticker'),
        downloadPart(audioMessage, 'audio')
    ]);

    return {
        stickerBuffer,
        audioBuffer,
        isAnimated: Boolean(stickerMessage?.isAnimated),
        seconds: Number(audioMessage?.seconds) || 0,
        origem: extraido.origem
    };
}
