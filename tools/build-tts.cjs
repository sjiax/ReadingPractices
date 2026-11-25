// 生成整篇朗读与生词连读音频（Edge 神经语音，需联网）
// 输出：<audioDir>/full.mp3、<audioDir>/words.mp3
// 用法: node build-tts.cjs <data.cjs> <audioDir> [voice] [rate]
const path = require('path');
const fs = require('fs');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const dataPath = process.argv[2];
const outDir = process.argv[3];
const VOICE = process.argv[4] || 'en-US-AndrewMultilingualNeural';
const RATE = process.argv[5] || '-6%';
if (!dataPath || !outDir) {
  console.error('usage: node build-tts.cjs <data.cjs> <audioDir> [voice] [rate]');
  process.exit(1);
}
const d = require(path.resolve(dataPath));
fs.mkdirSync(outDir, { recursive: true });

const FMT = OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3;

function clean(s) {
  return String(s)
    .replace(/[\u201c\u201d"]/g, '')
    .replace(/[\u2014\u2013]/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function speak(text, file, rate) {
  const tts = new MsEdgeTTS({ connectionTimeoutMs: 20000, synthesisTimeoutMs: 120000 });
  await tts.setMetadata(VOICE, FMT);
  const { audioStream } = await tts.toStream(text, { rate });
  const ws = fs.createWriteStream(file);
  audioStream.pipe(ws);
  await new Promise((res, rej) => {
    audioStream.on('error', rej);
    ws.on('error', rej);
    ws.on('close', res);
  });
  try { tts.close(); } catch (e) { /* ignore */ }
  return fs.statSync(file).size;
}

// 粗算时长：24kHz / 48kbps 单声道 MP3 = 每帧 288 字节、24ms
function duration(file) {
  const buf = fs.readFileSync(file);
  let n = 0;
  for (let i = 0; i + 1 < buf.length; i++) {
    if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) {
      n++;
      i += 287;
    }
  }
  return (n * 0.024).toFixed(1);
}

(async () => {
  const full = clean([d.titleEn + '.', ...d.paragraphs].join('\n\n'));
  const words = d.vocab.map((v) => {
    const w = clean(v.w).replace(/-/g, ' ');
    return `${w}, ${w}`;
  }).join('. ') + '.';

  const jobs = [
    { file: path.join(outDir, 'full.mp3'), text: full, rate: RATE },
    { file: path.join(outDir, 'words.mp3'), text: words, rate: '-18%' }
  ];

  for (const j of jobs) {
    const size = await speak(j.text, j.file, j.rate);
    console.log(`OK ${path.basename(j.file)} ${size} bytes ~${duration(j.file)}s [${VOICE} ${j.rate}]`);
  }
})().catch((e) => {
  console.error('FAIL', e && e.message ? e.message : e);
  process.exit(1);
});
