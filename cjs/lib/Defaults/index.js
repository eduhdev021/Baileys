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
var index_exports = {};
__export(index_exports, {
  BIZ_BOT_SUPPORT_PAYLOAD: () => BIZ_BOT_SUPPORT_PAYLOAD,
  CALL_AUDIO_PREFIX: () => CALL_AUDIO_PREFIX,
  CALL_VIDEO_PREFIX: () => CALL_VIDEO_PREFIX,
  DEFAULT_CACHE_TTLS: () => DEFAULT_CACHE_TTLS,
  DEFAULT_CONNECTION_CONFIG: () => DEFAULT_CONNECTION_CONFIG,
  DEFAULT_ORIGIN: () => DEFAULT_ORIGIN,
  DEF_CALLBACK_PREFIX: () => DEF_CALLBACK_PREFIX,
  DEF_TAG_PREFIX: () => DEF_TAG_PREFIX,
  DICT_VERSION: () => DICT_VERSION,
  DONATE_URL: () => DONATE_URL,
  HISTORY_SYNC_PAUSED_TIMEOUT_MS: () => HISTORY_SYNC_PAUSED_TIMEOUT_MS,
  INITIAL_PREKEY_COUNT: () => INITIAL_PREKEY_COUNT,
  KEY_BUNDLE_TYPE: () => KEY_BUNDLE_TYPE,
  LEXER_REGEX: () => LEXER_REGEX,
  LIBRARY_NAME: () => LIBRARY_NAME,
  MEDIA_HKDF_KEY_MAPPING: () => MEDIA_HKDF_KEY_MAPPING,
  MEDIA_KEYS: () => MEDIA_KEYS,
  MEDIA_PATH_MAP: () => MEDIA_PATH_MAP,
  MIN_PREKEY_COUNT: () => MIN_PREKEY_COUNT,
  NEWSLETTER_MEDIA_PATH_MAP: () => NEWSLETTER_MEDIA_PATH_MAP,
  NOISE_MODE: () => NOISE_MODE,
  NOISE_WA_HEADER: () => NOISE_WA_HEADER,
  PHONE_CONNECTION_CB: () => PHONE_CONNECTION_CB,
  PLACEHOLDER_MAX_AGE_SECONDS: () => PLACEHOLDER_MAX_AGE_SECONDS,
  PROCESSABLE_HISTORY_TYPES: () => PROCESSABLE_HISTORY_TYPES,
  STATUS_EXPIRY_SECONDS: () => STATUS_EXPIRY_SECONDS,
  TEXT_DECODER: () => TEXT_DECODER,
  TEXT_ENCODER: () => TEXT_ENCODER,
  TimeMs: () => TimeMs,
  UNAUTHORIZED_CODES: () => UNAUTHORIZED_CODES,
  UPLOAD_TIMEOUT: () => UPLOAD_TIMEOUT,
  URL_REGEX: () => URL_REGEX,
  WA_ADV_ACCOUNT_SIG_PREFIX: () => WA_ADV_ACCOUNT_SIG_PREFIX,
  WA_ADV_DEVICE_SIG_PREFIX: () => WA_ADV_DEVICE_SIG_PREFIX,
  WA_ADV_HOSTED_ACCOUNT_SIG_PREFIX: () => WA_ADV_HOSTED_ACCOUNT_SIG_PREFIX,
  WA_ADV_HOSTED_DEVICE_SIG_PREFIX: () => WA_ADV_HOSTED_DEVICE_SIG_PREFIX,
  WA_CERT_DETAILS: () => WA_CERT_DETAILS,
  WA_DEFAULT_EPHEMERAL: () => WA_DEFAULT_EPHEMERAL,
  WEBSOCKET_STATES: () => WEBSOCKET_STATES
});
module.exports = __toCommonJS(index_exports);
var import_WAProto = require("../../WAProto/index.js");
var import_libsignal = require("../Signal/libsignal.js");
var import_browser_utils = require("../Utils/browser-utils.js");
var import_logger = __toESM(require("../Utils/logger.js"));
const version = [2, 3e3, 1054623785];
const UNAUTHORIZED_CODES = [401, 403, 419];
const BIZ_BOT_SUPPORT_PAYLOAD = '{"version":1,"is_ai_message":true,"should_upload_client_logs":false,"should_show_system_message":false,"ticket_id":"7004947587700716","citation_items":[],"ticket_locale":"us"}';
const DEFAULT_ORIGIN = "https://web.whatsapp.com";
const CALL_VIDEO_PREFIX = "https://call.whatsapp.com/video/";
const CALL_AUDIO_PREFIX = "https://call.whatsapp.com/voice/";
const DONATE_URL = "https://github.com/eduh_dev021/baileys";
const LIBRARY_NAME = "eduh_dev021/baileys";
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();
const DEF_CALLBACK_PREFIX = "CB:";
const DEF_TAG_PREFIX = "TAG:";
const PHONE_CONNECTION_CB = "CB:Pong";
const WA_ADV_ACCOUNT_SIG_PREFIX = Buffer.from([6, 0]);
const WA_ADV_DEVICE_SIG_PREFIX = Buffer.from([6, 1]);
const WA_ADV_HOSTED_ACCOUNT_SIG_PREFIX = Buffer.from([6, 5]);
const WA_ADV_HOSTED_DEVICE_SIG_PREFIX = Buffer.from([6, 6]);
const WA_DEFAULT_EPHEMERAL = 7 * 24 * 60 * 60;
const STATUS_EXPIRY_SECONDS = 24 * 60 * 60;
const PLACEHOLDER_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;
const NOISE_MODE = "Noise_XX_25519_AESGCM_SHA256\0\0\0\0";
const DICT_VERSION = 3;
const KEY_BUNDLE_TYPE = Buffer.from([5]);
const NOISE_WA_HEADER = Buffer.from([87, 65, 6, DICT_VERSION]);
const LEXER_REGEX = /(\/\/.*|\/\*[\s\S]*?\*\/|#.*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[\s\S]*?`)|(\b[a-zA-Z_]\w*\b)(?=\s*\()|(\b[a-zA-Z_]\w*\b)|(\b\d+(?:\.\d+)?\b)|(\s+|[^\w\s]+)/g;
const URL_REGEX = /https:\/\/(?![^:@\/\s]+:[^:@\/\s]+@)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(:\d+)?(\/[^\s]*)?/g;
const WA_CERT_DETAILS = {
  SERIAL: 0,
  ISSUER: "WhatsAppLongTerm1",
  PUBLIC_KEY: Buffer.from("142375574d0a587166aae71ebe516437c4a28b73e3695c6ce1f7f9545da8ee6b", "hex")
};
const PROCESSABLE_HISTORY_TYPES = [
  import_WAProto.proto.HistorySync.HistorySyncType.INITIAL_BOOTSTRAP,
  import_WAProto.proto.HistorySync.HistorySyncType.INITIAL_STATUS_V3,
  import_WAProto.proto.HistorySync.HistorySyncType.FULL,
  import_WAProto.proto.HistorySync.HistorySyncType.RECENT,
  import_WAProto.proto.HistorySync.HistorySyncType.PUSH_NAME,
  import_WAProto.proto.HistorySync.HistorySyncType.NON_BLOCKING_DATA,
  import_WAProto.proto.HistorySync.HistorySyncType.ON_DEMAND
];
const DEFAULT_CACHE_TTLS = {
  SIGNAL_STORE: 5 * 60,
  // 5 minutes
  MSG_RETRY: 60 * 60,
  // 1 hour
  CALL_OFFER: 5 * 60,
  // 5 minutes
  USER_DEVICES: 5 * 60
  // 5 minutes
};
const DEFAULT_CONNECTION_CONFIG = {
  version,
  browser: import_browser_utils.Browsers.macOS("Chrome"),
  waWebSocketUrl: "wss://web.whatsapp.com/ws/chat",
  connectTimeoutMs: 3e4,
  keepAliveIntervalMs: 15e3,
  logger: import_logger.default.child({ class: "baileys" }),
  emitOwnEvents: true,
  defaultQueryTimeoutMs: 3e4,
  customUploadHosts: [],
  retryRequestDelayMs: 750,
  maxMsgRetryCount: 3,
  fireInitQueries: true,
  auth: void 0,
  markOnlineOnConnect: true,
  syncFullHistory: true,
  patchMessageBeforeSending: (msg) => msg,
  shouldSyncHistoryMessage: ({ syncType }) => {
    return syncType !== import_WAProto.proto.HistorySync.HistorySyncType.FULL;
  },
  shouldIgnoreJid: () => false,
  linkPreviewImageThumbnailWidth: 192,
  transactionOpts: { maxCommitRetries: 5, delayBetweenTriesMs: 2e3 },
  generateHighQualityLinkPreview: false,
  enableAutoSessionRecreation: true,
  enableRecentMessageCache: true,
  options: {},
  appStateMacVerification: {
    patch: false,
    snapshot: false
  },
  countryCode: "US",
  getMessage: async () => void 0,
  cachedGroupMetadata: async () => void 0,
  makeSignalRepository: import_libsignal.makeLibSignalRepository
};
const MEDIA_PATH_MAP = {
  image: "/mms/image",
  video: "/mms/video",
  audio: "/mms/audio",
  document: "/mms/document",
  sticker: "/mms/image",
  gif: "/mms/gif",
  ptt: "/mms/ptt",
  ptv: "/mms/video",
  ppic: "/pps/photo",
  "ads-image": "/mms/ads-image",
  "ads-video": "/mms/ads-video",
  "biz-cover-photo": "/pps/biz-cover-photo",
  "group-history": "/mms/group-history",
  "md-app-state": "/mms/md-app-state",
  "md-msg-hist": "/mms/md-msg-hist",
  "music-artwork": "/mms/music-artwork",
  "product-catalog-image": "/product/image",
  "sticker-pack": "/mms/sticker-pack",
  "thumbnail-document": "/mms/thumbnail-document",
  "thumbnail-image": "/mms/thumbnail-image",
  "thumbnail-link": "/mms/thumbnail-link",
  "thumbnail-sticker-pack": "/mms/thumbnail-sticker-pack",
  "thumbnail-video": "/mms/thumbnail-video",
  "maiba-file": "/wa-ai/maiba-file"
};
const NEWSLETTER_MEDIA_PATH_MAP = {
  image: "/newsletter/newsletter-image",
  video: "/newsletter/newsletter-video",
  audio: "/newsletter/newsletter-audio",
  document: "/newsletter/newsletter-document",
  sticker: "/newsletter/newsletter-sticker",
  gif: "/newsletter/newsletter-gif",
  ptt: "/newsletter/newsletter-ptt",
  ptv: "/newsletter/newsletter-ptv",
  "music-artwork": "/mms/newsletter-music-artwork",
  "sticker-pack": "/newsletter/newsletter-sticker-pack",
  "thumbnail-link": "/newsletter/newsletter-thumbnail-link",
  "waffle-image": "/mms/waffle-image",
  "waffle-video": "/mms/waffle-video"
};
const MEDIA_HKDF_KEY_MAPPING = {
  audio: "Audio",
  document: "Document",
  gif: "Video",
  history: "History",
  image: "Image",
  product: "Image",
  ppic: "",
  ptt: "Audio",
  sticker: "Image",
  video: "Video",
  "group-history": "Group History",
  "ads-image": "ads-image",
  "ads-video": "ads-video",
  "sticker-pack": "Sticker Pack",
  "thumbnail-sticker-pack": "Sticker Pack Thumbnail",
  "thumbnail-document": "Document Thumbnail",
  "thumbnail-image": "Image Thumbnail",
  "thumbnail-video": "Video Thumbnail",
  "thumbnail-link": "Link Thumbnail",
  "md-msg-hist": "History",
  "md-app-state": "App State",
  "product-catalog-image": "Image",
  "payment-bg-image": "Payment Background",
  ptv: "Video",
  "biz-cover-photo": "Image",
  "music-artwork": "Music Artwork",
  "maiba-file": "Document",
  location: "Location",
  contact: "Contact",
  "voip-token": "Voip Token"
};
const MEDIA_KEYS = Object.keys(MEDIA_PATH_MAP);
const HISTORY_SYNC_PAUSED_TIMEOUT_MS = 12e4;
const MIN_PREKEY_COUNT = 5;
const INITIAL_PREKEY_COUNT = 812;
const UPLOAD_TIMEOUT = 3e4;
const TimeMs = {
  Minute: 60 * 1e3,
  Hour: 60 * 60 * 1e3,
  Day: 24 * 60 * 60 * 1e3,
  Week: 7 * 24 * 60 * 60 * 1e3
};
const WEBSOCKET_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BIZ_BOT_SUPPORT_PAYLOAD,
  CALL_AUDIO_PREFIX,
  CALL_VIDEO_PREFIX,
  DEFAULT_CACHE_TTLS,
  DEFAULT_CONNECTION_CONFIG,
  DEFAULT_ORIGIN,
  DEF_CALLBACK_PREFIX,
  DEF_TAG_PREFIX,
  DICT_VERSION,
  DONATE_URL,
  HISTORY_SYNC_PAUSED_TIMEOUT_MS,
  INITIAL_PREKEY_COUNT,
  KEY_BUNDLE_TYPE,
  LEXER_REGEX,
  LIBRARY_NAME,
  MEDIA_HKDF_KEY_MAPPING,
  MEDIA_KEYS,
  MEDIA_PATH_MAP,
  MIN_PREKEY_COUNT,
  NEWSLETTER_MEDIA_PATH_MAP,
  NOISE_MODE,
  NOISE_WA_HEADER,
  PHONE_CONNECTION_CB,
  PLACEHOLDER_MAX_AGE_SECONDS,
  PROCESSABLE_HISTORY_TYPES,
  STATUS_EXPIRY_SECONDS,
  TEXT_DECODER,
  TEXT_ENCODER,
  TimeMs,
  UNAUTHORIZED_CODES,
  UPLOAD_TIMEOUT,
  URL_REGEX,
  WA_ADV_ACCOUNT_SIG_PREFIX,
  WA_ADV_DEVICE_SIG_PREFIX,
  WA_ADV_HOSTED_ACCOUNT_SIG_PREFIX,
  WA_ADV_HOSTED_DEVICE_SIG_PREFIX,
  WA_CERT_DETAILS,
  WA_DEFAULT_EPHEMERAL,
  WEBSOCKET_STATES
});
