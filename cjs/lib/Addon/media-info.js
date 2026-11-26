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
var media_info_exports = {};
__export(media_info_exports, {
  detectMediaInfo: () => detectMediaInfo
});
module.exports = __toCommonJS(media_info_exports);
var import_node_child_process = require("node:child_process");
const PROBE_TIMEOUT_MS = 15e3;
function runFfprobe(args, stdinData) {
  return new Promise((resolve, reject) => {
    const child = (0, import_node_child_process.spawn)("ffprobe", [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      ...args
    ], { stdio: stdinData ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("ffprobe timed out"));
    }, PROBE_TIMEOUT_MS);
    child.stdout.on("data", (c) => stdout += c);
    child.stderr.on("data", (c) => stderr += c);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `ffprobe exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve({});
      }
    });
    if (stdinData) {
      child.stdin.on("error", () => {
      });
      child.stdin.end(stdinData);
    }
  });
}
function mapProbeReport(report) {
  const info = {};
  const duration = Number(report?.format?.duration);
  if (Number.isFinite(duration)) {
    info.durationSeconds = Math.round(duration);
  }
  const streams = Array.isArray(report?.streams) ? report.streams : [];
  const video = streams.find((s) => s.width && s.height || s.codec_type === "video");
  if (video?.width && video?.height) {
    info.width = video.width;
    info.height = video.height;
  }
  return info;
}
async function detectMediaInfo(input) {
  let args;
  let stdinData;
  if (typeof input === "string") {
    args = [input];
  } else if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
    args = ["-i", "pipe:0"];
    stdinData = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  } else {
    throw new TypeError("detectMediaInfo: expects a Buffer, Uint8Array or a file path");
  }
  const report = await runFfprobe(args, stdinData);
  return mapProbeReport(report);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  detectMediaInfo
});
