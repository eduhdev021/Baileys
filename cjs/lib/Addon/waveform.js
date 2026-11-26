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
var waveform_exports = {};
__export(waveform_exports, {
  getAudioWaveform: () => getAudioWaveform
});
module.exports = __toCommonJS(waveform_exports);
var import_node_child_process = require("node:child_process");
const SAMPLE_RATE = 16e3;
const BAR_COUNT = 64;
const TIMEOUT_MS = 3e4;
function decodePcm(input) {
  let args;
  let stdinData;
  if (typeof input === "string") {
    args = ["-i", input];
  } else if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
    args = ["-i", "pipe:0"];
    stdinData = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  } else if (input && typeof input.pipe === "function") {
    args = ["-i", "pipe:0"];
    stdinData = input;
  } else {
    return Promise.reject(new TypeError("getAudioWaveform: expects a path, Buffer/Uint8Array or Readable"));
  }
  return new Promise((resolve, reject) => {
    const child = (0, import_node_child_process.spawn)("ffmpeg", [
      "-v",
      "error",
      ...args,
      "-vn",
      // ignore cover art video streams
      "-map",
      "a:0?",
      // first audio stream, when present
      "-f",
      "s16le",
      "-acodec",
      "pcm_s16le",
      "-ac",
      "1",
      "-ar",
      String(SAMPLE_RATE),
      "pipe:1"
    ], { stdio: ["pipe", "pipe", "pipe"] });
    const chunks = [];
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      settleReject("ffmpeg timed out");
    }, TIMEOUT_MS);
    function settleReject(message) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(message || "ffmpeg failed"));
    }
    function settleResolve(value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    }
    child.stdout.on("data", (c) => chunks.push(c));
    child.stderr.on("data", (c) => stderr += c);
    child.on("error", (err) => settleReject(err.message));
    child.on("close", (code) => {
      const pcm = Buffer.concat(chunks);
      if (code !== 0 || pcm.length === 0) {
        settleReject(stderr.trim() || "no audio stream found in the input");
        return;
      }
      settleResolve({ samples: pcm });
    });
    if (stdinData) {
      child.stdin.on("error", () => {
      });
      if (typeof stdinData.pipe === "function") stdinData.pipe(child.stdin);
      else child.stdin.end(stdinData);
    }
  });
}
function computeWaveform(samples) {
  const frameCount = Math.floor(samples.length / 2);
  if (frameCount === 0) return { durationSeconds: 0, waveform: new Array(BAR_COUNT).fill(0) };
  const barFrames = frameCount / BAR_COUNT;
  const peaks = new Array(BAR_COUNT).fill(0);
  let globalPeak = 0;
  for (let bar = 0; bar < BAR_COUNT; bar++) {
    const start = Math.floor(bar * barFrames);
    const end = Math.min(frameCount, Math.floor((bar + 1) * barFrames));
    let peak = 0;
    for (let i = start; i < end; i++) {
      const s = Math.abs(samples.readInt16LE(i * 2));
      if (s > peak) peak = s;
    }
    peaks[bar] = peak;
    if (peak > globalPeak) globalPeak = peak;
  }
  const waveform = peaks.map((peak) => {
    if (globalPeak === 0) return 0;
    return Math.max(0, Math.min(100, Math.round(peak / globalPeak * 100)));
  });
  const durationSeconds = Math.round(frameCount / SAMPLE_RATE);
  return { durationSeconds, waveform };
}
async function getAudioWaveform(input) {
  const { samples } = await decodePcm(input);
  return computeWaveform(samples);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getAudioWaveform
});
