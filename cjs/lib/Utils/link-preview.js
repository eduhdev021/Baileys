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
var link_preview_exports = {};
__export(link_preview_exports, {
  getUrlInfo: () => getUrlInfo
});
module.exports = __toCommonJS(link_preview_exports);
var import_Addon = require("../Addon/index.js");
var import_messages = require("./messages.js");
var import_messages_media = require("./messages-media.js");
const URL_PROTOCOL_REGEX = /^https?:\/\//;
const THUMBNAIL_WIDTH_PX = 192;
const getCompressedJpegThumbnail = async (url, { thumbnailWidth, fetchOpts }) => {
  const stream = await (0, import_messages_media.getHttpStream)(url, fetchOpts);
  const result = await (0, import_messages_media.extractImageThumb)(stream, thumbnailWidth);
  return result;
};
const getUrlInfo = async (text, opts = {
  thumbnailWidth: THUMBNAIL_WIDTH_PX,
  fetchOpts: { timeout: 3e3 }
}) => {
  try {
    const previewLink = URL_PROTOCOL_REGEX.test(text) ? text : "https://" + text;
    const info = await (0, import_Addon.getLinkPreview)(previewLink, opts.fetchOpts.timeout);
    if (info?.title) {
      const urlInfo = {
        "canonical-url": info.url,
        "matched-text": text,
        title: info.title,
        description: info.description,
        originalThumbnailUrl: info.image,
        "preview-type": info.video ? 1 : 0
      };
      if (opts.uploadImage) {
        await Promise.all([
          (async () => {
            const { imageMessage } = await (0, import_messages.prepareWAMessageMedia)({ image: { url: info.image } }, {
              upload: opts.uploadImage,
              mediaTypeOverride: "thumbnail-link",
              options: opts.fetchOpts
            });
            urlInfo.jpegThumbnail = imageMessage?.jpegThumbnail ? Buffer.from(imageMessage.jpegThumbnail) : void 0;
            urlInfo.highQualityThumbnail = imageMessage;
          })(),
          info.favicon ? (async () => {
            const { imageMessage } = await (0, import_messages.prepareWAMessageMedia)({ image: { url: info.favicon } }, {
              upload: opts.uploadImage,
              mediaTypeOverride: "thumbnail-link",
              options: opts.fetchOpts
            });
            urlInfo.favicon = imageMessage;
          })() : Promise.resolve()
        ]);
      } else {
        try {
          urlInfo.jpegThumbnail = info.image ? (await getCompressedJpegThumbnail(info.image, opts)).buffer : void 0;
        } catch (error) {
          opts.logger?.debug({ err: error.stack, url: previewLink }, "error in generating thumbnail");
        }
      }
      return urlInfo;
    }
  } catch (error) {
    if (!error.message.includes("receive a valid")) {
      throw error;
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getUrlInfo
});
