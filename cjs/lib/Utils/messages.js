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
var messages_exports = {};
__export(messages_exports, {
  aggregateMessageKeysNotFromMe: () => aggregateMessageKeysNotFromMe,
  assertMediaContent: () => assertMediaContent,
  downloadMediaMessage: () => downloadMediaMessage,
  extractMessageContent: () => extractMessageContent,
  extractUrlFromText: () => extractUrlFromText,
  generateForwardMessageContent: () => generateForwardMessageContent,
  generateLinkPreviewIfRequired: () => generateLinkPreviewIfRequired,
  generateWAMessage: () => generateWAMessage,
  generateWAMessageContent: () => generateWAMessageContent,
  generateWAMessageFromContent: () => generateWAMessageFromContent,
  getAggregateResponsesInEventMessage: () => getAggregateResponsesInEventMessage,
  getAggregateVotesInPollMessage: () => getAggregateVotesInPollMessage,
  getContentType: () => getContentType,
  getDevice: () => getDevice,
  hasNonNullishProperty: () => hasNonNullishProperty,
  hasOptionalProperty: () => hasOptionalProperty,
  hasValidAlbumMedia: () => hasValidAlbumMedia,
  hasValidCarouselHeader: () => hasValidCarouselHeader,
  hasValidInteractiveHeader: () => hasValidInteractiveHeader,
  isViewOnceMessage: () => isViewOnceMessage,
  markViewOnce: () => markViewOnce,
  normalizeMessageContent: () => normalizeMessageContent,
  prepareDisappearingMessageSettingContent: () => prepareDisappearingMessageSettingContent,
  prepareNativeFlowButtons: () => prepareNativeFlowButtons,
  prepareWAMessageMedia: () => prepareWAMessageMedia,
  shouldIncludeBizBinaryNode: () => shouldIncludeBizBinaryNode,
  updateMessageWithEventResponse: () => updateMessageWithEventResponse,
  updateMessageWithPollUpdate: () => updateMessageWithPollUpdate,
  updateMessageWithReaction: () => updateMessageWithReaction,
  updateMessageWithReceipt: () => updateMessageWithReceipt
});
module.exports = __toCommonJS(messages_exports);
var import_node_crypto = require("node:crypto");
var import_node_fs = require("node:fs");
var import_WAProto = require("../../WAProto/index.js");
var import_Addon = require("../Addon/index.js");
var import_Defaults = require("../Defaults/index.js");
var import_Types = require("../Types/index.js");
var import_WABinary = require("../WABinary/index.js");
var import_crypto = require("./crypto.js");
var import_generics = require("./generics.js");
var import_messages_media = require("./messages-media.js");
var import_rich_message_utils = require("./rich-message-utils.js");
var import_reporting_utils = require("./reporting-utils.js");
var import_buttons = require("./buttons.js");
const MIMETYPE_MAP = {
  image: "image/jpeg",
  video: "video/mp4",
  document: "application/pdf",
  audio: "audio/ogg; codecs=opus",
  sticker: "image/webp",
  "product-catalog-image": "image/jpeg"
};
const extractUrlFromText = (text) => text.match(import_Defaults.URL_REGEX)?.[0];
const generateLinkPreviewIfRequired = async (text, getUrlInfo, logger) => {
  const url = extractUrlFromText(text);
  if (!!getUrlInfo && url) {
    try {
      const urlInfo = await getUrlInfo(url);
      return urlInfo;
    } catch (error) {
      logger?.warn({ trace: error.stack }, "url generation failed");
    }
  }
};
const ensureMessageProto = (m) => {
  if (m instanceof import_Types.WAProto.Message)
    return m;
  return import_Types.WAProto.Message.fromObject(m);
};
const assertColor = (color) => {
  if (typeof color === "number") {
    return color < 0 ? 4294967295 + color + 1 : color;
  }
  let hex = color.trim();
  if (hex.charCodeAt(0) === 35) {
    hex = hex.slice(1);
  }
  if (hex.length <= 6) {
    hex = hex.padStart(6, "0");
    hex = "FF" + hex;
  }
  return parseInt(hex, 16);
};
const prepareWAMessageMedia = async (message, options) => {
  const logger = options.logger;
  let mediaType;
  for (const key of import_Defaults.MEDIA_KEYS) {
    if (key in message) {
      mediaType = key;
      break;
    }
  }
  if (!mediaType) {
    throw new import_Addon.HttpError("Invalid media type", { statusCode: 400 });
  }
  const uploadData = {
    ...message,
    media: message[mediaType]
  };
  delete uploadData[mediaType];
  const cacheableKey = typeof uploadData.media === "object" && "url" in uploadData.media && !!uploadData.media.url && !!options.mediaCache && mediaType + ":" + uploadData.media.url.toString();
  if (mediaType === "document" && !uploadData.fileName) {
    uploadData.fileName = import_Defaults.LIBRARY_NAME;
  }
  if (cacheableKey) {
    const mediaBuff = await options.mediaCache.get(cacheableKey);
    if (mediaBuff) {
      logger?.debug({ cacheableKey }, "got media cache hit");
      const obj2 = import_WAProto.proto.Message.decode(mediaBuff);
      const key = `${mediaType}Message`;
      Object.assign(obj2[key], { ...uploadData, media: void 0 });
      return obj2;
    }
  }
  const isNewsletter = (0, import_WABinary.isJidNewsletter)(options.jid);
  const requiresMimetypeDetection = uploadData.mimetype == null;
  const requiresThumbnailComputation = (mediaType === "image" || mediaType === "video") && uploadData.jpegThumbnail == null;
  const requiresDurationComputation = mediaType === "audio" && uploadData.seconds == null;
  const requiresWaveformProcessing = mediaType === "audio" && uploadData.ptt === true && uploadData.waveform == null;
  const requiresAudioBackground = options.backgroundColor && mediaType === "audio" && uploadData.ptt === true;
  if (isNewsletter) {
    logger?.info({ key: cacheableKey }, "Preparing raw media for newsletter");
    const { filePath, fileSha256: fileSha2562, fileLength: fileLength2 } = await (0, import_messages_media.getRawMediaUploadData)(uploadData.media, options.mediaTypeOverride || mediaType, logger);
    const fileSha256B64 = fileSha2562.toString("base64");
    const [{ mediaUrl: mediaUrl2, directPath: directPath2, thumbnailDirectPath, thumbnailSha256 }] = await Promise.all([
      (async () => {
        const result = await options.upload(filePath, {
          fileEncSha256B64: fileSha256B64,
          mediaType,
          timeoutMs: options.mediaUploadTimeoutMs,
          newsletter: isNewsletter
        });
        logger?.debug({ mediaType, cacheableKey }, "uploaded media");
        return result;
      })(),
      (async () => {
        try {
          if (requiresMimetypeDetection) {
            const { mime } = uploadData.ptt === true ? { mime: MIMETYPE_MAP["audio"] } : await (0, import_Addon.detectFileType)(filePath);
            uploadData.mimetype = mime || MIMETYPE_MAP[mediaType];
            logger?.debug("detected media mime");
          }
          if (requiresDurationComputation || requiresWaveformProcessing) {
            const computedData = await (0, import_messages_media.getAudioData)(filePath, logger);
            if (computedData) {
              uploadData.seconds = computedData.durationSeconds;
              uploadData.waveform = computedData.waveform;
            }
            logger?.debug("computed audio data");
          }
          if (requiresAudioBackground) {
            uploadData.backgroundArgb = assertColor(options.backgroundColor);
            logger?.debug("computed backgroundColor audio");
          }
        } catch (error) {
          logger?.warn({ trace: error.stack }, "failed to obtain extra info");
        }
      })()
    ]).finally(async () => {
      try {
        await import_node_fs.promises.unlink(filePath);
        logger?.debug("removed tmp files");
      } catch (error) {
        logger?.warn("failed to remove tmp file");
      }
    });
    const obj2 = ensureMessageProto({
      // todo: add more support here
      [`${mediaType}Message`]: {
        url: mediaUrl2,
        directPath: directPath2,
        fileSha256: fileSha2562,
        fileLength: fileLength2,
        thumbnailDirectPath,
        thumbnailSha256,
        ...uploadData,
        media: void 0
      }
    });
    if (uploadData.ptv) {
      obj2.ptvMessage = obj2.videoMessage;
      delete obj2.videoMessage;
    }
    if (obj2.stickerMessage) {
      obj2.stickerMessage.stickerSentTs = Date.now();
    }
    if (cacheableKey) {
      logger?.debug({ cacheableKey }, "set cache");
      await options.mediaCache.set(cacheableKey, import_Types.WAProto.Message.encode(obj2).finish());
    }
    return obj2;
  }
  const requiresOriginalForSomeProcessing = requiresMimetypeDetection || requiresDurationComputation || requiresWaveformProcessing || requiresThumbnailComputation;
  const { mediaKey, encFilePath, originalFilePath, fileEncSha256, fileSha256, fileLength } = await (0, import_messages_media.encryptedStream)(uploadData.media, options.mediaTypeOverride || mediaType, {
    logger,
    saveOriginalFileIfRequired: requiresOriginalForSomeProcessing,
    opts: options.options
  });
  const fileEncSha256B64 = fileEncSha256.toString("base64");
  const [{ mediaUrl, directPath }] = await Promise.all([
    (async () => {
      const result = await options.upload(encFilePath, {
        fileEncSha256B64,
        mediaType,
        timeoutMs: options.mediaUploadTimeoutMs
      });
      logger?.debug({ mediaType, cacheableKey }, "uploaded media");
      return result;
    })(),
    (async () => {
      try {
        if (requiresThumbnailComputation) {
          const { thumbnail, originalImageDimensions } = await (0, import_messages_media.generateThumbnail)(originalFilePath, mediaType, options);
          uploadData.jpegThumbnail = thumbnail;
          if (!uploadData.width && originalImageDimensions) {
            uploadData.width = originalImageDimensions.width;
            uploadData.height = originalImageDimensions.height;
            logger?.debug("set dimensions");
          }
          logger?.debug("generated thumbnail");
        }
        if (requiresMimetypeDetection) {
          const { mime } = uploadData.ptt === true ? { mime: MIMETYPE_MAP["audio"] } : await (0, import_Addon.detectFileType)(originalFilePath);
          uploadData.mimetype = mime || MIMETYPE_MAP[mediaType];
          logger?.debug("detected media mime");
        }
        if (requiresDurationComputation || requiresWaveformProcessing) {
          const computedData = await (0, import_messages_media.getAudioData)(originalFilePath, logger);
          if (computedData) {
            uploadData.seconds = computedData.durationSeconds;
            uploadData.waveform = computedData.waveform;
          }
          logger?.debug("computed audio data");
        }
        if (requiresAudioBackground) {
          uploadData.backgroundArgb = assertColor(options.backgroundColor);
          logger?.debug("computed backgroundColor audio");
        }
      } catch (error) {
        logger?.warn({ trace: error.stack }, "failed to obtain extra info");
      }
    })()
  ]).finally(async () => {
    try {
      await import_node_fs.promises.unlink(encFilePath);
      if (originalFilePath) {
        await import_node_fs.promises.unlink(originalFilePath);
      }
      logger?.debug("removed tmp files");
    } catch (error) {
      logger?.warn("failed to remove tmp file");
    }
  });
  const obj = ensureMessageProto({
    [`${mediaType}Message`]: {
      url: mediaUrl,
      directPath,
      mediaKey,
      fileEncSha256,
      fileSha256,
      fileLength,
      mediaKeyTimestamp: (0, import_generics.unixTimestampSeconds)(),
      ...uploadData,
      media: void 0
    }
  });
  if (uploadData.ptv) {
    obj.ptvMessage = obj.videoMessage;
    delete obj.videoMessage;
  }
  if (cacheableKey) {
    logger?.debug({ cacheableKey }, "set cache");
    await options.mediaCache.set(cacheableKey, import_Types.WAProto.Message.encode(obj).finish());
  }
  return obj;
};
const prepareProductMessage = async (message, options) => {
  if (!message.businessOwnerJid) {
    throw new import_Addon.HttpError('"businessOwnerJid" is missing from the content', { statusCode: 400 });
  }
  const { imageMessage } = await prepareWAMessageMedia({ image: message.image || message.product.productImage }, options);
  const { image, ...content } = message;
  content.product = {
    currencyCode: "IDR",
    priceAmount1000: 1e3,
    title: import_Defaults.LIBRARY_NAME,
    ...message.product,
    productImage: imageMessage
  };
  return content;
};
const prepareStickerPackMessage = async (message, options) => {
  const { cover, stickers = [], name = "\u{1F4E6} Sticker Pack", publisher = "GitHub: eduh_dev021", description = "\u{1F3F7}\uFE0F eduh_dev021/baileys" } = message;
  if (stickers.length > 60) {
    throw new import_Addon.HttpError("Sticker pack exceeds the maximum limit of 60 stickers", { statusCode: 400 });
  }
  if (stickers.length === 0) {
    throw new import_Addon.HttpError("Sticker pack must contain at least one sticker", { statusCode: 400 });
  }
  if (!cover) {
    throw new import_Addon.HttpError("Sticker pack must contain a cover", { statusCode: 400 });
  }
  const logger = options.logger;
  let cacheableKey = false;
  if (Array.isArray(stickers) && stickers.length && options.mediaCache) {
    const urls = [];
    for (let i = 0; i < stickers.length; i++) {
      const data = stickers[i].data;
      if (typeof data === "object" && data?.url) {
        urls.push(data.url);
      }
    }
    if (urls.length > 0) {
      cacheableKey = "sticker:" + urls.join("@");
    }
  }
  if (cacheableKey) {
    const mediaBuff = await options.mediaCache.get(cacheableKey);
    if (mediaBuff) {
      logger?.debug({ cacheableKey }, "got media cache hit");
      return import_WAProto.proto.Message.decode(mediaBuff);
    }
  }
  const lib = await (0, import_messages_media.getImageProcessingLibrary)();
  const hasSharp = "sharp" in lib && !!lib.sharp?.default;
  const hasImage = "image" in lib && !!lib.image?.Transformer;
  const hasJimp = "jimp" in lib && !!lib.jimp?.Jimp;
  if (!hasSharp && !hasImage) {
    throw new import_Addon.HttpError("No image processing library (sharp or @napi-rs/image) available for converting sticker to WebP.");
  }
  const isNewsletter = (0, import_WABinary.isJidNewsletter)(options.jid);
  const stickerPackIdValue = (0, import_generics.generateMessageIDV2)();
  const stickerData = new Array(stickers.length);
  const stickerMetadata = new Array(stickers.length);
  await Promise.all(stickers.map(async (sticker, index) => {
    const { stream } = await (0, import_messages_media.getStream)(sticker.data);
    const buffer = await (0, import_messages_media.toBuffer)(stream);
    let webpBuffer;
    let isAnimated = false;
    if (isWebPBuffer(buffer)) {
      webpBuffer = buffer;
      isAnimated = isAnimatedWebP(buffer);
    } else if (hasSharp) {
      webpBuffer = await lib.sharp.default(buffer).resize(512, 512, { fit: "inside" }).webp({ quality: 80 }).toBuffer();
    } else {
      webpBuffer = await new lib.image.Transformer(buffer).resize(512, 512).webp(80);
    }
    if (webpBuffer.length > 1024 * 1024) {
      throw new import_Addon.HttpError(`Sticker at index ${index} exceeds the 1MB size limit`, { statusCode: 400 });
    }
    const hash = (0, import_crypto.sha256)(webpBuffer).toString("base64").replace(/\//g, "-");
    const fileName = `${hash}.webp`;
    stickerData[index] = {
      name: fileName,
      data: webpBuffer
    };
    stickerMetadata[index] = {
      fileName,
      mimetype: "image/webp",
      isAnimated,
      isLottie: sticker.isLottie || false,
      emojis: sticker.emojis || ["\u2728"],
      accessibilityLabel: sticker.accessibilityLabel || "\u200E"
    };
  }));
  const trayIconFileName = `${stickerPackIdValue}.webp`;
  const { stream: coverStream } = await (0, import_messages_media.getStream)(cover);
  const coverBuffer = await (0, import_messages_media.toBuffer)(coverStream);
  let coverWebpBuffer;
  if (isWebPBuffer(coverBuffer)) {
    coverWebpBuffer = coverBuffer;
  } else if (hasSharp) {
    coverWebpBuffer = await lib.sharp.default(coverBuffer).resize(512, 512, { fit: "inside" }).webp({ quality: 80 }).toBuffer();
  } else {
    coverWebpBuffer = await new lib.image.Transformer(coverBuffer).resize(512, 512).webp(80);
  }
  stickerData[stickers.length] = {
    name: trayIconFileName,
    data: coverWebpBuffer
  };
  const zipBuffer = await (0, import_Addon.createZip)(stickerData);
  const { encFilePath, filePath, fileEncSha256, fileSha256, mediaKey, fileLength } = isNewsletter ? await (0, import_messages_media.getRawMediaUploadData)(zipBuffer, "sticker-pack", logger) : await (0, import_messages_media.encryptedStream)(zipBuffer, "sticker-pack", {
    logger,
    opts: options.options
  });
  let stickerPackUploadResult;
  try {
    stickerPackUploadResult = await options.upload(encFilePath || filePath, {
      fileEncSha256B64: (fileEncSha256 || fileSha256).toString("base64"),
      mediaType: "sticker-pack",
      timeoutMs: options.mediaUploadTimeoutMs,
      newsletter: isNewsletter
    });
  } finally {
    await import_node_fs.promises.unlink(encFilePath || filePath).catch(() => logger?.warn("failed to remove tmp file"));
  }
  const obj = {
    name,
    publisher,
    stickerPackId: stickerPackIdValue,
    packDescription: description,
    stickerPackOrigin: import_WAProto.proto.Message.StickerPackMessage.StickerPackOrigin.USER_CREATED,
    stickerPackSize: zipBuffer.length,
    stickers: stickerMetadata,
    fileSha256,
    fileEncSha256,
    mediaKey,
    directPath: stickerPackUploadResult.directPath,
    fileLength,
    mediaKeyTimestamp: (0, import_generics.unixTimestampSeconds)(),
    trayIconFileName
  };
  try {
    let thumbnailBuffer;
    if (hasSharp) {
      thumbnailBuffer = await lib.sharp.default(coverBuffer).resize(252, 252).jpeg().toBuffer();
    } else if (hasImage) {
      thumbnailBuffer = await new lib.image.Transformer(coverBuffer).resize(252, 252).jpeg();
    } else if (hasJimp) {
      const jimpImage = await lib.jimp.Jimp.read(coverBuffer);
      thumbnailBuffer = await jimpImage.resize({ w: 252, h: 252 }).getBuffer("image/jpeg");
    } else {
      throw new Error("No image processing library available for thumbnail generation");
    }
    if (!thumbnailBuffer || thumbnailBuffer.length === 0) {
      throw new Error("Failed to generate thumbnail buffer");
    }
    const thumbUpload = isNewsletter ? await await (0, import_messages_media.getRawMediaUploadData)(thumbnailBuffer, "thumbnail-sticker-pack", logger) : await (0, import_messages_media.encryptedStream)(thumbnailBuffer, "thumbnail-sticker-pack", {
      logger,
      opts: options.options,
      mediaKey
    });
    let thumbUploadResult;
    try {
      thumbUploadResult = await options.upload(thumbUpload.encFilePath || thumbUpload.filePath, {
        fileEncSha256B64: (thumbUpload.fileEncSha256 || thumbUpload.fileSha256).toString("base64"),
        mediaType: "thumbnail-sticker-pack",
        timeoutMs: options.mediaUploadTimeoutMs,
        newsletter: isNewsletter
      });
    } finally {
      await import_node_fs.promises.unlink(thumbUpload.encFilePath || thumbUpload.filePath).catch(() => logger?.warn("failed to remove tmp file"));
    }
    Object.assign(obj, {
      thumbnailDirectPath: thumbUploadResult.directPath,
      thumbnailSha256: thumbUpload.fileSha256,
      thumbnailEncSha256: thumbUpload.fileEncSha256,
      thumbnailHeight: 252,
      thumbnailWidth: 252,
      imageDataHash: (0, import_crypto.sha256)(thumbnailBuffer).toString("base64")
    });
  } catch (error) {
    logger?.warn(`Thumbnail generation failed: ${error}`);
  }
  const payload = ensureMessageProto({ stickerPackMessage: obj });
  if (cacheableKey) {
    logger?.debug({ cacheableKey }, "set cache (background)");
    options.mediaCache.set(cacheableKey, import_Types.WAProto.Message.encode(payload).finish());
  }
  return payload;
};
const prepareNativeFlowButtons = (message) => {
  const buttons = message.nativeFlow;
  const isButtonsFieldArray = Array.isArray(buttons);
  const correctedField = isButtonsFieldArray ? buttons : buttons.buttons;
  const messageParamsJson = {};
  if (hasOptionalProperty(message, "offerText") && !!message.offerText) {
    Object.assign(messageParamsJson, {
      limited_time_offer: {
        text: message.offerText || import_Defaults.LIBRARY_NAME,
        url: message.offerUrl || import_Defaults.DONATE_URL,
        // Apologies if this feels cheeky, just a fallback
        copy_code: message.offerCode,
        expiration_time: message.offerExpiration
      }
    });
  }
  if (hasOptionalProperty(message, "optionText") && !!message.optionText) {
    Object.assign(messageParamsJson, {
      bottom_sheet: {
        in_thread_buttons_limit: 1,
        divider_indices: Array.from({ length: correctedField.length }, (_, index) => index),
        list_title: message.optionTitle || "\u{1F4C4} Select Options",
        button_title: message.optionText
      }
    });
  }
  return {
    buttons: (0, import_buttons.buildNativeButtons)(correctedField),
    messageParamsJson: JSON.stringify(messageParamsJson)
  };
};
const prepareDisappearingMessageSettingContent = (ephemeralExpiration) => {
  ephemeralExpiration = ephemeralExpiration || 0;
  const content = {
    ephemeralMessage: {
      message: {
        protocolMessage: {
          type: import_Types.WAProto.Message.ProtocolMessage.Type.EPHEMERAL_SETTING,
          ephemeralExpiration
        }
      }
    }
  };
  return ensureMessageProto(content);
};
const generateForwardMessageContent = (message, forceForward) => {
  let content = message.message;
  if (!content) {
    throw new import_Addon.HttpError("no content in message", { statusCode: 400 });
  }
  content = normalizeMessageContent(content);
  content = import_WAProto.proto.Message.decode(import_WAProto.proto.Message.encode(content).finish());
  let key = Object.keys(content)[0];
  let score = content?.[key]?.contextInfo?.forwardingScore || 0;
  score += message.key.fromMe && !forceForward ? 0 : 1;
  if (key === "conversation") {
    content.extendedTextMessage = { text: content[key] };
    delete content.conversation;
    key = "extendedTextMessage";
  }
  const key_ = content?.[key];
  if (score > 0) {
    key_.contextInfo = { forwardingScore: score, isForwarded: true };
  } else {
    key_.contextInfo = {};
  }
  return content;
};
const hasNonNullishProperty = (message, key) => {
  return message != null && typeof message === "object" && key in message && message[key] != null;
};
const hasOptionalProperty = (obj, key) => {
  return obj != null && typeof obj === "object" && key in obj && obj[key] != null;
};
const hasValidAlbumMedia = (message) => {
  return !!(message.imageMessage || message.videoMessage);
};
const hasValidInteractiveHeader = (message) => {
  return !!(message.imageMessage || message.videoMessage || message.documentMessage || message.productMessage || message.locationMessage);
};
const hasValidCarouselHeader = (message) => {
  return !!(message.imageMessage || message.videoMessage || message.productMessage);
};
const markViewOnce = (m) => {
  const type = getContentType(m);
  if (!type)
    return;
  const content = m[type];
  if (!content || typeof content !== "object")
    return;
  const MessageType = import_Types.WAProto.Message[type.charAt(0).toUpperCase() + type.slice(1)];
  if (!MessageType?.prototype || !("viewOnce" in MessageType.prototype))
    return;
  content.viewOnce = true;
};
const generateWAMessageContent = async (message, options) => {
  var _a, _b;
  let m = {};
  if (hasNonNullishProperty(message, "raw")) {
    delete message.raw;
    return message;
  } else if (hasNonNullishProperty(message, "code") || hasNonNullishProperty(message, "links") || hasNonNullishProperty(message, "table") || hasNonNullishProperty(message, "richResponse")) {
    m = (0, import_rich_message_utils.prepareRichResponseMessage)(message);
  } else if (hasNonNullishProperty(message, "text")) {
    const extContent = { text: message.text };
    let urlInfo = message.linkPreview;
    if (urlInfo == null) {
      urlInfo = await generateLinkPreviewIfRequired(message.text, options.getUrlInfo, options.logger);
    }
    if (urlInfo) {
      extContent.matchedText = urlInfo["matched-text"];
      extContent.jpegThumbnail = urlInfo.jpegThumbnail;
      extContent.description = urlInfo.description;
      extContent.title = urlInfo.title;
      extContent.previewType = urlInfo.previewType ?? urlInfo["preview-type"] ?? 0;
      extContent.linkPreviewMetadata = urlInfo.linkPreviewMetadata;
      const img = urlInfo.highQualityThumbnail;
      if (img) {
        extContent.thumbnailDirectPath = img.directPath;
        extContent.mediaKey = img.mediaKey;
        extContent.mediaKeyTimestamp = img.mediaKeyTimestamp;
        extContent.thumbnailWidth = img.width;
        extContent.thumbnailHeight = img.height;
        extContent.thumbnailSha256 = img.fileSha256;
        extContent.thumbnailEncSha256 = img.fileEncSha256;
      }
    }
    const customFavicon = message.favicon;
    const favicon = customFavicon && typeof options.upload === "function" ? (await prepareWAMessageMedia({ image: customFavicon }, options)).imageMessage : urlInfo?.favicon;
    if (favicon) {
      extContent.faviconMmsMetadata = {
        thumbnailDirectPath: favicon.directPath,
        mediaKey: favicon.mediaKey,
        mediaKeyTimestamp: favicon.mediaKeyTimestamp,
        thumbnailWidth: 32,
        thumbnailHeight: 32,
        thumbnailSha256: favicon.fileSha256,
        thumbnailEncSha256: favicon.fileEncSha256
      };
    }
    if (options.backgroundColor) {
      extContent.backgroundArgb = assertColor(options.backgroundColor);
    }
    if (options.font) {
      extContent.font = options.font;
    }
    m.extendedTextMessage = extContent;
  } else if (hasNonNullishProperty(message, "contacts")) {
    const contactLen = message.contacts.contacts.length;
    if (!contactLen) {
      throw new import_Addon.HttpError("require atleast 1 contact", { statusCode: 400 });
    }
    if (contactLen === 1) {
      m.contactMessage = message.contacts.contacts[0];
    } else {
      m.contactsArrayMessage = message.contacts;
    }
  } else if (hasNonNullishProperty(message, "location")) {
    m.locationMessage = message.location;
  } else if (hasNonNullishProperty(message, "react")) {
    if (!message.react.senderTimestampMs) {
      message.react.senderTimestampMs = Date.now();
    }
    m.reactionMessage = message.react;
  } else if (hasNonNullishProperty(message, "delete")) {
    m.protocolMessage = {
      key: message.delete,
      type: import_Types.WAProto.Message.ProtocolMessage.Type.REVOKE
    };
  } else if (hasNonNullishProperty(message, "forward")) {
    m = generateForwardMessageContent(message.forward, message.force);
  } else if (hasNonNullishProperty(message, "disappearingMessagesInChat")) {
    const exp = typeof message.disappearingMessagesInChat === "boolean" ? message.disappearingMessagesInChat ? import_Defaults.WA_DEFAULT_EPHEMERAL : 0 : message.disappearingMessagesInChat;
    m = prepareDisappearingMessageSettingContent(exp);
  } else if (hasNonNullishProperty(message, "groupInvite")) {
    m.groupInviteMessage = {};
    m.groupInviteMessage.inviteCode = message.groupInvite.inviteCode;
    m.groupInviteMessage.inviteExpiration = message.groupInvite.inviteExpiration;
    m.groupInviteMessage.caption = message.groupInvite.text;
    m.groupInviteMessage.groupJid = message.groupInvite.jid;
    m.groupInviteMessage.groupName = message.groupInvite.subject;
    if (options.getProfilePicUrl) {
      const pfpUrl = await options.getProfilePicUrl(message.groupInvite.jid, "preview");
      if (pfpUrl) {
        const resp = await fetch(pfpUrl, { method: "GET", dispatcher: options?.options?.dispatcher });
        if (resp.ok) {
          const buf = Buffer.from(await resp.arrayBuffer());
          m.groupInviteMessage.jpegThumbnail = buf;
        }
      }
    }
  } else if (hasNonNullishProperty(message, "pin")) {
    m.pinInChatMessage = {};
    m.messageContextInfo = {};
    m.pinInChatMessage.key = message.pin;
    m.pinInChatMessage.type = message.type;
    m.pinInChatMessage.senderTimestampMs = Date.now();
    m.messageContextInfo.messageAddOnDurationInSecs = message.type === 1 ? message.time || 86400 : 0;
  } else if (hasNonNullishProperty(message, "keep")) {
    m.keepInChatMessage = {};
    m.keepInChatMessage.key = message.keep;
    m.keepInChatMessage.keepType = message.type;
    m.keepInChatMessage.timestampMs = Date.now();
  } else if (hasNonNullishProperty(message, "flowReply")) {
    m.interactiveResponseMessage = {
      body: {
        format: message.flowReply.format || import_WAProto.proto.Message.InteractiveResponseMessage.Body.Format.DEFAULT,
        text: message.flowReply.text
      },
      nativeFlowResponseMessage: {
        name: message.flowReply.name,
        paramsJson: message.flowReply.paramsJson || "{}",
        version: message.flowReply.version || 1
      }
    };
  } else if (hasNonNullishProperty(message, "buttonReply")) {
    switch (message.type) {
      case "template":
        m.templateButtonReplyMessage = {
          selectedDisplayText: message.buttonReply.displayText,
          selectedId: message.buttonReply.id,
          selectedIndex: message.buttonReply.index
        };
        break;
      case "plain":
        m.buttonsResponseMessage = {
          selectedButtonId: message.buttonReply.id,
          selectedDisplayText: message.buttonReply.displayText,
          type: import_WAProto.proto.Message.ButtonsResponseMessage.Type.DISPLAY_TEXT
        };
        break;
    }
  } else if (hasNonNullishProperty(message, "listReply")) {
    m.listResponseMessage = {
      description: message.listReply.description,
      listType: import_WAProto.proto.Message.ListResponseMessage.ListType.SINGLE_SELECT,
      singleSelectReply: {
        selectedRowId: message.listReply.id
      },
      title: message.listReply.title
    };
  } else if (hasOptionalProperty(message, "ptv") && message.ptv) {
    const { videoMessage } = await prepareWAMessageMedia({ video: message.video }, options);
    m.ptvMessage = videoMessage;
  } else if (hasNonNullishProperty(message, "product")) {
    m.productMessage = await prepareProductMessage(message, options);
  } else if (hasNonNullishProperty(message, "event")) {
    m.eventMessage = {};
    const startTime = Math.floor(message.event.startDate.getTime() / 1e3);
    if (message.event.call && options.getCallLink) {
      const token = await options.getCallLink(message.event.call, { startTime });
      m.eventMessage.joinLink = (message.event.call === "audio" ? import_Defaults.CALL_AUDIO_PREFIX : import_Defaults.CALL_VIDEO_PREFIX) + token;
    }
    m.messageContextInfo = {
      // encKey
      messageSecret: message.event.messageSecret || (0, import_node_crypto.randomBytes)(32)
    };
    m.eventMessage.name = message.event.name;
    m.eventMessage.description = message.event.description;
    m.eventMessage.startTime = startTime;
    m.eventMessage.endTime = message.event.endDate ? message.event.endDate.getTime() / 1e3 : void 0;
    m.eventMessage.isCanceled = message.event.isCancelled ?? false;
    m.eventMessage.extraGuestsAllowed = message.event.extraGuestsAllowed;
    m.eventMessage.isScheduleCall = message.event.isScheduleCall ?? false;
    m.eventMessage.location = message.event.location;
  } else if (hasNonNullishProperty(message, "poll")) {
    (_a = message.poll).selectableCount || (_a.selectableCount = 0);
    (_b = message.poll).toAnnouncementGroup || (_b.toAnnouncementGroup = false);
    if (!Array.isArray(message.poll.values)) {
      throw new import_Addon.HttpError("Invalid poll values", { statusCode: 400 });
    }
    if (message.poll.selectableCount < 0 || message.poll.selectableCount > message.poll.values.length) {
      throw new import_Addon.HttpError(`poll.selectableCount in poll should be >= 0 and <= ${message.poll.values.length}`, {
        statusCode: 400
      });
    }
    const pollCreationMessage = {
      name: message.poll.name,
      selectableOptionsCount: message.poll.selectableCount,
      options: message.poll.values.map((optionName) => ({ optionName })),
      endTime: message.poll.endDate ? message.poll.endDate.getTime() : void 0,
      hideParticipantName: message.poll.hideVoter ?? false,
      allowAddOption: message.poll.canAddOption ?? false
    };
    if (message.poll.toAnnouncementGroup) {
      m.pollCreationMessageV2 = pollCreationMessage;
    } else {
      if (message.poll.pollType === 1) {
        if (!message.poll.correctAnswer) {
          throw new import_Addon.HttpError('No "correctAnswer" provided for quiz', { statusCode: 400 });
        }
        m.pollCreationMessageV5 = {
          // quiz for newsletter only
          ...pollCreationMessage,
          correctAnswer: {
            optionName: message.poll.correctAnswer.toString()
          },
          pollType: 1,
          selectableOptionsCount: 1
        };
      } else if (message.poll.selectableCount === 1) {
        m.pollCreationMessageV3 = pollCreationMessage;
      } else {
        m.pollCreationMessage = pollCreationMessage;
      }
    }
    m.messageContextInfo = {
      // encKey
      messageSecret: message.poll.messageSecret || (0, import_node_crypto.randomBytes)(32)
    };
  } else if (hasNonNullishProperty(message, "pollResult")) {
    const pollResultSnapshotMessage = {
      name: message.pollResult.name,
      pollVotes: message.pollResult.votes.map((vote) => ({
        optionName: vote.name,
        optionVoteCount: parseInt(vote.voteCount)
      }))
    };
    if (message.pollResult.pollType === 1) {
      pollResultSnapshotMessage.pollType = import_WAProto.proto.Message.PollType.QUIZ;
      m.pollResultSnapshotMessageV3 = pollResultSnapshotMessage;
    } else {
      pollResultSnapshotMessage.pollType = import_WAProto.proto.Message.PollType.POLL;
      m.pollResultSnapshotMessage = pollResultSnapshotMessage;
    }
  } else if (hasNonNullishProperty(message, "pollUpdate")) {
    if (!message.pollUpdate.key) {
      throw new import_Addon.HttpError("Message key is required", { statusCode: 400 });
    }
    if (!message.pollUpdate.vote) {
      throw new import_Addon.HttpError("Encrypted vote payload is required", { statusCode: 400 });
    }
    m.pollUpdateMessage = {
      metadata: message.pollUpdate.metadata,
      pollCreationMessageKey: message.pollUpdate.key,
      senderTimestampMs: Date.now(),
      vote: message.pollUpdate.vote
    };
  } else if (hasNonNullishProperty(message, "paymentInviteServiceType")) {
    m.paymentInviteMessage = {
      expiryTimestamp: Date.now(),
      serviceType: message.paymentInviteServiceType
    };
  } else if (hasNonNullishProperty(message, "orderText")) {
    if (!Buffer.isBuffer(message.thumbnail)) {
      throw new import_Addon.HttpError("Must provide thumbnail buffer in order message", { statusCode: 400 });
    }
    m.orderMessage = {
      itemCount: 1,
      messageVersion: 1,
      orderTitle: import_Defaults.LIBRARY_NAME,
      status: import_WAProto.proto.Message.OrderMessage.OrderStatus.INQUIRY,
      surface: import_WAProto.proto.Message.OrderMessage.OrderSurface.CATALOG,
      token: (0, import_generics.generateMessageIDV2)(),
      totalAmount1000: 1e3,
      totalCurrencyCode: "IDR",
      ...message,
      message: message.orderText
    };
    delete m.orderMessage.orderText;
  } else if (hasNonNullishProperty(message, "album")) {
    if (!Array.isArray(message.album)) {
      throw new import_Addon.HttpError("Invalid album type. Expected an array.", { statusCode: 400 });
    }
    let videoCount = 0;
    for (let i = 0; i < message.album.length; i++) {
      if (message.album[i].video)
        videoCount++;
    }
    ;
    let imageCount = 0;
    for (let i = 0; i < message.album.length; i++) {
      if (message.album[i].image)
        imageCount++;
    }
    ;
    if (videoCount + imageCount < 2) {
      throw new import_Addon.HttpError("Minimum provide 2 media to upload album message", { statusCode: 400 });
    }
    m.albumMessage = {
      expectedImageCount: imageCount,
      expectedVideoCount: videoCount
    };
  } else if (hasNonNullishProperty(message, "sharePhoneNumber")) {
    m.protocolMessage = {
      type: import_WAProto.proto.Message.ProtocolMessage.Type.SHARE_PHONE_NUMBER
    };
  } else if (hasNonNullishProperty(message, "requestPhoneNumber")) {
    m.requestPhoneNumberMessage = {};
  } else if (hasNonNullishProperty(message, "limitSharing")) {
    m.protocolMessage = {
      type: import_WAProto.proto.Message.ProtocolMessage.Type.LIMIT_SHARING,
      limitSharing: {
        sharingLimited: message.limitSharing === true,
        trigger: 1,
        limitSharingSettingTimestamp: Date.now(),
        initiatedByMe: true
      }
    };
  } else if (hasNonNullishProperty(message, "stickers")) {
    m = await prepareStickerPackMessage(message, options);
  } else {
    m = await prepareWAMessageMedia(message, options);
  }
  if (hasNonNullishProperty(message, "buttons")) {
    const buttonsMessage = {
      buttons: message.buttons.map((button) => {
        const buttonText = button.text || button.buttonText;
        if (hasOptionalProperty(button, "sections")) {
          return {
            nativeFlowInfo: {
              name: "single_select",
              paramsJson: JSON.stringify({
                title: buttonText,
                sections: button.sections
              })
            },
            type: import_Types.ButtonType.NATIVE_FLOW
          };
        } else if (hasOptionalProperty(button, "name")) {
          return {
            nativeFlowInfo: {
              name: button.name,
              paramsJson: button.paramsJson
            },
            type: import_Types.ButtonType.NATIVE_FLOW
          };
        }
        return {
          buttonId: button.id || button.buttonId,
          buttonText: typeof buttonText === "string" ? { displayText: buttonText } : buttonText,
          type: button.type || import_Types.ButtonType.RESPONSE
        };
      })
    };
    if (hasOptionalProperty(message, "text")) {
      buttonsMessage.contentText = message.text;
      buttonsMessage.headerType = import_Types.ButtonHeaderType.EMPTY;
    } else {
      if (hasOptionalProperty(message, "caption")) {
        buttonsMessage.contentText = message.caption;
      }
      const type = Object.keys(m)[0].replace("Message", "").toUpperCase();
      buttonsMessage.headerType = import_Types.ButtonHeaderType[type];
      Object.assign(buttonsMessage, m);
    }
    if (hasOptionalProperty(message, "footer")) {
      buttonsMessage.footerText = message.footer;
    }
    m = { buttonsMessage };
  } else if (hasNonNullishProperty(message, "sections")) {
    const listMessage = {
      sections: message.sections,
      buttonText: message.buttonText,
      title: message.title,
      footerText: message.footer,
      description: message.text,
      listType: import_Types.ListType.SINGLE_SELECT
    };
    m = { listMessage };
  } else if (hasNonNullishProperty(message, "templateButtons")) {
    const hydratedTemplate = {
      hydratedButtons: message.templateButtons.map((button, i) => {
        const buttonText = button.text || button.buttonText;
        if (hasOptionalProperty(button, "id")) {
          return {
            index: i,
            quickReplyButton: {
              displayText: buttonText || "\u{1F449}\u{1F3FB} Click",
              id: button.id
            }
          };
        } else if (hasOptionalProperty(button, "url")) {
          return {
            index: i,
            urlButton: {
              displayText: buttonText || "\u{1F310} Visit",
              url: button.url
            }
          };
        } else if (hasOptionalProperty(button, "call")) {
          return {
            index: i,
            callButton: {
              displayText: buttonText || "\u{1F4DE} Call",
              phoneNumber: button.call
            }
          };
        }
        button.index = button.index || i;
        return button;
      })
    };
    if (hasOptionalProperty(message, "text")) {
      hydratedTemplate.hydratedContentText = message.text;
    } else {
      if (hasOptionalProperty(message, "caption")) {
        hydratedTemplate.hydratedTitleText = message.title;
        hydratedTemplate.hydratedContentText = message.caption;
      }
      ;
      Object.assign(hydratedTemplate, m);
    }
    if (hasOptionalProperty(message, "footer")) {
      hydratedTemplate.hydratedFooterText = message.footer;
    }
    hydratedTemplate.templateId = message.id || "template-" + Date.now();
    m = {
      templateMessage: {
        hydratedFourRowTemplate: hydratedTemplate,
        hydratedTemplate
      }
    };
  } else if (hasNonNullishProperty(message, "nativeFlow")) {
    const interactiveMessage = {
      nativeFlowMessage: prepareNativeFlowButtons(message)
    };
    if (hasOptionalProperty(message, "bizJid")) {
      interactiveMessage.collectionMessage = {
        bizJid: message.bizJid,
        id: message.id,
        messageVersion: 1
      };
    } else if (hasOptionalProperty(message, "shopSurface")) {
      interactiveMessage.shopStorefrontMessage = {
        surface: message.shopSurface,
        id: message.id,
        messageVersion: 1
      };
    }
    if (hasOptionalProperty(message, "text")) {
      interactiveMessage.body = { text: message.text };
    } else {
      if (hasOptionalProperty(message, "caption")) {
        const isValidHeader = hasValidInteractiveHeader(m);
        if (!isValidHeader) {
          throw new import_Addon.HttpError("Invalid media type for interactive message header", { statusCode: 400 });
        }
        interactiveMessage.header = {
          title: message.title || "",
          subtitle: message.subtitle || "",
          hasMediaAttachment: isValidHeader
        };
        interactiveMessage.body = { text: message.caption };
      }
      if (hasOptionalProperty(message, "thumbnail") && !!message.thumbnail) {
        interactiveMessage.jpegThumbnail = message.thumbnail;
      }
      Object.assign(interactiveMessage.header, m);
    }
    if (hasOptionalProperty(message, "audioFooter")) {
      const { audioMessage } = await prepareWAMessageMedia({
        audio: message.audioFooter
      }, options);
      interactiveMessage.footer = {
        audioMessage,
        hasMediaAttachment: true
      };
    } else if (hasOptionalProperty(message, "footer")) {
      interactiveMessage.footer = { text: message.footer };
    }
    m = { interactiveMessage };
  } else if (hasNonNullishProperty(message, "cards")) {
    const interactiveMessage = {
      carouselMessage: {
        cards: await Promise.all(message.cards.map(async (card) => {
          let carouselHeader = {};
          if (hasNonNullishProperty(card, "product")) {
            carouselHeader.productMessage = await prepareProductMessage(card, options);
          } else {
            carouselHeader = await prepareWAMessageMedia(card, options).catch(() => ({}));
          }
          const isValidHeader = hasValidCarouselHeader(carouselHeader);
          if (!isValidHeader) {
            throw new import_Addon.HttpError("Invalid media type for carousel card", { statusCode: 400 });
          }
          const carouselCard = {
            nativeFlowMessage: prepareNativeFlowButtons(card.nativeFlow ? card : [])
          };
          if (hasOptionalProperty(card, "text")) {
            carouselCard.body = { text: card.text };
          } else {
            if (hasOptionalProperty(card, "caption")) {
              carouselCard.header = {
                title: card.title || "",
                subtitle: card.subtitle || "",
                hasMediaAttachment: isValidHeader
              };
              carouselCard.body = { text: card.caption };
            }
            if (hasOptionalProperty(card, "thumbnail") && !!card.thumbnail) {
              carouselCard.jpegThumbnail = card.thumbnail;
            }
            Object.assign(carouselCard.header, carouselHeader);
          }
          if (hasOptionalProperty(card, "audioFooter")) {
            const { audioMessage } = await prepareWAMessageMedia({
              audio: card.audioFooter
            }, options);
            carouselCard.footer = {
              audioMessage,
              hasMediaAttachment: true
            };
          } else if (hasOptionalProperty(card, "footer")) {
            carouselCard.footer = { text: card.footer };
          }
          return carouselCard;
        })),
        carouselCardType: import_Types.CarouselCardType.UNKNOWN,
        messageVersion: 1
      }
    };
    if (hasOptionalProperty(message, "text")) {
      interactiveMessage.body = { text: message.text };
    }
    if (hasOptionalProperty(message, "footer")) {
      interactiveMessage.footer = { text: message.footer };
    }
    m = { interactiveMessage };
  } else if (hasNonNullishProperty(message, "requestPaymentFrom")) {
    const requestPaymentMessage = {
      amount: {
        currencyCode: "IDR",
        offset: 1e3,
        value: 1e3
      },
      amount1000: 1e3,
      currencyCodeIso4217: "IDR",
      expiryTimestamp: Date.now(),
      noteMessage: m,
      requestFrom: message.requestPaymentFrom,
      ...message
    };
    delete requestPaymentMessage.requestPaymentFrom;
    if (hasNonNullishProperty(m, "extendedTextMessage") || hasNonNullishProperty(m, "stickerMessage")) {
      Object.assign(requestPaymentMessage.noteMessage, m);
    } else {
      throw new import_Addon.HttpError("Invalid message type for request payment note message", { statusCode: 400 });
    }
    m = { requestPaymentMessage };
  } else if (hasNonNullishProperty(message, "invoiceNote")) {
    const attachment = m.imageMessage || m.documentMessage;
    const type = Object.keys(m)[0].replace("Message", "").toUpperCase();
    const invoiceMessage = {
      attachmentType: import_WAProto.proto.Message.InvoiceMessage.AttachmentType[type === "DOCUMENT" ? "PDF" : "IMAGE"],
      note: message.invoiceNote
    };
    if (attachment) {
      const { directPath, fileEncSha256, fileSha256, jpegThumbnail = void 0, mediaKey, mediaKeyTimestamp, mimetype } = attachment;
      Object.assign(invoiceMessage, {
        attachmentDirectPath: directPath,
        attachmentFileEncSha256: fileEncSha256,
        attachmentFileSha256: fileSha256,
        attachmentJpegThumbnail: jpegThumbnail,
        attachmentMediaKey: mediaKey,
        attachmentMediaKeyTimestamp: mediaKeyTimestamp,
        attachmentMimetype: mimetype,
        token: import_generics.generateMessageIDV2
      });
    } else {
      throw new import_Addon.HttpError("Invalid media type for invoice message", { statusCode: 400 });
    }
    m = { invoiceMessage };
  }
  if (hasOptionalProperty(message, "externalAdReply") && !!message.externalAdReply) {
    const messageType = Object.keys(m)[0];
    const key = m[messageType];
    const content = message.externalAdReply;
    if ("thumbnail" in content && !Buffer.isBuffer(content.thumbnail)) {
      throw new import_Addon.HttpError("Thumbnail must in buffer type", { statusCode: 400 });
    }
    if (!content.url || typeof content.url !== "string") {
      content.url = import_Defaults.DONATE_URL;
    }
    const externalAdReply = {
      ...content,
      body: content.body,
      mediaType: content.mediaType || 1,
      mediaUrl: content.url,
      renderLargerThumbnail: content.largeThumbnail,
      sourceUrl: content.url,
      thumbnail: content.thumbnail,
      thumbnailUrl: content.url + "?update=" + Date.now(),
      title: content.title || import_Defaults.LIBRARY_NAME
    };
    delete externalAdReply.subTitle;
    delete externalAdReply.largeThumbnail;
    delete externalAdReply.url;
    if ("contextInfo" in key && !!key.contextInfo) {
      key.contextInfo.externalAdReply = { ...key.contextInfo.externalAdReply, ...externalAdReply };
    } else if (key) {
      key.contextInfo = { externalAdReply };
    }
  }
  if (hasOptionalProperty(message, "mentions") && message.mentions?.length || hasOptionalProperty(message, "mentionAll") && message.mentionAll) {
    const messageType = Object.keys(m)[0];
    const key = m[messageType];
    if (key && "contextInfo" in key) {
      key.contextInfo = key.contextInfo || {};
      if (message.mentions?.length) {
        key.contextInfo.mentionedJid = message.mentions;
      }
      if (message.mentionAll) {
        key.contextInfo.nonJidMentions = 1;
      }
    } else if (key) {
      key.contextInfo = {
        mentionedJid: message.mentions,
        nonJidMentions: message.mentionAll ? 1 : 0
      };
    }
  }
  if (hasOptionalProperty(message, "contextInfo") && !!message.contextInfo) {
    const messageType = Object.keys(m)[0];
    const key = m[messageType];
    if ("contextInfo" in key && !!key.contextInfo) {
      key.contextInfo = { ...key.contextInfo, ...message.contextInfo };
    } else if (key) {
      key.contextInfo = message.contextInfo;
    }
  }
  if (hasOptionalProperty(message, "groupStatus") && !!message.groupStatus) {
    const messageType = Object.keys(m)[0];
    const key = m[messageType];
    if ("contextInfo" in key && !!key.contextInfo) {
      key.contextInfo.isGroupStatus = message.groupStatus;
    } else if (key) {
      key.contextInfo = {
        isGroupStatus: message.groupStatus
      };
    }
    m = { groupStatusMessageV2: { message: m } };
    delete message.groupStatus;
  }
  if (hasOptionalProperty(message, "spoiler") && !!message.spoiler) {
    const messageType = Object.keys(m)[0];
    const key = m[messageType];
    if ("contextInfo" in key && !!key.contextInfo) {
      key.contextInfo.isSpoiler = message.spoiler;
    } else if (key) {
      key.contextInfo = {
        isSpoiler: message.spoiler
      };
    }
    m = { spoilerMessage: { message: m } };
    delete message.spoiler;
  } else if (hasOptionalProperty(message, "interactiveAsTemplate") && !!message.interactiveAsTemplate) {
    if (!m.interactiveMessage) {
      throw new import_Addon.HttpError("Invalid message type for template", { statusCode: 400 });
    }
    m = {
      templateMessage: {
        interactiveMessageTemplate: m.interactiveMessage,
        templateId: message.id || "template-" + Date.now()
        // Minimal templateId to satisfy WhatsApp (⁠ ⁠ꈍ⁠ᴗ⁠ꈍ⁠)
      }
    };
    delete message.interactiveAsTemplate;
  }
  if (hasOptionalProperty(message, "ephemeral") && !!message.ephemeral) {
    m = { ephemeralMessage: { message: m } };
    delete message.ephemeral;
  }
  if (hasOptionalProperty(message, "isLottie") && !!message.isLottie) {
    m = { lottieStickerMessage: { message: m } };
  } else if (hasOptionalProperty(message, "viewOnce") && !!message.viewOnce) {
    markViewOnce(m);
    m = { viewOnceMessage: { message: m } };
  } else if (hasOptionalProperty(message, "viewOnceV2") && !!message.viewOnceV2) {
    markViewOnce(m);
    m = { viewOnceMessageV2: { message: m } };
    delete message.viewOnceV2;
  } else if (hasOptionalProperty(message, "viewOnceV2Extension") && !!message.viewOnceV2Extension) {
    markViewOnce(m);
    m = { viewOnceMessageV2Extension: { message: m } };
    delete message.viewOnceV2Extension;
  }
  if (hasOptionalProperty(message, "edit")) {
    m = {
      protocolMessage: {
        key: message.edit,
        editedMessage: m,
        timestampMs: Date.now(),
        type: import_Types.WAProto.Message.ProtocolMessage.Type.MESSAGE_EDIT
      }
    };
  }
  if ((0, import_reporting_utils.shouldIncludeReportingToken)(m)) {
    m.messageContextInfo = m.messageContextInfo || {};
    if (!m.messageContextInfo.messageSecret) {
      m.messageContextInfo.messageSecret = (0, import_node_crypto.randomBytes)(32);
    }
  }
  return ensureMessageProto(m);
};
const generateWAMessageFromContent = (jid, message, options) => {
  if (!options.timestamp) {
    options.timestamp = /* @__PURE__ */ new Date();
  }
  const innerMessage = normalizeMessageContent(message);
  const messageContextInfo = message.messageContextInfo;
  const key = getContentType(innerMessage);
  const timestamp = (0, import_generics.unixTimestampSeconds)(options.timestamp);
  const isNewsletter = (0, import_WABinary.isJidNewsletter)(jid);
  const { quoted, userJid } = options;
  if (quoted) {
    const participant = quoted.key.fromMe ? userJid : quoted.participant || quoted.key.participant || quoted.key.remoteJid;
    let quotedMsg = normalizeMessageContent(quoted.message);
    const msgType = getContentType(quotedMsg);
    quotedMsg = import_WAProto.proto.Message.create({ [msgType]: quotedMsg[msgType] });
    const quotedContent = quotedMsg[msgType];
    if (typeof quotedContent === "object" && quotedContent && "contextInfo" in quotedContent) {
      delete quotedContent.contextInfo;
    }
    const contextInfo = "contextInfo" in innerMessage[key] && innerMessage[key]?.contextInfo || {};
    contextInfo.participant = (0, import_WABinary.jidNormalizedUser)(participant);
    contextInfo.stanzaId = quoted.key.id;
    contextInfo.quotedMessage = quotedMsg;
    if (!isNewsletter && jid !== quoted.key.remoteJid) {
      contextInfo.remoteJid = quoted.key.remoteJid;
    }
    if (contextInfo && innerMessage[key]) {
      innerMessage[key].contextInfo = contextInfo;
    }
  }
  if (
    // if we want to send a disappearing message
    !!options?.ephemeralExpiration && // and it's not a protocol message -- delete, toggle disappear message
    key !== "protocolMessage" && // already not converted to disappearing message
    key !== "ephemeralMessage" && // newsletters don't support ephemeral messages
    !isNewsletter
  ) {
    innerMessage[key].contextInfo = {
      ...innerMessage[key].contextInfo || {},
      expiration: options.ephemeralExpiration || import_Defaults.WA_DEFAULT_EPHEMERAL
      //ephemeralSettingTimestamp: options.ephemeralOptions.eph_setting_ts?.toString
    };
  }
  if (messageContextInfo?.messageSecret && ((0, import_WABinary.isPnUser)(jid) || (0, import_WABinary.isLidUser)(jid))) {
    messageContextInfo.deviceListMetadata = {
      recipientKeyHash: (0, import_node_crypto.randomBytes)(10),
      recipientTimestamp: import_generics.unixTimestampSeconds
    };
    messageContextInfo.deviceListMetadataVersion = 2;
  }
  return import_Types.WAProto.WebMessageInfo.create({
    key: {
      remoteJid: jid,
      fromMe: true,
      id: options?.messageId || import_generics.generateMessageIDV2
    },
    message: ensureMessageProto(message),
    messageTimestamp: timestamp,
    messageStubParameters: [],
    participant: (0, import_WABinary.isJidGroup)(jid) || (0, import_WABinary.isJidStatusBroadcast)(jid) ? userJid : void 0,
    // TODO: Add support for LIDs
    status: import_Types.WAMessageStatus.PENDING
  });
};
const generateWAMessage = async (jid, content, options) => {
  options.logger = options?.logger?.child({ msgId: options.messageId });
  if (jid) {
    options.jid = jid;
  }
  return generateWAMessageFromContent(jid, await generateWAMessageContent(content, options), options);
};
const getContentType = (content) => {
  if (content) {
    const keys = Object.keys(content);
    const key = keys.find((k) => (k === "conversation" || k.includes("Message")) && k !== "senderKeyDistributionMessage");
    return key;
  }
};
const normalizeMessageContent = (content) => {
  if (!content) {
    return void 0;
  }
  for (let i = 0; i < 5; i++) {
    const inner = getFutureProofMessage(content);
    if (!inner) {
      break;
    }
    content = inner.message;
  }
  return content;
  function getFutureProofMessage(message) {
    return message?.acp2SettingMessage || message?.associatedChildMessage || message?.audioStickerMessage || message?.botForwardedMessage || message?.botGroupParticipantMessage || message?.botInvokeMessage || message?.botPlatformRegistrationSuccessMessage || message?.botTaskMessage || message?.documentWithCaptionMessage || message?.editedMessage || message?.ephemeralMessage || message?.eventCoverImage || message?.groupMentionedMessage || message?.groupStatusMentionMessage || message?.groupStatusMessage || message?.groupStatusMessageV2 || message?.limitSharingMessage || message?.lottieStickerMessage || message?.newsletterAdminProfileMessage || message?.newsletterAdminProfileMessageV2 || message?.newsletterAdminProfileStatusMessage || message?.newsletterScheduledMessage || message?.pollCreationMessageV4 || message?.pollCreationOptionImageMessage || message?.questionMessage || message?.questionReplyMessage || message?.spoilerMessage || message?.statusAddYours || message?.statusMentionMessage || message?.viewOnceMessage || message?.viewOnceMessageV2 || message?.viewOnceMessageV2Extension;
  }
};
const extractMessageContent = (content) => {
  const extractFromTemplateMessage = (msg) => {
    if (msg.imageMessage) {
      return { imageMessage: msg.imageMessage };
    } else if (msg.documentMessage) {
      return { documentMessage: msg.documentMessage };
    } else if (msg.videoMessage) {
      return { videoMessage: msg.videoMessage };
    } else if (msg.locationMessage) {
      return { locationMessage: msg.locationMessage };
    } else {
      return {
        conversation: "contentText" in msg ? msg.contentText : "hydratedContentText" in msg ? msg.hydratedContentText : ""
      };
    }
  };
  content = normalizeMessageContent(content);
  if (content?.buttonsMessage) {
    return extractFromTemplateMessage(content.buttonsMessage);
  }
  if (content?.templateMessage?.hydratedFourRowTemplate) {
    return extractFromTemplateMessage(content?.templateMessage?.hydratedFourRowTemplate);
  }
  if (content?.templateMessage?.hydratedTemplate) {
    return extractFromTemplateMessage(content?.templateMessage?.hydratedTemplate);
  }
  if (content?.templateMessage?.fourRowTemplate) {
    return extractFromTemplateMessage(content?.templateMessage?.fourRowTemplate);
  }
  return content;
};
const getDevice = (id) => /^3A.{18}$/.test(id) ? "ios" : /^3E.{20}$/.test(id) ? "web" : /^(.{21}|.{32})$/.test(id) ? "android" : /^(3F|.{18}$)/.test(id) ? "desktop" : "unknown";
const updateMessageWithReceipt = (msg, receipt) => {
  msg.userReceipt = msg.userReceipt || [];
  const recp = msg.userReceipt.find((m) => m.userJid === receipt.userJid);
  if (recp) {
    Object.assign(recp, receipt);
  } else {
    msg.userReceipt.push(receipt);
  }
};
const updateMessageWithReaction = (msg, reaction) => {
  const authorID = (0, import_generics.getKeyAuthor)(reaction.key);
  const reactions = (msg.reactions || []).filter((r) => (0, import_generics.getKeyAuthor)(r.key) !== authorID);
  reaction.text = reaction.text || "";
  reactions.push(reaction);
  msg.reactions = reactions;
};
const updateMessageWithPollUpdate = (msg, update) => {
  const authorID = (0, import_generics.getKeyAuthor)(update.pollUpdateMessageKey);
  const reactions = (msg.pollUpdates || []).filter((r) => (0, import_generics.getKeyAuthor)(r.pollUpdateMessageKey) !== authorID);
  if (update.vote?.selectedOptions?.length) {
    reactions.push(update);
  }
  msg.pollUpdates = reactions;
};
const updateMessageWithEventResponse = (msg, update) => {
  const authorID = (0, import_generics.getKeyAuthor)(update.eventResponseMessageKey);
  const responses = (msg.eventResponses || []).filter((r) => (0, import_generics.getKeyAuthor)(r.eventResponseMessageKey) !== authorID);
  responses.push(update);
  msg.eventResponses = responses;
};
function getAggregateVotesInPollMessage({ message, pollUpdates }, meId) {
  const opts = message?.pollCreationMessage?.options || message?.pollCreationMessageV2?.options || message?.pollCreationMessageV3?.options || [];
  const voteHashMap = opts.reduce((acc, opt) => {
    const hash = (0, import_crypto.sha256)(Buffer.from(opt.optionName || "")).toString();
    acc[hash] = {
      name: opt.optionName || "",
      voters: []
    };
    return acc;
  }, {});
  for (const update of pollUpdates || []) {
    const { vote } = update;
    if (!vote) {
      continue;
    }
    for (const option of vote.selectedOptions || []) {
      const hash = option.toString();
      let data = voteHashMap[hash];
      if (!data) {
        voteHashMap[hash] = {
          name: "Unknown",
          voters: []
        };
        data = voteHashMap[hash];
      }
      voteHashMap[hash].voters.push((0, import_generics.getKeyAuthor)(update.pollUpdateMessageKey, meId));
    }
  }
  return Object.values(voteHashMap);
}
function getAggregateResponsesInEventMessage({ eventResponses }, meId) {
  const responseTypes = ["GOING", "NOT_GOING", "MAYBE"];
  const responseMap = {};
  for (const type of responseTypes) {
    responseMap[type] = {
      response: type,
      responders: []
    };
  }
  for (const update of eventResponses || []) {
    const responseType = update.eventResponse || "UNKNOWN";
    if (responseType !== "UNKNOWN" && responseMap[responseType]) {
      responseMap[responseType].responders.push((0, import_generics.getKeyAuthor)(update.eventResponseMessageKey, meId));
    }
  }
  return Object.values(responseMap);
}
const aggregateMessageKeysNotFromMe = (keys) => {
  const keyMap = {};
  for (const { remoteJid, id, participant, fromMe } of keys) {
    if (!fromMe) {
      const uqKey = `${remoteJid}:${participant || ""}`;
      if (!keyMap[uqKey]) {
        keyMap[uqKey] = {
          jid: remoteJid,
          participant,
          messageIds: []
        };
      }
      keyMap[uqKey].messageIds.push(id);
    }
  }
  return Object.values(keyMap);
};
const REUPLOAD_REQUIRED_STATUS = [410, 404];
const downloadMediaMessage = async (message, type, options, ctx) => {
  const result = await downloadMsg().catch(async (error) => {
    if (ctx && typeof error?.status === "number" && // treat errors with status as HTTP failures requiring reupload
    REUPLOAD_REQUIRED_STATUS.includes(error.status)) {
      ctx.logger.info({ key: message.key }, "sending reupload media request...");
      message = await ctx.reuploadRequest(message);
      const result2 = await downloadMsg();
      return result2;
    }
    throw error;
  });
  return result;
  async function downloadMsg() {
    const mContent = extractMessageContent(message.message);
    if (!mContent) {
      throw new import_Addon.HttpError("No message present", { statusCode: 400, data: message });
    }
    const contentType = getContentType(mContent);
    let mediaType = contentType?.replace("Message", "");
    const media = mContent[contentType];
    if (!media || typeof media !== "object" || !("url" in media) && !("thumbnailDirectPath" in media)) {
      throw new import_Addon.HttpError(`"${contentType}" message is not a media message`);
    }
    let download;
    if ("thumbnailDirectPath" in media && !("url" in media)) {
      download = {
        directPath: media.thumbnailDirectPath,
        mediaKey: media.mediaKey
      };
      mediaType = "thumbnail-link";
    } else {
      download = media;
    }
    const stream = await (0, import_messages_media.downloadContentFromMessage)(download, mediaType, options);
    if (type === "buffer") {
      const bufferArray = [];
      for await (const chunk of stream) {
        bufferArray.push(chunk);
      }
      return Buffer.concat(bufferArray);
    }
    return stream;
  }
};
const assertMediaContent = (content) => {
  content = extractMessageContent(content);
  const mediaContent = content?.documentMessage || content?.imageMessage || content?.videoMessage || content?.audioMessage || content?.stickerMessage;
  if (!mediaContent) {
    throw new import_Addon.HttpError("given message is not a media message", { statusCode: 400, data: content });
  }
  return mediaContent;
};
const isAnimatedWebP = (buffer) => {
  if (buffer.length < 12 || buffer[0] !== 82 || buffer[1] !== 73 || buffer[2] !== 70 || buffer[3] !== 70 || buffer[8] !== 87 || buffer[9] !== 69 || buffer[10] !== 66 || buffer[11] !== 80) {
    return false;
  }
  ;
  let offset = 12;
  while (offset < buffer.length - 8) {
    const chunkFourCC = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkFourCC === "VP8X") {
      const flagsOffset = offset + 8;
      if (flagsOffset < buffer.length) {
        const flags = buffer[flagsOffset];
        if (flags & 2) {
          return true;
        }
        ;
      }
      ;
    } else if (chunkFourCC === "ANIM" || chunkFourCC === "ANMF") {
      return true;
    }
    ;
    offset += 8 + chunkSize + chunkSize % 2;
  }
  ;
  return false;
};
const isWebPBuffer = (buffer) => {
  return buffer.length >= 12 && buffer[0] === 82 && buffer[1] === 73 && buffer[2] === 70 && buffer[3] === 70 && buffer[8] === 87 && buffer[9] === 69 && buffer[10] === 66 && buffer[11] === 80;
};
const shouldIncludeBizBinaryNode = (message) => !!(message.buttonsMessage || message.listMessage || message.templateMessage || message.interactiveMessage && message.interactiveMessage.nativeFlowMessage);
const isViewOnceMessage = (message) => {
  if (message?.viewOnce === true || message?.viewOnceMessage || message?.viewOnceMessageV2 || message?.viewOnceMessageV2Extension)
    return true;
  const innerMsg = normalizeMessageContent(message);
  const msgType = getContentType(innerMsg);
  const msgCtn = innerMsg?.[msgType];
  return msgCtn?.viewOnce === true;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  aggregateMessageKeysNotFromMe,
  assertMediaContent,
  downloadMediaMessage,
  extractMessageContent,
  extractUrlFromText,
  generateForwardMessageContent,
  generateLinkPreviewIfRequired,
  generateWAMessage,
  generateWAMessageContent,
  generateWAMessageFromContent,
  getAggregateResponsesInEventMessage,
  getAggregateVotesInPollMessage,
  getContentType,
  getDevice,
  hasNonNullishProperty,
  hasOptionalProperty,
  hasValidAlbumMedia,
  hasValidCarouselHeader,
  hasValidInteractiveHeader,
  isViewOnceMessage,
  markViewOnce,
  normalizeMessageContent,
  prepareDisappearingMessageSettingContent,
  prepareNativeFlowButtons,
  prepareWAMessageMedia,
  shouldIncludeBizBinaryNode,
  updateMessageWithEventResponse,
  updateMessageWithPollUpdate,
  updateMessageWithReaction,
  updateMessageWithReceipt
});
