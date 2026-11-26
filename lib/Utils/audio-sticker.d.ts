/** True quando a mensagem é uma figurinha com som. */
export function isAudioSticker(message: any): boolean;
/** Monta o payload da figurinha com som (sem enviar). */
export function buildAudioStickerPayload(stickerMessage: any, audioMessage: any, quotedRef?: any): any;
/** Prepara e envia a figurinha com som. Devolve o messageId. */
export function sendAudioSticker(sock: any, jid: string, options: {
    stickerBuffer: Buffer;
    audioBuffer?: Buffer;
    audioSeconds?: number;
    isAnimated?: boolean;
    width?: number;
    height?: number;
}, quotedRef?: any): Promise<string>;
/** Extrai o stickerMessage + audioMessage de uma figurinha com som recebida. */
export function extractAudioSticker(input: any): {
    stickerMessage: any;
    audioMessage: any;
    origem: string | null;
};
/** Baixa o WebP e o áudio embutido de uma figurinha com som recebida. */
export function downloadAudioSticker(input: any, options?: {
    maxBytes?: number;
    sock?: any;
    stanzaId?: string;
}): Promise<{
    stickerBuffer: Buffer | null;
    audioBuffer: Buffer | null;
    isAnimated: boolean;
    seconds: number;
    origem: string | null;
}>;
