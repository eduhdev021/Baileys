import { randomBytes, createHmac, createCipheriv, hkdfSync } from 'node:crypto';
import { promises as fsp } from 'node:fs';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { proto } from '../../WAProto/index.js';
import { HttpError } from '../Addon/index.js';
import { generateWAMessageFromContent, prepareWAMessageMedia } from './messages.js';
import { getHttpStream, toBuffer } from './messages-media.js';

/**
 * Sticker reaction ("sticker annotation") — react to a message with a sticker
 * instead of an emoji. WhatsApp renders it as a sticker attached to the target
 * message, using the STICKER_ANNOTATION message association.
 */

/** Read the first frame offset of an animated WebP (RIFF/WEBP with ANMF chunk). */
export function extractFirstFrameLength(buffer) {
    if (!buffer || buffer.length < 12)
        return null;
    const riff = Buffer.from(buffer.subarray(0, 4)).toString('ascii');
    const webp = Buffer.from(buffer.subarray(8, 12)).toString('ascii');
    if (riff !== 'RIFF' || webp !== 'WEBP')
        return null;
    let offset = 12;
    while (offset + 8 <= buffer.length) {
        const fourcc = Buffer.from(buffer.subarray(offset, offset + 4)).toString('ascii');
        const size = buffer.readUInt32LE(offset + 4);
        const chunkTotal = 8 + size + (size % 2);
        offset += chunkTotal;
        if (fourcc === 'ANMF') {
            return offset;
        }
    }
    return null;
}

/** Resolve a target message input into a normalized {@link proto.IMessageKey}. */
export function resolveParentKey(chatId, target) {
    let key = target?.key;
    if (!key && target && 'id' in target && ('remoteJid' in target || chatId)) {
        key = target;
    }
    if (!key || !key.id) {
        throw new HttpError('Invalid message key: target message id is required', { statusCode: 400 });
    }
    const isGroup = typeof chatId === 'string' && chatId.endsWith('@g.us');
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
        ...(participant ? { participant } : {})
    };
}

/** HKDF (RFC 5869) derivation for WhatsApp media keys (112 bytes = enc(32)+mac(32)). */
function hkdfMediaKey(mediaKey, hkdfInfo = 'WhatsApp Image Keys') {
    return hkdfSync('sha256', mediaKey, Buffer.alloc(32), Buffer.from(hkdfInfo), 112);
}

/**
 * Compute the 10-byte firstFrameSidecar for an animated sticker: AES-256-CBC
 * (zero IV, derived encKey) of the first frame, HMAC-SHA256(macKey, iv+enc).
 */
function computeFirstFrameSidecar(mediaKey, firstFrameBuf) {
    const derived = hkdfMediaKey(mediaKey);
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
 * Prepare a sticker into a `proto.Message.IStickerMessage` ready to embed in a
 * reaction. Accepts a Buffer, a file path, a URL, or an already-uploaded
 * `IStickerMessage` (with fileSha256/mediaKey).
 */
export async function prepareStickerMessage(source, { upload, isAnimated } = {}) {
    // Already an uploaded sticker node
    if (source && !Buffer.isBuffer(source) && typeof source === 'object' &&
        'fileSha256' in source && 'mediaKey' in source) {
        const node = { ...source };
        node.height = node.height || 64;
        node.width = node.width || 64;
        node.mimetype = node.mimetype || 'image/webp';
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
    }
    else if (typeof source === 'string') {
        if (/^https?:\/\//.test(source)) {
            buffer = await downloadToBuffer(source);
        }
        else if (existsSync(source)) {
            buffer = await fsp.readFile(source);
        }
        else {
            throw new HttpError(`Sticker file path not found: ${source}`, { statusCode: 404 });
        }
    }
    else if (source && typeof source === 'object' && typeof source.url === 'string') {
        buffer = await downloadToBuffer(source.url);
    }
    else {
        throw new HttpError('Invalid sticker source provided', { statusCode: 400 });
    }

    const animated = isAnimated !== undefined
        ? isAnimated
        : (buffer.includes(Buffer.from('ANMF')) || buffer.includes(Buffer.from('ANIM')));

    const baseNode = async (tempFilePath) => {
        const preparedMedia = await prepareWAMessageMedia({ sticker: tempFilePath }, { upload });
        const node = preparedMedia.stickerMessage;
        node.height = 64;
        node.width = 64;
        node.mimetype = 'image/webp';
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
            const tempFilePath = path.join(os.tmpdir(), `sticker_rx_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`);
            await fsp.writeFile(tempFilePath, buffer);
            try {
                const node = await baseNode(tempFilePath);
                node.firstFrameLength = firstFrameLen;
                if (node.mediaKey) {
                    const mediaKeyBuf = Buffer.isBuffer(node.mediaKey)
                        ? node.mediaKey
                        : Buffer.from(node.mediaKey);
                    try {
                        node.firstFrameSidecar = computeFirstFrameSidecar(mediaKeyBuf, buffer.subarray(0, firstFrameLen));
                    }
                    catch {
                        // sidecar is best-effort; sticker still sends without it
                    }
                }
                return node;
            }
            finally {
                await fsp.unlink(tempFilePath).catch(() => { });
            }
        }
    }

    return baseNode(buffer);
}

async function downloadToBuffer(url) {
    const stream = await getHttpStream(url);
    return toBuffer(stream);
}

/**
 * Send a sticker reaction to a message.
 * @param {object} sock Baileys socket (needs `relayMessage`, `user`, and `waUploadToServer`).
 * @param {string} chatId destination JID.
 * @param {proto.IMessageKey|{id,remoteJid,participant?,fromMe?}} target message to react to.
 * @param {Buffer|string|proto.IStickerMessage|{url:string}} sticker sticker source.
 * @param {object} [options] { messageId, count, delayMs, isAnimated, waitForAck }
 */
export async function sendStickerReaction(sock, chatId, target, sticker, options = {}) {
    const count = Math.max(1, Math.min(options.count ?? 1, 20));
    const delayMs = options.delayMs ?? 300;
    const parentKey = resolveParentKey(chatId, target);
    const stickerMessage = await prepareStickerMessage(sticker, { upload: sock.waUploadToServer, isAnimated: options.isAnimated });
    const results = [];
    for (let i = 0; i < count; i++) {
        const content = proto.Message.fromObject({
            messageContextInfo: {
                messageSecret: randomBytes(32),
                messageAssociation: {
                    associationType: proto.MessageAssociation.AssociationType.STICKER_ANNOTATION,
                    parentMessageKey: parentKey
                }
            },
            associatedChildMessage: {
                message: {
                    stickerMessage
                }
            }
        });
        const reactionMsg = generateWAMessageFromContent(chatId, content, {
            userJid: sock.user?.id || ''
        });
        const autoId = reactionMsg.key?.id;
        const messageId = i === 0 && options.messageId
            ? options.messageId
            : (typeof autoId === 'function' ? autoId() : autoId);
        await sock.relayMessage(chatId, reactionMsg.message, {
            messageId,
            additionalAttributes: {
                type: 'text'
            }
        });
        results.push({ messageId, parentKey, message: reactionMsg });
        if (i < count - 1 && delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    return results;
}
