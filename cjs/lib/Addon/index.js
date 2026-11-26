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
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var index_exports = {};
__export(index_exports, {
  createCache: () => import_cache.createCache,
  createMutex: () => import_mutex.createMutex,
  createQueue: () => import_queue.createQueue,
  createZip: () => import_zip.createZip,
  detectFileType: () => import_file_type.detectFileType,
  detectMediaInfo: () => import_media_info.detectMediaInfo,
  encodeQR: () => import_qr.encodeQR,
  getAudioWaveform: () => import_waveform.getAudioWaveform,
  getFile: () => import_get_file.getFile
});
module.exports = __toCommonJS(index_exports);
var import_cache = require("./cache.js");
var import_mutex = require("./mutex.js");
var import_queue = require("./queue.js");
var import_zip = require("./zip.js");
var import_file_type = require("./file-type.js");
var import_media_info = require("./media-info.js");
var import_qr = require("./qr.js");
var import_waveform = require("./waveform.js");
var import_get_file = require("./get-file.js");
__reExport(index_exports, require("./http-error.js"), module.exports);
__reExport(index_exports, require("./keyed-db.js"), module.exports);
__reExport(index_exports, require("./link-preview.js"), module.exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createCache,
  createMutex,
  createQueue,
  createZip,
  detectFileType,
  detectMediaInfo,
  encodeQR,
  getAudioWaveform,
  getFile,
  ...require("./http-error.js"),
  ...require("./keyed-db.js"),
  ...require("./link-preview.js")
});
