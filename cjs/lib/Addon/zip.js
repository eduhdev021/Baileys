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
var zip_exports = {};
__export(zip_exports, {
  createZip: () => createZip
});
module.exports = __toCommonJS(zip_exports);
var import_node_zlib = require("node:zlib");
var import_crc32 = require("./crc32.js");
const SIG_LOCAL = 67324752;
const SIG_CENTRAL = 33639248;
const SIG_EOCD = 101010256;
const FLAG_UTF8 = 2048;
function dosDateTime(date) {
  const d = date instanceof Date && !isNaN(date) ? date : /* @__PURE__ */ new Date();
  const time = (d.getHours() & 31) << 11 | (d.getMinutes() & 63) << 5 | Math.floor(d.getSeconds() / 2) & 31;
  const day = (d.getFullYear() - 1980 & 127) << 9 | (d.getMonth() + 1 & 15) << 5 | d.getDate() & 31;
  return { time, day };
}
async function normalizeEntry(entry) {
  if (entry === null || entry === void 0) return null;
  let { name, data } = entry;
  if (typeof name !== "string" || name.length === 0) {
    throw new TypeError('createZip: every entry needs a non-empty "name"');
  }
  let date = entry.date instanceof Date ? entry.date : void 0;
  if (data && typeof data.pipe === "function") {
    const chunks = [];
    for await (const chunk of data) chunks.push(chunk);
    data = Buffer.concat(chunks.map((c) => Buffer.isBuffer(c) ? c : Buffer.from(c)));
  } else if (data && typeof data[Symbol.asyncIterator] === "function") {
    const chunks = [];
    for await (const chunk of data) chunks.push(chunk);
    data = Buffer.concat(chunks.map((c) => Buffer.isBuffer(c) ? c : Buffer.from(c)));
  }
  if (data === void 0 || data === null) return null;
  if (typeof data === "string") data = Buffer.from(data, "utf8");
  else if (ArrayBuffer.isView(data)) data = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  else if (data instanceof ArrayBuffer) data = Buffer.from(data);
  else if (!Buffer.isBuffer(data)) throw new TypeError(`createZip: entry "${name}" data must be Buffer/Uint8Array/string/stream`);
  return { name, data, date };
}
async function createZip(entries) {
  if (entries === null || entries === void 0) {
    throw new TypeError("createZip: expected an array of { name, data } entries");
  }
  const list = [];
  if (Array.isArray(entries) || typeof entries[Symbol.iterator] === "function") {
    for (const entry of entries) {
      const normalized = await normalizeEntry(entry);
      if (normalized) list.push(normalized);
    }
  } else if (typeof entries === "object") {
    for (const [name, data] of Object.entries(entries)) {
      const normalized = await normalizeEntry({ name, data });
      if (normalized) list.push(normalized);
    }
  } else {
    throw new TypeError("createZip: expected an array of { name, data } entries");
  }
  const now = dosDateTime(/* @__PURE__ */ new Date());
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of list) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const raw = entry.data;
    const crc = (0, import_crc32.crc32)(raw);
    let method = 0;
    let payload = raw;
    if (raw.length > 32) {
      const deflated = (0, import_node_zlib.deflateRawSync)(raw, { level: 6 });
      if (deflated.length < raw.length) {
        method = 8;
        payload = deflated;
      }
    }
    const { time, day } = entry.date ? dosDateTime(entry.date) : now;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(SIG_LOCAL, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(FLAG_UTF8, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(SIG_CENTRAL, 0);
    central.writeUInt16LE(798, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(FLAG_UTF8, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(384 << 16, 38);
    central.writeUInt32LE(offset, 42);
    localParts.push(local, nameBuf, payload);
    centralParts.push(central, nameBuf);
    offset += local.length + nameBuf.length + payload.length;
  }
  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(SIG_EOCD, 0);
  eocd.writeUInt16LE(list.length, 8);
  eocd.writeUInt16LE(list.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralDir, eocd]);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createZip
});
