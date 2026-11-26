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
var file_type_exports = {};
__export(file_type_exports, {
  detectFileType: () => detectFileType
});
module.exports = __toCommonJS(file_type_exports);
var import_promises = require("node:fs/promises");
const SIGNATURES = [
  // Images
  { sig: [137, 80, 78, 71, 13, 10, 26, 10], mime: "image/png", ext: "png" },
  { sig: [255, 216, 255], mime: "image/jpeg", ext: "jpg" },
  { sig: "GIF87a", mime: "image/gif", ext: "gif" },
  { sig: "GIF89a", mime: "image/gif", ext: "gif" },
  { sig: "BM", mime: "image/bmp", ext: "bmp" },
  { sig: [0, 0, 1, 0], mime: "image/x-icon", ext: "ico" },
  // RIFF containers (WEBP/WAV/AVI) — checked together below via container() handlers
  { container: "riff" },
  // ISO BMFF containers (mp4/mov/3gp/m4a) — handled via brand table
  { container: "ftyp" },
  // Matroska
  { sig: [26, 69, 223, 163], container: "ebml" },
  // Ogg
  { sig: "OggS", mime: "application/ogg", ext: "ogx" },
  // Audio
  { sig: "ID3", mime: "audio/mpeg", ext: "mp3" },
  { sig: "fLaC", mime: "audio/flac", ext: "flac" },
  { sig: "#!AMR", mime: "audio/amr", ext: "amr" },
  { sig: "FORM", container: "iff" },
  // Documents / archives
  { sig: "%PDF", mime: "application/pdf", ext: "pdf" },
  { sig: "PK", mime: "application/zip", ext: "zip" },
  { sig: "PK", mime: "application/zip", ext: "zip" },
  { sig: "PK\x07\b", mime: "application/zip", ext: "zip" },
  { sig: [31, 139], mime: "application/gzip", ext: "gz" },
  { sig: [55, 122, 188, 175, 39, 28], mime: "application/x-7z-compressed", ext: "7z" },
  { sig: "Rar!\x07", mime: "application/x-rar-compressed", ext: "rar" },
  { sig: [253, 55, 122, 88, 90, 0], mime: "application/x-xz", ext: "xz" },
  { sig: "BZh", mime: "application/x-bzip2", ext: "bz2" },
  { sig: [37, 33, 80, 83], mime: "application/postscript", ext: "ps" },
  { sig: "\x7FELF", mime: "application/x-executable", ext: "bin" },
  { sig: [202, 254, 186, 190], mime: "application/x-java-applet", ext: "class" },
  { sig: "wOFF", mime: "font/woff", ext: "woff" },
  { sig: "wOF2", mime: "font/woff2", ext: "woff2" },
  { sig: [0, 1, 0, 0], mime: "font/ttf", ext: "ttf" },
  { sig: "OTTO", mime: "font/otf", ext: "otf" }
];
function matchesSig(header, sig) {
  if (typeof sig === "string") sig = [...Buffer.from(sig, "latin1")];
  if (header.length < sig.length) return false;
  return sig.every((byte, i) => header[i] === byte);
}
function fromFtypBrand(header) {
  if (header.length < 12) return null;
  const brand = header.subarray(8, 12).toString("latin1");
  const major = brand;
  if (/^qt/.test(major)) return { mime: "video/quicktime", ext: "mov" };
  if (/^3g?p?/.test(major)) return { mime: "video/3gpp", ext: "3gp" };
  if (/^M4A/.test(major)) return { mime: "audio/mp4", ext: "m4a" };
  if (/^M4V/.test(major)) return { mime: "video/x-m4v", ext: "m4v" };
  return { mime: "video/mp4", ext: "mp4" };
}
function fromRiff(header) {
  if (header.length < 12) return null;
  const type = header.subarray(8, 12).toString("latin1");
  switch (type) {
    case "WEBP":
      return { mime: "image/webp", ext: "webp" };
    case "WAVE":
      return { mime: "audio/wav", ext: "wav" };
    case "AVI ":
      return { mime: "video/x-msvideo", ext: "avi" };
    default:
      return null;
  }
}
function fromEbml(header) {
  const head = header.toString("latin1");
  if (head.includes("webm")) return { mime: "video/webm", ext: "webm" };
  if (head.includes("matroska")) return { mime: "video/x-matroska", ext: "mkv" };
  return { mime: "video/x-matroska", ext: "mkv" };
}
function fromMpegSync(header) {
  if (header.length < 2) return null;
  if (header[0] === 255 && (header[1] & 224) === 224) {
    return { mime: "audio/mpeg", ext: "mp3" };
  }
  return null;
}
function builtinDetect(header) {
  for (const def of SIGNATURES) {
    if (def.container === "riff" && matchesSig(header, "RIFF")) return fromRiff(header);
    if (def.container === "ftyp" && header.length >= 8 && header.subarray(4, 8).toString("latin1") === "ftyp") return fromFtypBrand(header);
    if (def.container === "ebml" && matchesSig(header, def.sig)) return fromEbml(header);
    if (def.container === "iff" && matchesSig(header, "FORM")) {
      const type = header.subarray(8, 12).toString("latin1");
      if (type === "AIFF") return { mime: "audio/aiff", ext: "aiff" };
      return null;
    }
    if (def.sig && matchesSig(header, def.sig)) {
      return { mime: def.mime, ext: def.ext };
    }
  }
  return fromMpegSync(header);
}
async function loadOptionalDetector() {
  try {
    const magic = await import("magic-bytes.js");
    if (typeof magic.filetypemime === "function") {
      return async (buffer) => {
        const mime = magic.filetypemime(buffer);
        return mime ? { mime, ext: extFromMime(mime) } : null;
      };
    }
  } catch {
  }
  try {
    const fileType = await import("file-type");
    const fn = fileType.fileTypeFromBuffer || fileType.default?.fileTypeFromBuffer || fileType.default;
    if (typeof fn === "function") {
      return async (buffer) => {
        const result = await fn(buffer);
        return result ? { mime: result.mime, ext: result.ext } : null;
      };
    }
  } catch {
  }
  return null;
}
function extFromMime(mime) {
  const map = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/tiff": "tif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/x-matroska": "mkv",
    "video/3gpp": "3gp",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "application/ogg": "ogx",
    "audio/flac": "flac",
    "audio/amr": "amr",
    "audio/mp4": "m4a",
    "audio/aiff": "aiff",
    "application/pdf": "pdf",
    "application/zip": "zip",
    "application/gzip": "gz",
    "application/x-7z-compressed": "7z",
    "application/x-rar-compressed": "rar",
    "application/x-bzip2": "bz2",
    "application/x-xz": "xz"
  };
  return map[mime] || (mime.split("/")[1] || "bin").split(";")[0];
}
let optionalDetector;
async function detectFileType(input) {
  let buffer;
  if (typeof input === "string") {
    buffer = await (0, import_promises.readFile)(input);
  } else if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
    buffer = input;
  } else if (input && typeof input.pipe === "function") {
    const chunks = [];
    for await (const chunk of input) chunks.push(chunk);
    buffer = Buffer.concat(chunks);
  } else {
    throw new TypeError("detectFileType: expects a Buffer, Uint8Array or a file path");
  }
  const header = buffer.subarray(0, Math.min(buffer.length, 128));
  if (header.length === 0) return {};
  optionalDetector ||= await loadOptionalDetector();
  if (optionalDetector) {
    try {
      const result = await optionalDetector(buffer);
      if (result) return result;
    } catch {
    }
  }
  const detected = builtinDetect(header);
  return detected ? { ...detected } : {};
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  detectFileType
});
