/**
 * Addon utilities — a small, dependency-free toolkit used by the library
 * internals and exported for public use:
 *
 *   - createCache        TTL + LRU in-memory cache
 *   - createMutex        async mutual-exclusion lock
 *   - createQueue        bounded-concurrency task queue
 *   - createZip          in-memory ZIP archive builder
 *   - detectFileType     magic-byte file type detection
 *   - detectMediaInfo    width/height/duration probing via ffprobe
 *   - encodeQR           QR Code encoder (terminal ASCII + PNG)
 *   - getAudioWaveform   64-bar audio waveform via ffmpeg
 *   - getFile            normalize any media source to a local path
 */
export { createCache } from './cache.js';
export { createMutex } from './mutex.js';
export { createQueue } from './queue.js';
export { createZip } from './zip.js';
export { detectFileType } from './file-type.js';
export { detectMediaInfo } from './media-info.js';
export { encodeQR } from './qr.js';
export { getAudioWaveform } from './waveform.js';
export { getFile } from './get-file.js';
export * from './http-error.js';
export * from './keyed-db.js';
export * from './link-preview.js';
