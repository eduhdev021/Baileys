export interface CreateCacheOptions {
    /** Default time-to-live in seconds (0/undefined = no expiry). */
    ttl?: number;
    /** Maximum number of entries; least-recently-used entries are evicted. */
    max?: number;
}

export interface CacheStats {
    hits: number;
    misses: number;
    keys: number;
}

export interface Cache {
    set(key: any, value: any, ttl?: number): boolean;
    get(key: any): any;
    has(key: any): boolean;
    del(...keys: any[]): number;
    mset(entries: Array<{ key: any; val: any; ttl?: number }>): boolean;
    mget(...keys: any[]): Record<string, any>;
    mdel(...keys: any[]): number;
    keys(): any[];
    getStats(): CacheStats;
    flushAll(): void;
    close(): void;
    readonly size: number;
    readonly calculatedSize: number;
}

export function createCache(options?: CreateCacheOptions): Cache;

export interface Mutex {
    acquire(): Promise<() => void>;
    lock(): Promise<() => void>;
    tryAcquire(): (() => void) | undefined;
    tryLock(): (() => void) | undefined;
    runExclusive<T>(task: () => T | Promise<T>): Promise<T>;
    isLocked(): boolean;
}

export function createMutex(): Mutex;

export interface Queue {
    add<T>(task: () => T | Promise<T>): Promise<T>;
    push<T>(task: () => T | Promise<T>): Promise<T>;
}

export function createQueue(concurrency?: number): Queue;

export interface ZipEntry {
    name: string;
    data: Buffer | Uint8Array | string;
    date?: Date;
}

export function createZip(entries: Iterable<ZipEntry> | Record<string, Buffer | Uint8Array | string>): Promise<Buffer>;

export interface FileTypeResult {
    mime: string;
    ext: string;
}

export function detectFileType(input: Buffer | Uint8Array | string): Promise<FileTypeResult | Record<string, never>>;

export interface MediaInfo {
    width?: number;
    height?: number;
    durationSeconds?: number;
}

export function detectMediaInfo(input: Buffer | Uint8Array | string): Promise<MediaInfo>;

export interface QrCodeResult {
    /** Terminal rendering using half-block glyphs (ends with a newline). */
    ascii: string;
    getPngBuffer(): Promise<Buffer>;
    getRaw(): Promise<boolean[][]>;
    version: number;
    errorCorrectionLevel: string;
}

export function encodeQR(text: string): Promise<QrCodeResult>;

export interface AudioWaveform {
    durationSeconds: number;
    /** 64 integer bars, 0-100, normalized against the loudest bar. */
    waveform: number[];
}

export function getAudioWaveform(input: Buffer | Uint8Array | string | NodeJS.ReadableStream): Promise<AudioWaveform>;

export function getFile(source: Buffer | Uint8Array | ArrayBuffer | string | NodeJS.ReadableStream | Blob): Promise<string>;

export * from "./http-error.js";
export * from "./keyed-db.js";
export * from "./link-preview.js";
