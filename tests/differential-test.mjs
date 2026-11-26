/**
 * Regression test: compares the internal pure-TypeScript WACrypto layer
 * against the original `whatsapp-rust-bridge` WASM implementation.
 *
 * Requires `whatsapp-rust-bridge` (the old 0.5.5 WASM package) to be installed
 * as a dev dependency. If it is absent, the test is skipped with a note.
 *
 * Run: node tests/differential-test.mjs
 */
let wasm;
try {
    wasm = await import('whatsapp-rust-bridge');
} catch {
    console.log('SKIP: whatsapp-rust-bridge is not installed — install it once as a dev dependency to run this comparison.');
    process.exit(0);
}
import * as wac from '../lib/WACrypto/index.js';
import { randomBytes } from 'node:crypto';

const hex = (x) => Buffer.from(x).toString('hex');
let pass = 0, fail = 0;
const ok = (name, cond) => {
    if (cond) { pass++; console.log(`  PASS ${name}`); }
    else { fail++; console.log(`  FAIL ${name}`); }
};

console.log('== md5 ==');
for (const len of [0, 1, 64, 1024]) {
    const buf = randomBytes(len);
    ok(`md5(${len}B)`, hex(wasm.md5(buf)) === hex(wac.md5(buf)));
}

console.log('== hkdf ==');
const ikm = randomBytes(48);
const salt = randomBytes(32);
for (const [name, info] of [
    ['obj salt+info', { salt, info: 'ctx' }],
    ['obj info only', { info: 'ctx' }],
    ['obj salt only', { salt }],
    ['obj empty', {}],
    ['string info (classic baileys)', 'WhatsApp']
]) {
    const w = wasm.hkdf(ikm, 112, typeof info === 'string' ? { info } : info);
    const m = wac.hkdf(ikm, 112, info);
    ok(`hkdf(${name})`, hex(w) === hex(m));
}

console.log('== keypairs / agreement / signatures ==');
for (let i = 0; i < 15; i++) {
    const kw = wasm.generateKeyPair();
    const km = wac.generateKeyPair();
    if (i === 0) {
        ok('pubKey 33B prefix 0x05', km.pubKey.length === 33 && km.pubKey[0] === 5);
        ok('privKey 32B clamped', km.privKey.length === 32 && (km.privKey[0] & 248) === km.privKey[0] && (km.privKey[31] & 128) === 0 && (km.privKey[31] & 64) !== 0);
    }
    ok(`getPublicFromPrivateKey #${i}`, hex(wasm.getPublicFromPrivateKey(km.privKey)) === hex(wac.getPublicFromPrivateKey(km.privKey)));
    const s1 = wasm.calculateAgreement(kw.pubKey, km.privKey);
    const s2 = wac.calculateAgreement(kw.pubKey, km.privKey);
    ok(`agreement #${i}`, hex(s1) === hex(s2));
    const msg = randomBytes(Math.floor(Math.random() * 300));
    const sigW = wasm.calculateSignature(km.privKey, msg);
    const sigM = wac.calculateSignature(km.privKey, msg);
    ok(`cross-sign #${i}`,
        wac.verifySignature(km.pubKey, msg, sigW) === true &&
        wasm.verifySignature(km.pubKey, msg, sigM) === true &&
        wac.verifySignature(km.pubKey, msg, sigM) === true);
}

console.log('== expandAppStateKeys ==');
for (const len of [32, 64]) {
    const kd = randomBytes(len);
    const w = wasm.expandAppStateKeys(kd);
    const m = wac.expandAppStateKeys(kd);
    ok(`expandAppStateKeys(${len}B)`, ['indexKey', 'valueEncryptionKey', 'valueMacKey', 'snapshotMacKey', 'patchMacKey']
        .every(k => hex(w[k]) === hex(m[k])));
}

console.log('== LTHash subtractThenAdd ==');
const lt = new wasm.LTHashAntiTampering();
for (let i = 0; i < 10; i++) {
    const hash = randomBytes(128);
    const sub = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => randomBytes(32));
    const add = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => randomBytes(32));
    const w = lt.subtractThenAdd(hash, sub, add);
    const m = new wac.LTHashAntiTampering().subtractThenAdd(hash, sub, add);
    ok(`lthash #${i}`, hex(w) === hex(m));
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
