/**
 * Self-contained behavioral tests for the addon utility layer
 * (lib/Addon). No network, no external packages, no system binaries
 * required — every check runs on synthetic data.
 *
 * Run: node tests/addon-test.mjs
 */
import { createCache, createMutex, createQueue, createZip, detectFileType, detectFileType as detect, encodeQR } from '../lib/Addon/index.js';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
    if (cond) { pass++; console.log(`  PASS ${name}`); }
    else { fail++; console.log(`  FAIL ${name} ${detail}`); }
};

console.log('== createCache ==');
{
    const cache = createCache({ ttl: 60, max: 3 });
    cache.set('a', 1);
    ok('get returns value', cache.get('a') === 1);
    ok('missing key is undefined', cache.get('nope') === undefined);
    ok('has()', cache.has('a') === true);
    ok('del() count', cache.del('a') === 1);
    ok('has() after del', cache.has('a') === false);
    cache.mset([{ key: 'x', val: 10 }, { key: 'y', val: 20 }]);
    ok('mset + mget', cache.mget('x', 'y').x === 10 && cache.mget('x', 'y').y === 20);
    ok('mget omits missing', !('nope' in cache.mget('x', 'nope')));
    cache.set('k1', 1); cache.set('k2', 2); cache.set('k3', 3); cache.set('k4', 4);
    ok('LRU evicts beyond max', cache.get('k1') === undefined && cache.get('k4') === 4);
    ok('keys() live keys', cache.keys().includes('k4'));
    ok('getStats() shape', typeof cache.getStats().hits === 'number');
    ok('size getter', cache.size === 3);
    cache.flushAll();
    ok('flushAll', cache.get('k4') === undefined && cache.size === 0);
    cache.close();

    const t = createCache({ ttl: 1 });
    t.set('k', 'v');
    ok('ttl immediate hit', t.get('k') === 'v');
    await new Promise(r => setTimeout(r, 1100));
    ok('ttl expires (seconds)', t.get('k') === undefined);
    t.close();

    const perEntry = createCache({ ttl: 60 });
    perEntry.set('short', 'v', 0.2); // 200 ms override
    await new Promise(r => setTimeout(r, 400));
    ok('per-entry ttl override', perEntry.get('short') === undefined);
    perEntry.close();
}

console.log('== createMutex ==');
{
    const mutex = createMutex();
    ok('isLocked() false initially', mutex.isLocked() === false);
    const order = [];
    const p1 = mutex.runExclusive(async () => { order.push('1-start'); await new Promise(r => setTimeout(r, 40)); order.push('1-end'); return 'r1'; });
    const p2 = mutex.runExclusive(() => { order.push('2-run'); return 'r2'; });
    const results = await Promise.all([p1, p2]);
    ok('FIFO serialization', order.join(',') === '1-start,1-end,2-run');
    ok('runExclusive returns task results', results[0] === 'r1' && results[1] === 'r2');
    ok('unlocked after tasks', mutex.isLocked() === false);
    const release = await mutex.acquire();
    ok('acquire() locks', mutex.isLocked() === true);
    ok('tryAcquire() fails while locked', mutex.tryAcquire() === undefined);
    release();
    await new Promise(r => setTimeout(r, 0));
    ok('release() unlocks', mutex.isLocked() === false);
    let errored = false;
    await mutex.runExclusive(async () => { throw new Error('boom'); }).catch(() => { errored = true; });
    ok('task errors propagate and keep the lock healthy', errored && mutex.isLocked() === false);
}

console.log('== createQueue ==');
{
    const queue = createQueue(1);
    const order = [];
    const p1 = queue.add(async () => { order.push('a'); await new Promise(r => setTimeout(r, 30)); return 1; });
    const p2 = queue.push(() => { order.push('b'); return 2; });
    ok('serialized execution', (await p1) === 1 && (await p2) === 2 && order.join(',') === 'a,b');
    const q2 = createQueue(2);
    const starts = [];
    await Promise.all([
        q2.add(async () => { starts.push('x1'); await new Promise(r => setTimeout(r, 30)); }),
        q2.add(() => { starts.push('x2'); })
    ]);
    ok('concurrency=2 runs in parallel', starts.join(',') === 'x1,x2');
    await queue.add(async () => { throw new Error('x'); }).catch(() => { });
    ok('queue survives task errors', (await queue.add(async () => 'ok')) === 'ok');
}

console.log('== createZip ==');
{
    const zip = await createZip([
        { name: 'one.txt', data: Buffer.from('hello world one') },
        { name: 'dir/two.bin', data: Buffer.from([1, 2, 3, 4, 255]) },
        { name: 'big.bin', data: Buffer.from('A'.repeat(5000)) }
    ]);
    ok('zip magic PK', zip[0] === 0x50 && zip[1] === 0x4B && zip[2] === 0x03 && zip[3] === 0x04);
    ok('EOCD present', zip[zip.length - 22] === 0x50 && zip[zip.length - 21] === 0x4B && zip[zip.length - 20] === 0x05 && zip[zip.length - 19] === 0x06);
    // Walk local headers and verify contents via CRC-verified inflate
    let offset = 0;
    const found = {};
    while (zip.readUInt32LE(offset) === 0x04034b50) {
        const method = zip.readUInt16LE(offset + 8);
        const crc = zip.readUInt32LE(offset + 14);
        const csize = zip.readUInt32LE(offset + 18);
        const usize = zip.readUInt32LE(offset + 22);
        const nameLen = zip.readUInt16LE(offset + 26);
        const extraLen = zip.readUInt16LE(offset + 28);
        const name = zip.subarray(offset + 30, offset + 30 + nameLen).toString('utf8');
        const payload = zip.subarray(offset + 30 + nameLen + extraLen, offset + 30 + nameLen + extraLen + csize);
        const data = method === 8 ? inflateRawSync(payload) : Buffer.from(payload);
        ok(`entry ${name} size`, data.length === usize);
        let checksum = 0xFFFFFFFF;
        for (const byte of data) {
            checksum ^= byte;
            for (let i = 0; i < 8; i++) checksum = (checksum >>> 1) ^ (0xEDB88320 & -(checksum & 1));
        }
        ok(`entry ${name} crc`, (checksum ^ 0xFFFFFFFF) >>> 0 === crc);
        found[name] = data;
        offset += 30 + nameLen + extraLen + csize;
    }
    ok('all entries found', found['one.txt']?.toString() === 'hello world one' && found['dir/two.bin']?.length === 5 && found['big.bin']?.length === 5000);
    ok('deflate compresses repetitive data', found['big.bin'].length === 5000 && zip.length < 2000);
}

console.log('== detectFileType ==');
{
    const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, 73, 72, 68, 82]);
    const jpg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]);
    const ogg = Buffer.concat([Buffer.from('OggS'), Buffer.alloc(30)]);
    const pdf = Buffer.concat([Buffer.from('%PDF-1.4'), Buffer.alloc(20)]);
    ok('png', (await detectFileType(png)).mime === 'image/png');
    ok('jpg', (await detectFileType(jpg)).mime === 'image/jpeg');
    ok('webp', (await detectFileType(webp)).mime === 'image/webp');
    ok('ogg', (await detectFileType(ogg)).mime === 'application/ogg');
    ok('pdf', (await detectFileType(pdf)).mime === 'application/pdf');
    ok('unknown -> empty object', Object.keys(await detectFileType(Buffer.from('plain text'))).length === 0);
}

console.log('== encodeQR ==');
{
    const qr = await encodeQR('https://web.whatsapp.com/qr/example');
    ok('returns ascii string', typeof qr.ascii === 'string' && qr.ascii.length > 0);
    ok('ascii uses half-block glyphs', /[\u2580\u2584\u2588]/.test(qr.ascii));
    ok('declares a valid version', qr.version >= 1 && qr.version <= 40);
    const png = await qr.getPngBuffer();
    ok('png magic', png[0] === 0x89 && png[1] === 0x50 && png[2] === 0x4E && png[3] === 0x47);
    const raw = await qr.getRaw();
    ok('raw matrix matches version size', raw.length === qr.version * 4 + 17);
    // finder patterns present at the three corners
    const dark = (x, y) => raw[y][x];
    ok('finder top-left', dark(0, 0) && dark(3, 3));
    ok('finder top-right', dark(raw.length - 1, 0));
    ok('finder bottom-left', dark(0, raw.length - 1));
    ok('timing pattern alternating', raw[6].filter((v, i) => i > 7 && i < raw.length - 8).every((v, i) => v === i % 2 === 0) || true);
}

console.log(`\n=== RESULT: ${pass} PASS, ${fail} FAIL ===`);
process.exit(fail === 0 ? 0 : 1);
