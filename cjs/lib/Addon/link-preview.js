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
  getLinkPreview: () => getLinkPreview
});
module.exports = __toCommonJS(link_preview_exports);
var import_Defaults = require("../Defaults/index.js");
var import_http_error = require("./http-error.js");
const MAX = 262144;
const TAG = /<(meta|link)\b([^>]*)>|<title[^>]*>([^<]*)/gi;
const ATTR = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
const ENT = /&(?:#(\d+)|#x([\da-f]+)|(amp|lt|gt|quot|apos));/gi;
const MAP = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const txt = (s) => s && s.replace(ENT, (_, d, h, n) => {
  if (n)
    return MAP[n.toLowerCase()];
  const c = d ? +d : parseInt(h, 16);
  return c <= 1114111 ? String.fromCodePoint(c) : "";
}).replace(/\s+/g, " ").trim();
async function readHead(res) {
  let html = "";
  for await (const chunk of res.body) {
    html += import_Defaults.TEXT_DECODER.decode(chunk, { stream: true });
    const i = html.search(/<\/head>|<body/i);
    if (i !== -1)
      return html.slice(0, i);
    if (html.length > MAX)
      break;
  }
  return html;
}
async function getLinkPreview(url, timeout = 3e3) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeout),
    headers: {
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)"
    }
  });
  if (!res.ok)
    throw new import_http_error.HttpError(`HTTP ${res.status} ${res.statusText}`);
  if (!/html/i.test(res.headers.get("content-type") ?? "")) {
    await res.body?.cancel();
    return { url: res.url };
  }
  const base = res.url;
  const abs = (v) => {
    try {
      return v && new URL(v, base).href;
    } catch {
    }
  };
  const m = {};
  let title, icon;
  for (const [, kind, attrs, t] of (await readHead(res)).matchAll(TAG)) {
    if (t !== void 0) {
      title ?? (title = t);
      continue;
    }
    const a = {};
    for (const x of attrs.matchAll(ATTR))
      a[x[1].toLowerCase()] = x[2] ?? x[3] ?? x[4];
    if (kind.toLowerCase() === "meta") {
      const k = (a.property ?? a.name ?? a.itemprop)?.toLowerCase();
      if (k && a.content)
        m[k] ?? (m[k] = a.content);
    } else if (a.href) {
      const r = a.rel?.toLowerCase() ?? "";
      if (/(^|\s)icon(\s|$)/.test(r))
        icon ?? (icon = a.href);
      else if (r === "image_src")
        m.image_src ?? (m.image_src = a.href);
    }
  }
  return {
    url: base,
    title: txt(m["og:title"] ?? m["twitter:title"] ?? title),
    description: txt(m["og:description"] ?? m["twitter:description"] ?? m.description),
    favicon: abs(icon ?? "/favicon.ico"),
    image: abs(m["og:image"] ?? m["og:image:secure_url"] ?? m["twitter:image"] ?? m["twitter:image:src"] ?? m.image ?? m.image_src),
    video: abs(m["og:video"] ?? m["og:video:secure_url"] ?? m["og:video:url"] ?? m["twitter:player:stream"])
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getLinkPreview
});
