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
var messages_media_exports = {};
__export(messages_media_exports, {
  DEF_MEDIA_HOST: () => DEF_MEDIA_HOST,
  decodeMediaRetryNode: () => decodeMediaRetryNode,
  decryptMediaRetryData: () => decryptMediaRetryData,
  downloadContentFromMessage: () => downloadContentFromMessage,
  downloadEncryptedContent: () => downloadEncryptedContent,
  encodeBase64EncodedStringForUpload: () => encodeBase64EncodedStringForUpload,
  encryptMediaRetryRequest: () => encryptMediaRetryRequest,
  encryptedStream: () => encryptedStream,
  extensionForMediaMessage: () => extensionForMediaMessage,
  extractImageThumb: () => extractImageThumb,
  extractVideoThumb: () => extractVideoThumb,
  generateProfilePicture: () => generateProfilePicture,
  generateThumbnail: () => generateThumbnail,
  getAudioData: () => getAudioData,
  getHttpStream: () => getHttpStream,
  getImageProcessingLibrary: () => getImageProcessingLibrary,
  getMediaKeys: () => getMediaKeys,
  getRawMediaUploadData: () => getRawMediaUploadData,
  getStatusCodeForMediaRetry: () => getStatusCodeForMediaRetry,
  getStream: () => getStream,
  getUrlFromDirectPath: () => getUrlFromDirectPath,
  getWAUploadToServer: () => getWAUploadToServer,
  hkdfInfoKey: () => hkdfInfoKey,
  mediaMessageSHA256B64: () => mediaMessageSHA256B64,
  toBuffer: () => toBuffer,
  toReadable: () => toReadable,
  uploadWithNodeHttp: () => uploadWithNodeHttp
});
module.exports = __toCommonJS(messages_media_exports);
var import_node_child_process = require("node:child_process");
var Crypto = __toESM(require("node:crypto"), 1);
var import_node_events = require("node:events");
var import_node_fs = require("node:fs");
var import_node_os = require("node:os");
var import_node_path = require("node:path");
var import_node_stream = require("node:stream");
var import_node_url = require("node:url");
var import_WAProto = require("../../WAProto/index.js");
var import_Addon = require("../Addon/index.js");
var import_Defaults = require("../Defaults/index.js");
var import_WABinary = require("../WABinary/index.js");
var import_crypto = require("./crypto.js");
var import_generics = require("./generics.js");
let imageProcessingLibrary;
const getImageProcessingLibrary = async () => {
  if (imageProcessingLibrary) {
    return imageProcessingLibrary;
  }
  const [image, jimp, sharp] = await Promise.all([
    import("@napi-rs/image").catch(() => {
    }),
    import("jimp").catch(() => {
    }),
    import("sharp").catch(() => {
    })
  ]);
  if (image) {
    imageProcessingLibrary = { image };
  } else if (jimp) {
    imageProcessingLibrary = { jimp };
  } else if (sharp) {
    imageProcessingLibrary = { sharp };
  } else {
    throw new import_Addon.HttpError("No image processing library available");
  }
  return imageProcessingLibrary;
};
const hkdfInfoKey = (type) => {
  const hkdfInfo = import_Defaults.MEDIA_HKDF_KEY_MAPPING[type];
  return `WhatsApp ${hkdfInfo} Keys`;
};
const getRawMediaUploadData = async (media, mediaType, logger) => {
  const { stream } = await getStream(media);
  logger?.debug("got stream for raw upload");
  const hasher = Crypto.createHash("sha256");
  const filePath = (0, import_node_path.join)((0, import_node_os.tmpdir)(), mediaType + (0, import_generics.generateMessageIDV2)());
  const fileWriteStream = (0, import_node_fs.createWriteStream)(filePath);
  let fileLength = 0;
  try {
    for await (const data of stream) {
      fileLength += data.length;
      hasher.update(data);
      if (!fileWriteStream.write(data)) {
        await (0, import_node_events.once)(fileWriteStream, "drain");
      }
    }
    fileWriteStream.end();
    await (0, import_node_events.once)(fileWriteStream, "finish");
    stream.destroy();
    const fileSha256 = hasher.digest();
    logger?.debug("hashed data for raw upload");
    return {
      filePath,
      fileSha256,
      fileLength
    };
  } catch (error) {
    fileWriteStream.destroy();
    stream.destroy();
    try {
      await import_node_fs.promises.unlink(filePath);
    } catch {
    }
    throw error;
  }
};
async function getMediaKeys(buffer, mediaType) {
  if (!buffer) {
    throw new import_Addon.HttpError("Cannot derive from empty media key");
  }
  if (typeof buffer === "string") {
    buffer = Buffer.from(buffer.replace("data:;base64,", ""), "base64");
  }
  const expandedMediaKey = (0, import_crypto.hkdf)(buffer, 112, { info: hkdfInfoKey(mediaType) });
  return {
    iv: expandedMediaKey.slice(0, 16),
    cipherKey: expandedMediaKey.slice(16, 48),
    macKey: expandedMediaKey.slice(48, 80)
  };
}
const extractVideoThumb = async (path, time, size) => {
  const ffmpeg = (0, import_node_child_process.spawn)("ffmpeg", [
    "-loglevel",
    "error",
    "-ss",
    String(time),
    "-i",
    path,
    "-an",
    "-sn",
    "-dn",
    "-map_metadata",
    "-1",
    "-vf",
    `scale=${size.width}:-1`,
    "-frames:v",
    "1",
    "-c:v",
    "mjpeg",
    "-f",
    "image2pipe",
    "pipe:1"
  ], {
    stdio: ["ignore", "pipe", "pipe"]
  });
  let buffer = Buffer.alloc(0);
  const stderrChunks = [];
  ffmpeg.stdout.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
  });
  ffmpeg.stderr.on("data", (chunk) => stderrChunks.push(chunk));
  const [code] = await (0, import_node_events.once)(ffmpeg, "close");
  if (code !== 0) {
    throw new import_Addon.HttpError(`FFmpeg failed (code ${code}):
` + Buffer.concat(stderrChunks).toString("utf8"));
  }
  return buffer;
};
const extractImageThumb = async (bufferOrFilePath, width = 32) => {
  if (bufferOrFilePath instanceof import_node_stream.Readable) {
    bufferOrFilePath = await toBuffer(bufferOrFilePath);
  }
  const lib = await getImageProcessingLibrary();
  if ("sharp" in lib && lib.sharp?.default) {
    const img = lib.sharp.default(bufferOrFilePath);
    const dimensions = await img.metadata();
    const buffer = await img.resize(width).jpeg({ quality: 50 }).toBuffer();
    return {
      buffer,
      original: {
        width: dimensions.width,
        height: dimensions.height
      }
    };
  } else if ("image" in lib && lib.image?.Transformer) {
    if (!Buffer.isBuffer(bufferOrFilePath)) {
      bufferOrFilePath = await import_node_fs.promises.readFile(bufferOrFilePath);
    }
    const img = new lib.image.Transformer(bufferOrFilePath);
    const dimensions = await img.metadata();
    const buffer = await img.resize(width, void 0, 0).jpeg(50);
    return {
      buffer,
      original: {
        width: dimensions.width,
        height: dimensions.height
      }
    };
  } else if ("jimp" in lib && lib.jimp?.Jimp) {
    const jimp = await lib.jimp.Jimp.read(bufferOrFilePath);
    const dimensions = {
      width: jimp.width,
      height: jimp.height
    };
    const buffer = await jimp.resize({ w: width, mode: lib.jimp.ResizeStrategy.BILINEAR }).getBuffer("image/jpeg", { quality: 50 });
    return {
      buffer,
      original: dimensions
    };
  } else {
    throw new import_Addon.HttpError("No image processing library available");
  }
};
const encodeBase64EncodedStringForUpload = (b64) => encodeURIComponent(b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/\=+$/, ""));
const generateProfilePicture = async (mediaUpload, dimensions) => {
  let buffer;
  const { width: w = 720, height: h = 720 } = dimensions || {};
  if (Buffer.isBuffer(mediaUpload)) {
    buffer = mediaUpload;
  } else {
    const { stream } = await getStream(mediaUpload);
    buffer = await toBuffer(stream);
  }
  const lib = await getImageProcessingLibrary();
  let img;
  if ("sharp" in lib && lib.sharp?.default) {
    img = lib.sharp.default(buffer).resize(w, h).jpeg({
      quality: 80
    }).toBuffer();
  } else if ("image" in lib && lib.image?.Transformer) {
    img = new lib.image.Transformer(buffer).resize(w, h, 0).jpeg(80);
  } else if ("jimp" in lib && lib.jimp?.Jimp) {
    const jimp = await lib.jimp.Jimp.read(buffer);
    const min = Math.min(jimp.width, jimp.height);
    const cropped = jimp.crop({ x: 0, y: 0, w: min, h: min });
    img = cropped.resize({ w, h, mode: lib.jimp.ResizeStrategy.BILINEAR }).getBuffer("image/jpeg", { quality: 80 });
  } else {
    throw new import_Addon.HttpError("No image processing library available");
  }
  return {
    img: await img
  };
};
const mediaMessageSHA256B64 = (message) => {
  const media = Object.values(message)[0];
  return media?.fileSha256 && Buffer.from(media.fileSha256).toString("base64");
};
async function getAudioData(buffer, logger) {
  try {
    const filePath = await (0, import_Addon.getFile)(buffer);
    const result = await (0, import_Addon.getAudioWaveform)(filePath);
    await import_node_fs.promises.unlink(filePath);
    return result;
  } catch (e) {
    logger?.debug("Failed to get audio data: " + e);
  }
}
const toReadable = (buffer) => {
  const readable = new import_node_stream.Readable({ read: () => {
  } });
  readable.push(buffer);
  readable.push(null);
  return readable;
};
const toBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  stream.destroy();
  return Buffer.concat(chunks);
};
const getStream = async (item, opts) => {
  if (Buffer.isBuffer(item)) {
    return { stream: toReadable(item), type: "buffer" };
  }
  if ("stream" in item) {
    return { stream: item.stream, type: "readable" };
  }
  const urlStr = item.url.toString();
  if (urlStr.startsWith("data:")) {
    const buffer = Buffer.from(urlStr.split(",")[1], "base64");
    return { stream: toReadable(buffer), type: "buffer" };
  }
  if (urlStr.startsWith("http://") || urlStr.startsWith("https://")) {
    return { stream: await getHttpStream(item.url, opts), type: "remote" };
  }
  return { stream: (0, import_node_fs.createReadStream)(item.url), type: "file" };
};
async function generateThumbnail(file, mediaType, options) {
  let thumbnail;
  let originalImageDimensions;
  if (mediaType === "image") {
    const { buffer, original } = await extractImageThumb(file);
    thumbnail = buffer.toString("base64");
    if (original.width && original.height) {
      originalImageDimensions = {
        width: original.width,
        height: original.height
      };
    }
  } else if (mediaType === "video") {
    try {
      const buff = await extractVideoThumb(file, "00:00:00", { width: 32, height: 32 });
      thumbnail = buff.toString("base64");
    } catch (err) {
      options.logger?.debug("could not generate video thumb: " + err);
    }
  }
  return {
    thumbnail,
    originalImageDimensions
  };
}
const getHttpStream = async (url, options = {}) => {
  const response = await fetch(url.toString(), {
    dispatcher: options.dispatcher,
    method: "GET",
    headers: options.headers
  });
  if (!response.ok) {
    throw new import_Addon.HttpError(`Failed to fetch stream from ${url}`, { statusCode: response.status, data: { url } });
  }
  return response.body instanceof import_node_stream.Readable ? response.body : import_node_stream.Readable.fromWeb(response.body);
};
const encryptedStream = async (media, mediaType, { logger, saveOriginalFileIfRequired, mediaKey = Crypto.randomBytes(32), opts } = {}) => {
  const { stream, type } = await getStream(media, opts);
  logger?.debug("fetched media stream");
  const { cipherKey, iv, macKey } = await getMediaKeys(mediaKey, mediaType);
  const encFilePath = (0, import_node_path.join)((0, import_node_os.tmpdir)(), mediaType + (0, import_generics.generateMessageIDV2)() + "-enc");
  const encFileWriteStream = (0, import_node_fs.createWriteStream)(encFilePath);
  let originalFileStream;
  let originalFilePath;
  if (saveOriginalFileIfRequired) {
    originalFilePath = (0, import_node_path.join)((0, import_node_os.tmpdir)(), mediaType + (0, import_generics.generateMessageIDV2)() + "-original");
    originalFileStream = (0, import_node_fs.createWriteStream)(originalFilePath);
  }
  let fileLength = 0;
  const aes = Crypto.createCipheriv("aes-256-cbc", cipherKey, iv);
  const hmac = Crypto.createHmac("sha256", macKey).update(iv);
  const sha256Plain = Crypto.createHash("sha256");
  const sha256Enc = Crypto.createHash("sha256");
  const onChunk = async (buff) => {
    sha256Enc.update(buff);
    hmac.update(buff);
    if (!encFileWriteStream.write(buff)) {
      await (0, import_node_events.once)(encFileWriteStream, "drain");
    }
  };
  try {
    for await (const data of stream) {
      fileLength += data.length;
      if (type === "remote" && opts?.maxContentLength && fileLength + data.length > opts.maxContentLength) {
        throw new import_Addon.HttpError(`content length exceeded when encrypting "${type}"`, {
          data: { media, type }
        });
      }
      if (originalFileStream) {
        if (!originalFileStream.write(data)) {
          await (0, import_node_events.once)(originalFileStream, "drain");
        }
      }
      sha256Plain.update(data);
      await onChunk(aes.update(data));
    }
    await onChunk(aes.final());
    const mac = hmac.digest().slice(0, 10);
    sha256Enc.update(mac);
    const fileSha256 = sha256Plain.digest();
    const fileEncSha256 = sha256Enc.digest();
    encFileWriteStream.write(mac);
    const encFinishPromise = (0, import_node_events.once)(encFileWriteStream, "finish");
    const originalFinishPromise = originalFileStream ? (0, import_node_events.once)(originalFileStream, "finish") : Promise.resolve();
    encFileWriteStream.end();
    originalFileStream?.end?.();
    stream.destroy();
    await encFinishPromise;
    await originalFinishPromise;
    logger?.debug("encrypted data successfully");
    return {
      mediaKey,
      originalFilePath,
      encFilePath,
      mac,
      fileEncSha256,
      fileSha256,
      fileLength
    };
  } catch (error) {
    encFileWriteStream.destroy();
    originalFileStream?.destroy?.();
    aes.destroy();
    hmac.destroy();
    sha256Plain.destroy();
    sha256Enc.destroy();
    stream.destroy();
    try {
      await import_node_fs.promises.unlink(encFilePath);
      if (originalFilePath) {
        await import_node_fs.promises.unlink(originalFilePath);
      }
    } catch (err) {
      logger?.error({ err }, "failed deleting tmp files");
    }
    throw error;
  }
};
const DEF_MEDIA_HOST = "mmg.whatsapp.net";
const AES_CHUNK_SIZE = 16;
const toSmallestChunkSize = (num) => {
  return Math.floor(num / AES_CHUNK_SIZE) * AES_CHUNK_SIZE;
};
const getUrlFromDirectPath = (directPath, host = DEF_MEDIA_HOST) => `https://${host}${directPath}`;
const PLACEHOLDER_MEDIA_HOST = "a.whatsapp.net";
const extractHost = (url) => {
  if (!url)
    return void 0;
  try {
    const host = new import_node_url.URL(url).host;
    return host === PLACEHOLDER_MEDIA_HOST ? void 0 : host;
  } catch {
    return void 0;
  }
};
const downloadContentFromMessage = async ({ mediaKey, directPath, url }, type, opts = {}) => {
  const fallbackHost = opts.host ?? extractHost(url);
  const downloadUrl = directPath ? getUrlFromDirectPath(directPath, fallbackHost) : url;
  if (!downloadUrl) {
    throw new import_Addon.HttpError("No valid media URL or directPath present in message", { statusCode: 400 });
  }
  const keys = await getMediaKeys(mediaKey, type);
  return downloadEncryptedContent(downloadUrl, keys, opts);
};
const downloadEncryptedContent = async (downloadUrl, { cipherKey, iv }, { startByte, endByte, options } = {}) => {
  let bytesFetched = 0;
  let startChunk = 0;
  let firstBlockIsIV = false;
  if (startByte) {
    const chunk = toSmallestChunkSize(startByte || 0);
    if (chunk) {
      startChunk = chunk - AES_CHUNK_SIZE;
      bytesFetched = chunk;
      firstBlockIsIV = true;
    }
  }
  const endChunk = endByte ? toSmallestChunkSize(endByte || 0) + AES_CHUNK_SIZE : void 0;
  const headersInit = options?.headers ? options.headers : void 0;
  const headers = {
    ...headersInit ? Array.isArray(headersInit) ? Object.fromEntries(headersInit) : headersInit : {},
    Origin: import_Defaults.DEFAULT_ORIGIN
  };
  if (startChunk || endChunk) {
    headers.Range = `bytes=${startChunk}-`;
    if (endChunk) {
      headers.Range += endChunk;
    }
  }
  const fetched = await getHttpStream(downloadUrl, {
    ...options || {},
    headers
  });
  let remainingBytes = Buffer.from([]);
  let aes;
  const pushBytes = (bytes, push) => {
    if (startByte || endByte) {
      const start = bytesFetched >= startByte ? void 0 : Math.max(startByte - bytesFetched, 0);
      const end = bytesFetched + bytes.length < endByte ? void 0 : Math.max(endByte - bytesFetched, 0);
      push(bytes.slice(start, end));
      bytesFetched += bytes.length;
    } else {
      push(bytes);
    }
  };
  const output = new import_node_stream.Transform({
    transform(chunk, _, callback) {
      let data = remainingBytes.length ? Buffer.concat([remainingBytes, chunk]) : chunk;
      const decryptLength = toSmallestChunkSize(data.length);
      remainingBytes = data.slice(decryptLength);
      data = data.slice(0, decryptLength);
      if (!aes) {
        let ivValue = iv;
        if (firstBlockIsIV) {
          ivValue = data.slice(0, AES_CHUNK_SIZE);
          data = data.slice(AES_CHUNK_SIZE);
        }
        aes = Crypto.createDecipheriv("aes-256-cbc", cipherKey, ivValue);
        if (endByte) {
          aes.setAutoPadding(false);
        }
      }
      try {
        pushBytes(aes.update(data), (b) => this.push(b));
        callback();
      } catch (error) {
        callback(error);
      }
    },
    final(callback) {
      try {
        pushBytes(aes.final(), (b) => this.push(b));
        callback();
      } catch (error) {
        callback(error);
      }
    }
  });
  return fetched.pipe(output, { end: true });
};
function extensionForMediaMessage(message) {
  const getExtension = (mimetype) => mimetype.split(";")[0]?.split("/")[1];
  const type = Object.keys(message)[0];
  let extension;
  if (type === "locationMessage" || type === "liveLocationMessage" || type === "productMessage") {
    extension = ".jpeg";
  } else {
    const messageContent = message[type];
    extension = getExtension(messageContent.mimetype);
  }
  return extension;
}
const isNodeRuntime = () => {
  return typeof process !== "undefined" && process.versions?.node !== null && typeof process.versions.bun === "undefined" && typeof globalThis.Deno === "undefined";
};
const uploadWithNodeHttp = async ({ url, filePath, headers, timeoutMs, agent }, redirectCount = 0) => {
  if (redirectCount > 5) {
    throw new Error("Too many redirects");
  }
  const parsedUrl = new import_node_url.URL(url);
  const httpModule = parsedUrl.protocol === "https:" ? await import("https") : await import("http");
  const fileStats = await import_node_fs.promises.stat(filePath);
  const fileSize = fileStats.size;
  return new Promise((resolve, reject) => {
    const req = httpModule.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      headers: {
        ...headers,
        "Content-Length": fileSize
      },
      agent,
      timeout: timeoutMs
    }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const newUrl = new import_node_url.URL(res.headers.location, url).toString();
        resolve(uploadWithNodeHttp({
          url: newUrl,
          filePath,
          headers,
          timeoutMs,
          agent
        }, redirectCount + 1));
        return;
      }
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(void 0);
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Upload timeout"));
    });
    const stream = (0, import_node_fs.createReadStream)(filePath);
    stream.pipe(req);
    stream.on("error", (err) => {
      req.destroy();
      reject(err);
    });
  });
};
const uploadWithFetch = async ({ url, filePath, headers, timeoutMs, agent }) => {
  const nodeStream = (0, import_node_fs.createReadStream)(filePath);
  const webStream = import_node_stream.Readable.toWeb(nodeStream);
  const dispatcher = typeof agent?.dispatch === "function" ? agent : void 0;
  const response = await fetch(url, {
    ...dispatcher ? { dispatcher } : {},
    method: "POST",
    body: webStream,
    headers,
    duplex: "half",
    signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : void 0
  });
  try {
    return await response.json();
  } catch {
    return void 0;
  }
};
const uploadMedia = async (params, logger) => {
  if (isNodeRuntime()) {
    logger?.debug("Using Node.js https module for upload (avoids undici buffering bug)");
    return uploadWithNodeHttp(params);
  } else {
    logger?.debug("Using web-standard Fetch API for upload");
    return uploadWithFetch(params);
  }
};
const shouldIncludeServerTranscode = (mediaType) => !!(mediaType === "video" || mediaType === "gif" || mediaType === "ptv");
const getWAUploadToServer = ({ customUploadHosts, fetchAgent, logger, options }, refreshMediaConn) => {
  return async (filePath, { mediaType, fileEncSha256B64, timeoutMs, newsletter }) => {
    let uploadInfo = await refreshMediaConn(false);
    let urls;
    const hosts = [...customUploadHosts, ...uploadInfo.hosts];
    fileEncSha256B64 = encodeBase64EncodedStringForUpload(fileEncSha256B64);
    let optsHeaders = options?.headers;
    if (!optsHeaders)
      optsHeaders = {};
    optsHeaders = Array.isArray(optsHeaders) ? Object.fromEntries(optsHeaders) : optsHeaders;
    const headers = {
      ...optsHeaders,
      "Content-Type": "application/octet-stream",
      Origin: import_Defaults.DEFAULT_ORIGIN
    };
    for (const { hostname } of hosts) {
      logger.debug(`uploading to "${hostname}"`);
      const auth = encodeURIComponent(uploadInfo.auth);
      const mediaPathMap = newsletter ? import_Defaults.NEWSLETTER_MEDIA_PATH_MAP : import_Defaults.MEDIA_PATH_MAP;
      let url = `https://${hostname}${mediaPathMap[mediaType]}/${fileEncSha256B64}?auth=${auth}&token=${fileEncSha256B64}`;
      if (newsletter) {
        url += "&server_thumb_gen=1";
        if (shouldIncludeServerTranscode(mediaType)) {
          url += "&server_transcode=1";
        }
      }
      let result;
      try {
        result = await uploadMedia({
          url,
          filePath,
          headers,
          timeoutMs,
          agent: fetchAgent
        }, logger);
        if (result?.url || result?.direct_path) {
          urls = {
            mediaUrl: result.url || result.direct_path,
            directPath: result.direct_path,
            meta_hmac: result.meta_hmac,
            fbid: result.fbid,
            ts: result.ts,
            thumbnailDirectPath: result.thumbnail_info?.thumbnail_direct_path,
            thumbnailSha256: result.thumbnail_info?.thumbnail_sha256
          };
          break;
        } else {
          uploadInfo = await refreshMediaConn(true);
          throw new Error(`upload failed, reason: ${JSON.stringify(result)}`);
        }
      } catch (error) {
        const isLast = hostname === hosts[uploadInfo.hosts.length - 1]?.hostname;
        logger.warn({ trace: error?.stack, uploadResult: result }, `Error in uploading to ${hostname} ${isLast ? "" : ", retrying..."}`);
      }
    }
    if (!urls) {
      throw new import_Addon.HttpError("Media upload failed on all hosts", { statusCode: 500 });
    }
    return urls;
  };
};
const getMediaRetryKey = (mediaKey) => {
  return (0, import_crypto.hkdf)(mediaKey, 32, { info: "WhatsApp Media Retry Notification" });
};
const encryptMediaRetryRequest = (key, mediaKey, meId) => {
  const recp = { stanzaId: key.id };
  const recpBuffer = import_WAProto.proto.ServerErrorReceipt.encode(recp).finish();
  const iv = Crypto.randomBytes(12);
  const retryKey = getMediaRetryKey(mediaKey);
  const ciphertext = (0, import_crypto.aesEncryptGCM)(recpBuffer, retryKey, iv, Buffer.from(key.id));
  const req = {
    tag: "receipt",
    attrs: {
      id: key.id,
      to: (0, import_WABinary.jidNormalizedUser)(meId),
      type: "server-error"
    },
    content: [
      // this encrypt node is actually pretty useless
      // the media is returned even without this node
      // keeping it here to maintain parity with WA Web
      {
        tag: "encrypt",
        attrs: {},
        content: [
          { tag: "enc_p", attrs: {}, content: ciphertext },
          { tag: "enc_iv", attrs: {}, content: iv }
        ]
      },
      {
        tag: "rmr",
        attrs: {
          jid: key.remoteJid,
          from_me: (!!key.fromMe).toString(),
          // @ts-ignore
          participant: key.participant || void 0
        }
      }
    ]
  };
  return req;
};
const decodeMediaRetryNode = (node) => {
  const rmrNode = (0, import_WABinary.getBinaryNodeChild)(node, "rmr");
  const event = {
    key: {
      id: node.attrs.id,
      remoteJid: rmrNode.attrs.jid,
      fromMe: rmrNode.attrs.from_me === "true",
      participant: rmrNode.attrs.participant
    }
  };
  const errorNode = (0, import_WABinary.getBinaryNodeChild)(node, "error");
  if (errorNode) {
    const errorCode = +errorNode.attrs.code;
    event.error = new import_Addon.HttpError(`Failed to re-upload media (${errorCode})`, {
      data: errorNode.attrs,
      statusCode: getStatusCodeForMediaRetry(errorCode)
    });
  } else {
    const encryptedInfoNode = (0, import_WABinary.getBinaryNodeChild)(node, "encrypt");
    const ciphertext = (0, import_WABinary.getBinaryNodeChildBuffer)(encryptedInfoNode, "enc_p");
    const iv = (0, import_WABinary.getBinaryNodeChildBuffer)(encryptedInfoNode, "enc_iv");
    if (ciphertext && iv) {
      event.media = { ciphertext, iv };
    } else {
      event.error = new import_Addon.HttpError("Failed to re-upload media (missing ciphertext)", { statusCode: 404 });
    }
  }
  return event;
};
const decryptMediaRetryData = ({ ciphertext, iv }, mediaKey, msgId) => {
  const retryKey = getMediaRetryKey(mediaKey);
  const plaintext = (0, import_crypto.aesDecryptGCM)(ciphertext, retryKey, iv, Buffer.from(msgId));
  return import_WAProto.proto.MediaRetryNotification.decode(plaintext);
};
const getStatusCodeForMediaRetry = (code) => MEDIA_RETRY_STATUS_MAP[code];
const MEDIA_RETRY_STATUS_MAP = {
  [import_WAProto.proto.MediaRetryNotification.ResultType.SUCCESS]: 200,
  [import_WAProto.proto.MediaRetryNotification.ResultType.DECRYPTION_ERROR]: 412,
  [import_WAProto.proto.MediaRetryNotification.ResultType.NOT_FOUND]: 404,
  [import_WAProto.proto.MediaRetryNotification.ResultType.GENERAL_ERROR]: 418
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEF_MEDIA_HOST,
  decodeMediaRetryNode,
  decryptMediaRetryData,
  downloadContentFromMessage,
  downloadEncryptedContent,
  encodeBase64EncodedStringForUpload,
  encryptMediaRetryRequest,
  encryptedStream,
  extensionForMediaMessage,
  extractImageThumb,
  extractVideoThumb,
  generateProfilePicture,
  generateThumbnail,
  getAudioData,
  getHttpStream,
  getImageProcessingLibrary,
  getMediaKeys,
  getRawMediaUploadData,
  getStatusCodeForMediaRetry,
  getStream,
  getUrlFromDirectPath,
  getWAUploadToServer,
  hkdfInfoKey,
  mediaMessageSHA256B64,
  toBuffer,
  toReadable,
  uploadWithNodeHttp
});
