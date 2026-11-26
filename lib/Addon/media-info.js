/**
 * `detectMediaInfo` — light-weight media probing on top of the system
 * `ffprobe` binary (ships with ffmpeg). Returns the dimensions and/or
 * duration of an image, audio or video file:
 *
 *   await detectMediaInfo('/tmp/photo.jpg');   // -> { width: 640, height: 480, durationSeconds: 0 }
 *   await detectMediaInfo(voiceNoteBuffer);    // -> { durationSeconds: 12 }
 *   await detectMediaInfo('/tmp/clip.mp4');    // -> { durationSeconds: 9, width: 1280, height: 720 }
 *
 * Buffers are probed through stdin, paths are probed directly. Resolves to
 * `{}` when the container cannot be parsed and throws (with ffprobe's stderr)
 * when the input is not recognizable media at all.
 */
import { spawn } from 'node:child_process';

const PROBE_TIMEOUT_MS = 15_000;

function runFfprobe(args, stdinData) {
    return new Promise((resolve, reject) => {
        const child = spawn('ffprobe', [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            ...args
        ], { stdio: stdinData ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'] });

        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => {
            child.kill('SIGKILL');
            reject(new Error('ffprobe timed out'));
        }, PROBE_TIMEOUT_MS);

        child.stdout.on('data', c => (stdout += c));
        child.stderr.on('data', c => (stderr += c));
        child.on('error', err => { clearTimeout(timer); reject(err); });
        child.on('close', code => {
            clearTimeout(timer);
            if (code !== 0) {
                reject(new Error(stderr.trim() || `ffprobe exited with code ${code}`));
                return;
            }
            try {
                resolve(JSON.parse(stdout));
            }
            catch {
                resolve({});
            }
        });

        if (stdinData) {
            child.stdin.on('error', () => { /* ffprobe may close stdin early — ignore */ });
            child.stdin.end(stdinData);
        }
    });
}

/** Maps an ffprobe JSON report onto the compact info shape. */
function mapProbeReport(report) {
    const info = {};
    const duration = Number(report?.format?.duration);
    if (Number.isFinite(duration)) {
        info.durationSeconds = Math.round(duration);
    }
    const streams = Array.isArray(report?.streams) ? report.streams : [];
    const video = streams.find(s => (s.width && s.height) || s.codec_type === 'video');
    if (video?.width && video?.height) {
        info.width = video.width;
        info.height = video.height;
    }
    return info;
}

/**
 * Probes a Buffer/Uint8Array or a path and resolves to
 * `{ width?, height?, durationSeconds? }` (fields only appear when reported).
 */
export async function detectMediaInfo(input) {
    let args;
    let stdinData;

    if (typeof input === 'string') {
        args = [input];
    }
    else if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
        args = ['-i', 'pipe:0'];
        stdinData = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
    }
    else {
        throw new TypeError('detectMediaInfo: expects a Buffer, Uint8Array or a file path');
    }

    const report = await runFfprobe(args, stdinData);
    return mapProbeReport(report);
}
