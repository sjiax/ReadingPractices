// 生成 HTML 版所需的分句、分词音频（每个请求独立连接 + 重试 + 断点续跑）
// 用法: node build-audio-assets.cjs <data.cjs> <webDir> [voice] [rate]
const path = require('path');
const fs = require('fs');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const dataPath = process.argv[2];
const webDir = process.argv[3];
const VOICE = process.argv[4] || 'en-US-AndrewMultilingualNeural';
const SENT_RATE = process.argv[5] || '-6%';
const WORD_RATE = '-18%';

if (!dataPath || !webDir) {
  console.error('usage: node build-audio-assets.cjs <data.cjs> <webDir> [voice] [rate]');
  process.exit(1);
}
const d = require(path.resolve(dataPath));
const A = path.join(webDir, 'assets', 'audio');
const S = path.join(A, 's');
const W = path.join(A, 'w');
[S, W].forEach((p) => fs.mkdirSync(p, { recursive: true }));

const FMT = OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3;
const clean = (s) => String(s).replace(/[\u201c\u201d"]/g, '').replace(/\s+/g, ' ').trim();
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function synthOnce(text, file, rate) {
  const tts = new MsEdgeTTS({ connectionTimeoutMs: 30000, synthesisTimeoutMs: 90000 });
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
  const size = fs.statSync(file).size;
  if (size < 2000) throw new Error('audio too small: ' + size);
  return size;
}

async function synth(text, file, rate) {
  if (fs.existsSync(file) && fs.statSync(file).size > 2000) return 0; // 续跑
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await synthOnce(text, file, rate);
    } catch (e) {
      lastErr = e;
      try { fs.unlinkSync(file); } catch (e2) { /* ignore */ }
      await sleep(400 * attempt);
    }
  }
  throw lastErr;
}

(async () => {
  let total = 0;
  let done = 0;
  for (let i = 0; i < d.lines.length; i++) {
    const n = String(i + 1).padStart(2, '0');
    const file = path.join(S, `${n}.mp3`);
    try {
      total += await synth(clean(d.lines[i].en), file, SENT_RATE);
      done += 1;
      process.stdout.write(`s${n} `);
    } catch (e) {
      console.log(`\nFAIL s${n}: ${e.message}`);
    }
  }
  console.log(`\n句子音频 ${done}/${d.lines.length}`);

  let wdone = 0;
  for (let i = 0; i < d.vocab.length; i++) {
    const v = d.vocab[i];
    const n = String(i + 1).padStart(2, '0');
    const file = path.join(W, `${n}-${slug(v.w)}.mp3`);
    try {
      total += await synth(clean(v.w).replace(/-/g, ' '), file, WORD_RATE);
      wdone += 1;
      process.stdout.write(`w${n} `);
    } catch (e) {
      console.log(`\nFAIL w${n}: ${e.message}`);
    }
  }
  console.log(`\n生词音频 ${wdone}/${d.vocab.length}`);

  const P = path.join(A, 'p');
  fs.mkdirSync(P, { recursive: true });
  let pdone = 0;
  for (let i = 0; i < d.phrases.length; i++) {
    const ph = d.phrases[i];
    const n = String(i + 1).padStart(2, '0');
    const file = path.join(P, `${n}-${slug(ph.p)}.mp3`);
    const speech = clean(ph.p)
      .replace(/\u2026/g, '')
      .replace(/\bsb\b/g, 'somebody')
      .replace(/\bsth\b/g, 'something')
      .trim();
    try {
      total += await synth(speech, file, '-8%');
      pdone += 1;
      process.stdout.write(`p${n} `);
    } catch (e) {
      console.log(`\nFAIL p${n}: ${e.message}`);
    }
  }
  console.log(`\n短语音频 ${pdone}/${d.phrases.length}`);
  console.log(`新增 ${(total / 1024).toFixed(0)} KB`);
})().catch((e) => {
  console.error('FAIL', e && e.message ? e.message : e);
  process.exit(1);
});
