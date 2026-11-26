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
var qr_exports = {};
__export(qr_exports, {
  encodeQR: () => encodeQR
});
module.exports = __toCommonJS(qr_exports);
var import_node_zlib = require("node:zlib");
var import_crc32 = require("./crc32.js");
const ECC_CODEWORDS_PER_BLOCK = [
  // Low
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  // Medium
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  // Quartile
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  // High
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
];
const NUM_ERROR_CORRECTION_BLOCKS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
];
const ECC_FORMAT_BITS = { L: 1, M: 0, Q: 3, H: 2 };
const PENALTY_N1 = 3, PENALTY_N2 = 3, PENALTY_N3 = 40, PENALTY_N4 = 10;
function rsDivisor(degree) {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      let z = 0;
      for (let bit = 7; bit >= 0; bit--) {
        z = z << 1 ^ (z >>> 7) * 285;
        z ^= (root >>> bit & 1) * result[j];
      }
      result[j] = z & 255;
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = rsMultiply(root, 2);
  }
  return result;
}
function rsMultiply(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = z << 1 ^ (z >>> 7) * 285;
    z ^= (y >>> i & 1) * x;
  }
  return z & 255;
}
function rsRemainder(data, divisor) {
  const result = new Uint8Array(divisor.length);
  for (const b of data) {
    const factor = b ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < divisor.length; i++) {
      result[i] ^= rsMultiply(divisor[i], factor);
    }
  }
  return result;
}
function numRawDataModules(ver) {
  let result = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (ver >= 7) result -= 36;
  }
  return result;
}
function numDataCodewords(ver, level) {
  return Math.floor(numRawDataModules(ver) / 8) - ECC_CODEWORDS_PER_BLOCK[level][ver] * NUM_ERROR_CORRECTION_BLOCKS[level][ver];
}
function alignmentPositions(size, ver) {
  if (ver === 1) return [];
  const numAlign = Math.floor(ver / 7) + 2;
  const step = Math.floor((ver * 8 + numAlign * 3 + 5) / (numAlign * 4 - 4)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) {
    result.splice(1, 0, pos);
  }
  return result;
}
class QrMatrix {
  constructor(version) {
    this.version = version;
    this.size = version * 4 + 17;
    this.modules = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
    this.isFunction = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
  }
  set(x, y, dark) {
    this.modules[y][x] = dark;
    this.isFunction[y][x] = true;
  }
  drawFunctionPatterns(level) {
    for (let i = 0; i < this.size; i++) {
      this.set(6, i, i % 2 === 0);
      this.set(i, 6, i % 2 === 0);
    }
    for (const [cx, cy] of [[3, 3], [this.size - 4, 3], [3, this.size - 4]]) {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const dist = Math.max(Math.abs(dx), Math.abs(dy));
          const x = cx + dx, y = cy + dy;
          if (x >= 0 && x < this.size && y >= 0 && y < this.size) {
            this.set(x, y, dist !== 2 && dist !== 4);
          }
        }
      }
    }
    const positions = alignmentPositions(this.size, this.version);
    for (let i = 0; i < positions.length; i++) {
      for (let j = 0; j < positions.length; j++) {
        const isCorner = i === 0 && j === 0 || i === 0 && j === positions.length - 1 || i === positions.length - 1 && j === 0;
        if (!isCorner) this.drawAlignment(positions[i], positions[j]);
      }
    }
    this.drawFormatBits(level, 0);
    this.drawVersionBits();
  }
  drawAlignment(cx, cy) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }
  drawFormatBits(level, mask) {
    const data = ECC_FORMAT_BITS[level] << 3 | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) {
      rem = rem << 1 ^ (rem >>> 9) * 1335;
    }
    const bits = (data << 10 | rem) ^ 21522;
    const bitAt = (i) => (bits >>> i & 1) !== 0;
    for (let i = 0; i <= 5; i++) this.set(8, i, bitAt(i));
    this.set(8, 7, bitAt(6));
    this.set(8, 8, bitAt(7));
    this.set(7, 8, bitAt(8));
    for (let i = 9; i < 15; i++) this.set(14 - i, 8, bitAt(i));
    for (let i = 0; i < 8; i++) this.set(this.size - 1 - i, 8, bitAt(i));
    for (let i = 8; i < 15; i++) this.set(8, this.size - 15 + i, bitAt(i));
    this.set(8, this.size - 8, true);
  }
  drawVersionBits() {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i++) {
      rem = rem << 1 ^ (rem >>> 11) * 7973;
    }
    const bits = this.version << 12 | rem;
    for (let i = 0; i < 18; i++) {
      const dark = (bits >>> i & 1) !== 0;
      const a = this.size - 11 + i % 3;
      const b = Math.floor(i / 3);
      this.set(a, b, dark);
      this.set(b, a, dark);
    }
  }
  /** Places the interleaved codewords into the non-function modules. */
  drawCodewords(data) {
    let bitIndex = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < this.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = (right + 1 & 2) === 0;
          const y = upward ? this.size - 1 - vert : vert;
          if (!this.isFunction[y][x] && bitIndex < data.length * 8) {
            this.modules[y][x] = (data[bitIndex >>> 3] >>> 7 - (bitIndex & 7) & 1) !== 0;
            bitIndex++;
          }
        }
      }
    }
  }
  applyMask(mask) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        let invert;
        switch (mask) {
          case 0:
            invert = (x + y) % 2 === 0;
            break;
          case 1:
            invert = y % 2 === 0;
            break;
          case 2:
            invert = x % 3 === 0;
            break;
          case 3:
            invert = (x + y) % 3 === 0;
            break;
          case 4:
            invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
            break;
          case 5:
            invert = x * y % 2 + x * y % 3 === 0;
            break;
          case 6:
            invert = (x * y % 2 + x * y % 3) % 2 === 0;
            break;
          case 7:
            invert = ((x + y) % 2 + x * y % 3) % 2 === 0;
            break;
        }
        if (!this.isFunction[y][x] && invert) {
          this.modules[y][x] = !this.modules[y][x];
        }
      }
    }
  }
  penaltyScore() {
    const size = this.size;
    let result = 0;
    const lines = [];
    for (let y = 0; y < size; y++) lines.push({ get: (i) => this.modules[y][i] });
    for (let x = 0; x < size; x++) lines.push({ get: (i) => this.modules[i][x] });
    for (const line of lines) {
      let runColor = line.get(0);
      let runLength = 1;
      const runs = [];
      for (let i = 1; i < size; i++) {
        if (line.get(i) === runColor) {
          runLength++;
        } else {
          runs.push({ color: runColor, length: runLength });
          runColor = line.get(i);
          runLength = 1;
        }
      }
      runs.push({ color: runColor, length: runLength });
      for (const run of runs) {
        if (run.length >= 5) result += PENALTY_N1 + (run.length - 5);
      }
      let s = "";
      for (let i = 0; i < size; i++) s += line.get(i) ? "1" : "0";
      result += countFinderPatterns("0".repeat(size) + s + "0".repeat(size)) * PENALTY_N3;
    }
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = this.modules[y][x];
        if (c === this.modules[y][x + 1] && c === this.modules[y + 1][x] && c === this.modules[y + 1][x + 1]) {
          result += PENALTY_N2;
        }
      }
    }
    let dark = 0;
    for (const row of this.modules) {
      for (const cell of row) if (cell) dark++;
    }
    const total = size * size;
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
    result += Math.max(0, k) * PENALTY_N4;
    return result;
  }
  clone() {
    const copy = new QrMatrix(this.version);
    for (let y = 0; y < this.size; y++) {
      copy.modules[y] = [...this.modules[y]];
      copy.isFunction[y] = [...this.isFunction[y]];
    }
    return copy;
  }
}
function countFinderPatterns(s) {
  let count = 0;
  for (let i = 0; i + 7 <= s.length; i++) {
    if (s.startsWith("1011101", i)) {
      const lightBefore = i >= 4 && s.slice(i - 4, i) === "0000";
      const lightAfter = s.slice(i + 7, i + 11) === "0000";
      if (lightBefore || lightAfter) count++;
    }
  }
  return count;
}
function buildCodewords(text, level) {
  const data = Buffer.from(text, "utf8");
  if (data.length > 2953) {
    throw new RangeError("QR payload too long (byte mode supports up to 2953 bytes at ECC L)");
  }
  let version = 0;
  let usedBits = 0;
  for (let v = 1; v <= 40; v++) {
    const capacityBits2 = numDataCodewords(v, 0) * 8;
    const bits2 = 4 + (v <= 9 ? 8 : 16) + data.length * 8;
    if (bits2 <= capacityBits2) {
      version = v;
      usedBits = bits2;
      break;
    }
  }
  if (version === 0) {
    throw new RangeError("QR payload too long (exceeds version 40 capacity)");
  }
  let levelIndex = 0;
  const levels = ["L", "M", "Q", "H"];
  for (let i = 1; i < 4; i++) {
    if (usedBits <= numDataCodewords(version, i) * 8) levelIndex = i;
  }
  const levelName = levels[levelIndex];
  const capacityBits = numDataCodewords(version, levelIndex) * 8;
  const bits = [];
  const appendBits = (value, length) => {
    for (let i = length - 1; i >= 0; i--) bits.push(value >>> i & 1);
  };
  appendBits(4, 4);
  appendBits(data.length, version <= 9 ? 8 : 16);
  for (const byte of data) appendBits(byte, 8);
  appendBits(0, Math.min(4, capacityBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  for (let pad = 236; bits.length < capacityBits; pad ^= 236 ^ 17) {
    appendBits(pad, 8);
  }
  const dataCodewords = new Uint8Array(bits.length / 8);
  for (let i = 0; i < dataCodewords.length; i++) {
    for (let j = 0; j < 8; j++) {
      dataCodewords[i] = dataCodewords[i] << 1 | bits[i * 8 + j];
    }
  }
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[levelIndex][version];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[levelIndex][version];
  const rawCodewords = Math.floor(numRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - rawCodewords % numBlocks;
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);
  const blocks = [];
  const divisor = rsDivisor(blockEccLen);
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = dataCodewords.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, divisor);
    const isShort = i < numShortBlocks;
    const block = new Uint8Array(dat.length + ecc.length + (isShort ? 1 : 0));
    block.set(dat, 0);
    if (isShort) block[dat.length] = 0;
    block.set(ecc, dat.length + (isShort ? 1 : 0));
    blocks.push(block);
  }
  const result = [];
  for (let i = 0; i < blocks[0].length; i++) {
    for (let j = 0; j < numBlocks; j++) {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) {
        result.push(blocks[j][i]);
      }
    }
  }
  return { version, levelName, codewords: new Uint8Array(result) };
}
function encodeMatrix(text) {
  const { version, levelName, codewords } = buildCodewords(text);
  let best = null;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const matrix = new QrMatrix(version);
    matrix.drawFunctionPatterns(levelName);
    matrix.drawCodewords(codewords);
    matrix.applyMask(mask);
    matrix.drawFormatBits(levelName, mask);
    const penalty = matrix.penaltyScore();
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      best = matrix;
    }
  }
  return best;
}
function renderAscii(matrix) {
  const border = 2;
  const size = matrix.size + border * 2;
  const get = (x, y) => {
    const mx = x - border, my = y - border;
    if (mx < 0 || my < 0 || mx >= matrix.size || my >= matrix.size) return false;
    return matrix.modules[my][mx];
  };
  const lines = [];
  for (let y = 0; y < size; y += 2) {
    let line = "";
    for (let x = 0; x < size; x++) {
      const top = get(x, y);
      const bottom = y + 1 < size ? get(x, y + 1) : false;
      if (top && bottom) line += "\u2588";
      else if (top) line += "\u2580";
      else if (bottom) line += "\u2584";
      else line += " ";
    }
    lines.push(line);
  }
  return lines.join("\n") + "\n";
}
function renderPng(matrix, scale, border) {
  const dim = (matrix.size + border * 2) * scale;
  const width = dim, height = dim;
  const stride = width + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const mx = Math.floor(x / scale) - border;
      const my = Math.floor(y / scale) - border;
      const dark = mx >= 0 && my >= 0 && mx < matrix.size && my < matrix.size && matrix.modules[my][mx];
      raw[rowStart + 1 + x] = dark ? 0 : 255;
    }
  }
  const IHDR = Buffer.alloc(13);
  IHDR.writeUInt32BE(width, 0);
  IHDR.writeUInt32BE(height, 4);
  IHDR[8] = 8;
  IHDR[9] = 0;
  IHDR[10] = 0;
  IHDR[11] = 0;
  IHDR[12] = 0;
  const chunks = [];
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "latin1");
    const crcBuf = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE((0, import_crc32.crc32)(crcBuf), 0);
    chunks.push(len, typeBuf, data, crc);
  };
  chunk("IHDR", IHDR);
  chunk("IDAT", (0, import_node_zlib.deflateSync)(raw, { level: 9 }));
  chunk("IEND", Buffer.alloc(0));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ...chunks]);
}
async function encodeQR(text) {
  if (typeof text !== "string") {
    throw new TypeError("encodeQR: expects a string payload");
  }
  const matrix = encodeMatrix(text);
  return {
    ascii: renderAscii(matrix),
    getPngBuffer: async () => renderPng(matrix, 8, 4),
    getRaw: async () => matrix.modules.map((row) => [...row]),
    version: matrix.version,
    errorCorrectionLevel: "L"
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  encodeQR
});
