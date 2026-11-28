// 生成逐句、逐词、逐短语音频（每个请求独立连接 + 重试 + 断点续跑）
// 用法: node build-audio-assets.cjs <data.cjs> <webDir> [voice] [rate] [wordVoice] [phraseVoice]
//
// 音色分工（2026-11 用户试听后定稿：全篇统一男声，不再按句子/词组分音色）：
//   全文/逐句：en-US-AndrewNeural（-6%，男声，整句语气自然）
//   单词     ：en-US-AndrewNeural（-8%，孤立单词也不会走音）
//   短语     ：en-US-AndrewNeural（-8%，与全文同音色）
// 想换人声/口音时用参数覆盖（见文件末尾的用法），并在数据里写 voices 让页脚如实显示。
// 短语按“整条连读”合成：只把 sb/sth 等占位符口语化，不再逐词插逗号（2026-11 用户选定）。
const path = require('path');
const fs = require('fs');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const dataPath = process.argv[2];
const webDir = process.argv[3];
const SENT_VOICE = process.argv[4] || 'en-US-AndrewNeural';
const SENT_RATE = process.argv[5] || '-6%';

const WORD_VOICE = process.argv[6] || 'en-US-AndrewNeural';
const PHRASE_VOICE = process.argv[7] || 'en-US-AndrewNeural';
const WORD_RATE = '-8%';
const PHRASE_RATE = '-8%';

if (!dataPath || !webDir) {
  console.error('usage: node build-audio-assets.cjs <data.cjs> <webDir> [voice] [rate] [wordVoice] [phraseVoice] [audioSet]');
  console.error('  audioSet: 音色套目录名，写到 <webDir>/assets/audio/<audioSet>/{s,w,p}；不传则写到 assets/audio/');
  process.exit(1);
}
const d = require(path.resolve(dataPath));
// 多套音色：第 8 个参数是音色套目录（如 andrew / ava），与数据里的 audios[].key 对应
const AUDIO_SET = process.argv[8] || '';
const A = path.join(webDir, 'assets', 'audio', AUDIO_SET);
const S = path.join(A, 's');
const W = path.join(A, 'w');
const P = path.join(A, 'p');
[S, W, P].forEach((p) => fs.mkdirSync(p, { recursive: true }));

const FMT = OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3;
const clean = (s) => String(s).replace(/[\u201c\u201d"]/g, '').replace(/\s+/g, ' ').trim();
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 短语朗读文本：占位符口语化，符号读成词，整条连读（不再逐词用逗号断开）
function phraseSpeech(p) {
  return clean(p)
    .replace(/\u2026/g, ' ')          // … 省略号
    .replace(/\bsb\b/gi, 'somebody')
    .replace(/\bsth\b/gi, 'something')
    .replace(/\badj\.?/gi, 'adjective')
    .replace(/\bn\./g, 'noun')
    .replace(/\+/g, ' ')             // 句式记号 +（如 make sth + adj.）不读出来
    .replace(/\s+/g, ' ')
    .trim();
}

async function synthOnce(voice, text, file, rate) {
  const tts = new MsEdgeTTS({ connectionTimeoutMs: 30000, synthesisTimeoutMs: 90000 });
  await tts.setMetadata(voice, FMT);
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

async function synth(voice, text, file, rate) {
  if (fs.existsSync(file) && fs.statSync(file).size > 2000) return 0; // 续跑
  let lastErr;
  // Edge 接口偶尔连续断流（2026-11 实测单次失败率可达 60%+），多试几次再放弃；失败的文件下次重跑会补上
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      return await synthOnce(voice, text, file, rate);
    } catch (e) {
      lastErr = e;
      try { fs.unlinkSync(file); } catch (e2) { /* ignore */ }
      await sleep(250 * attempt);
    }
  }
  throw lastErr;
}

(async () => {
  let total = 0;

  let done = 0;
  for (let i = 0; i < d.lines.length; i++) {
    const n = String(i + 1).padStart(2, '0');
    try {
      total += await synth(SENT_VOICE, clean(d.lines[i].en), path.join(S, `${n}.mp3`), SENT_RATE);
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
      total += await synth(WORD_VOICE, clean(v.w).replace(/-/g, ' '), file, WORD_RATE);
      wdone += 1;
      process.stdout.write(`w${n} `);
    } catch (e) {
      console.log(`\nFAIL w${n}: ${e.message}`);
    }
  }
  console.log(`\n生词音频 ${wdone}/${d.vocab.length}`);

  let pdone = 0;
  for (let i = 0; i < d.phrases.length; i++) {
    const ph = d.phrases[i];
    const n = String(i + 1).padStart(2, '0');
    const file = path.join(P, `${n}-${slug(ph.p)}.mp3`);
    try {
      total += await synth(PHRASE_VOICE, phraseSpeech(ph.p), file, PHRASE_RATE);
      pdone += 1;
      process.stdout.write(`p${n} `);
    } catch (e) {
      console.log(`\nFAIL p${n}: ${e.message}`);
    }
  }
  console.log(`\n短语音频 ${pdone}/${d.phrases.length}`);
  console.log(`新增 ${(total / 1024).toFixed(0)} KB`);
  // msedge-tts 有时留下没关的 socket，事件循环不退出、外层脚本会一直等；这里显式收工
  process.exit(0);
})().catch((e) => {
  console.error('FAIL', e && e.message ? e.message : e);
  process.exit(1);
});

