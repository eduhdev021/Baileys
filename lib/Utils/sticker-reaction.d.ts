/** Read the first frame offset of an animated WebP (RIFF/WEBP with ANMF chunk). */
export function extractFirstFrameLength(buffer: any): number | null;
/** Resolve a target message input into a normalized proto.IMessageKey. */
export function resolveParentKey(chatId: any, target: any): any;
/** Prepare a sticker into a proto.Message.IStickerMessage ready to embed in a reaction. */
export function prepareStickerMessage(source: any, options?: {
    upload?: any;
    isAnimated?: boolean;
}): Promise<any>;
/** Send a sticker reaction to a message. */
export function sendStickerReaction(sock: any, chatId: string, target: any, sticker: any, options?: {
    messageId?: string;
    count?: number;
    delayMs?: number;
    isAnimated?: boolean;
    waitForAck?: boolean;
}): Promise<any[]>;
