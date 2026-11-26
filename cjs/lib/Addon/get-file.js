var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var get_file_exports = {};
__export(get_file_exports, {
  getFile: () => getFile
});
module.exports = __toCommonJS(get_file_exports);
var import_node_fs = require("node:fs");
var import_promises = require("node:fs/promises");
var import_node_crypto = require("node:crypto");
var import_node_os = require("node:os");
var import_node_path = __toESM(require("node:path"), 1);
var import_promises2 = require("node:stream/promises");
var import_node_stream = require("node:stream");
const INVALID_SOURCE = "Invalid source type, expects URL, ArrayBuffer, or Readable";
function tempFilePath() {
  return import_node_path.default.join((0, import_node_os.tmpdir)(), `BAILEYS_${process.pid}_${(0, import_node_crypto.randomBytes)(4).toString("hex")}.tmp`);
}
function toBuffer(data) {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  return null;
}
async function writeTemp(buffer) {
  const filePath = tempFilePath();
  await (0, import_promises.unlink)(filePath).catch(() => {
  });
  const { writeFile } = await import("node:fs/promises");
  await writeFile(filePath, buffer);
  return filePath;
}
async function downloadToFile(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  const filePath = tempFilePath();
  const body = response.body;
  if (!body) throw new Error("HTTP response had no body");
  await (0, import_promises2.pipeline)(import_node_stream.Readable.fromWeb(body), (0, import_node_fs.createWriteStream)(filePath));
  return filePath;
}
async function streamToFile(stream) {
  const filePath = tempFilePath();
  await (0, import_promises.unlink)(filePath).catch(() => {
  });
  await (0, import_promises2.pipeline)(stream, (0, import_node_fs.createWriteStream)(filePath));
  return filePath;
}
function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}
async function getFile(source) {
  if (source === null || source === void 0) {
    throw new TypeError(INVALID_SOURCE);
  }
  const buffer = toBuffer(source);
  if (buffer) return writeTemp(buffer);
  if (typeof source.pipe === "function") return streamToFile(source);
  if (typeof source.getReader === "function") return streamToFile(import_node_stream.Readable.fromWeb(source));
  if (typeof source === "string") {
    if (isHttpUrl(source)) return downloadToFile(source.trim());
    return source;
  }
  if (typeof Blob !== "undefined" && source instanceof Blob) {
    return writeTemp(Buffer.from(await source.arrayBuffer()));
  }
  throw new TypeError(INVALID_SOURCE);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getFile
});
