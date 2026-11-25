const { MsEdgeTTS } = require('msedge-tts');

(async () => {
  const tts = new MsEdgeTTS();
  const voices = await tts.getVoices();
  const en = voices.filter((v) => /^en-(US|GB|AU|IE)/i.test(v.ShortName));
  console.log('total voices:', voices.length, '| en:', en.length);
  for (const v of en) {
    console.log([v.ShortName, v.Gender, v.Locale, v.VoiceTag ? v.VoiceTag.VoicePersonality || '' : ''].join('\t'));
  }
  const multi = voices.filter((v) => /Multilingual/.test(v.ShortName));
  console.log('--- multilingual ---');
  for (const v of multi.slice(0, 40)) console.log(v.ShortName);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
