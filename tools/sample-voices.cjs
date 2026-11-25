// 用同一段原文对比多个 Edge 音色
// 用法: node sample-voices.cjs <outDir>
const path = require('path');
const fs = require('fs');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const D = require('path').resolve(__dirname, 'data/passage1.cjs');
const d = require(D);

const outDir = process.argv[2] || path.join(__dirname, 'samples');
fs.mkdirSync(outDir, { recursive: true });

const FMT = OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3;
const RATE = '-5%';

// 第 3 段：叙事 + 长句，最能听出语气和连读
const text = d.paragraphs[2];

const CANDIDATES = [
  ['AriaNeural_现用基线', 'en-US-AriaNeural'],
  ['AvaNeural', 'en-US-AvaNeural'],
  ['AvaMultilingualNeural', 'en-US-AvaMultilingualNeural'],
  ['EmmaNeural', 'en-US-EmmaNeural'],
  ['EmmaMultilingualNeural', 'en-US-EmmaMultilingualNeural'],
  ['AndrewMultilingualNeural', 'en-US-AndrewMultilingualNeural'],
  ['BrianMultilingualNeural', 'en-US-BrianMultilingualNeural'],
  ['JennyNeural', 'en-US-JennyNeural'],
  ['MichelleNeural', 'en-US-MichelleNeural'],
  ['SoniaNeural_英式', 'en-GB-SoniaNeural'],
  ['RyanNeural_英式男', 'en-GB-RyanNeural'],
  ['NatashaNeural_澳式', 'en-AU-NatashaNeural']
];

function clean(s) {
  return String(s).replace(/[\u201c\u201d"]/g, '').replace(/\s+/g, ' ').trim();
}

async function synth(voice, txt, rate) {
  const tts = new MsEdgeTTS({ connectionTimeoutMs: 20000, synthesisTimeoutMs: 120000 });
  await tts.setMetadata(voice, FMT);
  const { audioStream } = await tts.toStream(txt, { rate });
  const chunks = [];
  await new Promise((res, rej) => {
    audioStream.on('data', (c) => chunks.push(Buffer.from(c)));
    audioStream.on('error', rej);
    audioStream.on('end', res);
  });
  try { tts.close(); } catch (e) { /* ignore */ }
  return Buffer.concat(chunks);
}

(async () => {
  const parts = [];
  let i = 0;
  for (const [label, voice] of CANDIDATES) {
    i += 1;
    const n = String(i).padStart(2, '0');
    const ann = await synth(voice, `This is voice number ${i}, ${label.replace(/_/g, ' ').replace(/Neural/g, '')}.`, '0%');
    const body = await synth(voice, clean(text), RATE);
    const file = path.join(outDir, `${n}_${label}.mp3`);
    fs.writeFileSync(file, Buffer.concat([ann, body]));
    parts.push(Buffer.concat([ann, body]));
    console.log(`OK ${path.basename(file)}  ${(ann.length + body.length)} bytes`);
  }
  const all = path.join(outDir, '00_全部对比_按顺序播放.mp3');
  fs.writeFileSync(all, Buffer.concat(parts));
  console.log(`OK ${path.basename(all)}  ${fs.statSync(all).size} bytes`);
})().catch((e) => { console.error('FAIL', e && e.message ? e.message : e); process.exit(1); });
