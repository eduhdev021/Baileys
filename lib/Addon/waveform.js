/**
 * `getAudioWaveform` — decodes an audio file (voice note) into the 64-bar
 * waveform WhatsApp renders next to playable audio messages, plus the
 * duration in whole seconds:
 *
 *   const { durationSeconds, waveform } = await getAudioWaveform('/tmp/voice.ogg');
 *   // -> { durationSeconds: 12, waveform: [0, 32, 88, 100, ..., 45] }  (64 values, 0-100)
 *
 * Input may be a path, a Buffer/Uint8Array or a Readable stream. The audio is
 * decoded by the system `ffmpeg` binary to mono 16 kHz PCM, split into 64
 * bars by peak amplitude and normalized against the loudest bar, so values
 * express relative loudness exactly the way WhatsApp displays them.
 * Throws (with ffmpeg's stderr) when the input has no audio track or is not
 * recognizable media.
 */
import { spawn } from 'node:child_process';

const SAMPLE_RATE = 16_000;
const BAR_COUNT = 64;
const TIMEOUT_MS = 30_000;

/**
 * Decodes the input to mono 16-bit PCM and returns { samples, sampleRate }.
 */
function decodePcm(input) {
    let args;
    let stdinData;
    if (typeof input === 'string') {
        args = ['-i', input];
    }
    else if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
        args = ['-i', 'pipe:0'];
        stdinData = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
    }
    else if (input && typeof input.pipe === 'function') {
        args = ['-i', 'pipe:0'];
        stdinData = input; // stream straight into ffmpeg
    }
    else {
        return Promise.reject(new TypeError('getAudioWaveform: expects a path, Buffer/Uint8Array or Readable'));
    }

    return new Promise((resolve, reject) => {
        const child = spawn('ffmpeg', [
            '-v', 'error',
            ...args,
            '-vn', // ignore cover art video streams
            '-map', 'a:0?', // first audio stream, when present
            '-f', 's16le',
            '-acodec', 'pcm_s16le',
            '-ac', '1',
            '-ar', String(SAMPLE_RATE),
            'pipe:1'
        ], { stdio: ['pipe', 'pipe', 'pipe'] });

        const chunks = [];
        let stderr = '';
        let settled = false;
        const timer = setTimeout(() => {
            child.kill('SIGKILL');
            settleReject('ffmpeg timed out');
        }, TIMEOUT_MS);

        function settleReject(message) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(new Error(message || 'ffmpeg failed'));
        }

        function settleResolve(value) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(value);
        }

        child.stdout.on('data', c => chunks.push(c));
        child.stderr.on('data', c => (stderr += c));
        child.on('error', err => settleReject(err.message));
        child.on('close', code => {
            const pcm = Buffer.concat(chunks);
            if (code !== 0 || pcm.length === 0) {
                settleReject(stderr.trim() || 'no audio stream found in the input');
                return;
            }
            settleResolve({ samples: pcm });
        });

        if (stdinData) {
            child.stdin.on('error', () => { /* ffmpeg may close stdin early */ });
            if (typeof stdinData.pipe === 'function') stdinData.pipe(child.stdin);
            else child.stdin.end(stdinData);
        }
    });
}

/** Splits the decoded PCM into 64 normalized peak bars (0-100). */
function computeWaveform(samples) {
    const frameCount = Math.floor(samples.length / 2); // int16 mono
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

    const waveform = peaks.map(peak => {
        if (globalPeak === 0) return 0;
        return Math.max(0, Math.min(100, Math.round((peak / globalPeak) * 100)));
    });

    const durationSeconds = Math.round(frameCount / SAMPLE_RATE);
    return { durationSeconds, waveform };
}

/**
 * Extracts `{ durationSeconds, waveform }` (64 integer bars, 0-100) from any
 * audio source ffmpeg can decode.
 */
export async function getAudioWaveform(input) {
    const { samples } = await decodePcm(input);
    return computeWaveform(samples);
}
