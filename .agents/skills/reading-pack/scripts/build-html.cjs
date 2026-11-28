// 生成单文件 HTML 学习包（音频与脚本按相对路径引用 assets/）
// 用法: node build-html.cjs <data.cjs> <webDir>
const path = require('path');
const fs = require('fs');

const dataPath = process.argv[2];
const webDir = process.argv[3];
if (!dataPath || !webDir) {
  console.error('usage: node build-html.cjs <data.cjs> <webDir>');
  process.exit(1);
}
const d = require(path.resolve(dataPath));

// ---------- 音色套 ----------
// audios: [{ key, label, sent, word, phrase }]，每套音频放 assets/audio/<key>/{full,words,s,w,p}。
// 没写 audios 的旧数据按单套处理（音频直接放 assets/audio/ 下，页面不显示切换器）。
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pad2 = (n) => String(n).padStart(2, '0');
const FALLBACK_VOICES = { sent: 'AndrewNeural', word: 'AndrewNeural', phrase: 'AndrewNeural' };
const declaredSets = (Array.isArray(d.audios) && d.audios.length)
  ? d.audios
  : [Object.assign({ key: '', label: '' }, d.voices || FALLBACK_VOICES)];
const baseOf = (s) => 'assets/audio/' + (s.key ? s.key + '/' : '');
// 一套音频算“齐”的标准：full/words + 全部 s/w/p。半套（正在生成）不进下拉，免得切过去没声音。
const expectedFiles = () => [
  'full.mp3',
  'words.mp3',
  ...d.lines.map((_, i) => `s/${pad2(i + 1)}.mp3`),
  ...d.vocab.map((v, i) => `w/${pad2(i + 1)}-${slug(v.w)}.mp3`),
  ...d.phrases.map((p, i) => `p/${pad2(i + 1)}-${slug(p.p)}.mp3`)
];
const allExpected = expectedFiles();
const setReady = (s) => allExpected.every((f) => fs.existsSync(path.join(webDir, baseOf(s), f)));
const sets = declaredSets.filter(setReady);
if (!sets.length) {
  console.error('没有可用的音色套（缺 full.mp3 / words.mp3）：' + declaredSets.map((s) => baseOf(s)).join('、'));
  process.exit(4);
}
const skipped = declaredSets.filter((s) => !setReady(s));
if (skipped.length) console.warn('警告：以下音色套音频不全，已跳过：' + skipped.map((s) => s.key || '(默认)').join('、'));

const cur = sets[0];
const AUD = path.join(webDir, baseOf(cur));
const wordAudio = (i) => `${baseOf(cur)}w/${pad2(i + 1)}-${slug(d.vocab[i].w)}.mp3`;
const phraseAudio = (i) => `${baseOf(cur)}p/${pad2(i + 1)}-${slug(d.phrases[i].p)}.mp3`;
const sentAudio = (i) => `${baseOf(cur)}s/${pad2(i + 1)}.mp3`;

function dur(file) {
  if (!fs.existsSync(file)) return 0;
  // 固定 24kHz / 48kbps 单声道 MP3：1 秒 = 6000 字节。
  // （别按帧长度算：这个格式每帧 144 字节 / 24ms，按 288 字节会算成一半）
  return Math.round((fs.statSync(file).size * 8) / 48000);
}

// 构建时间戳（固定按北京时间，与机器时区无关），写在页脚，方便判断线上是不是最新一版
function stamp() {
  const t = new Date(Date.now() + 8 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
}

const setMeta = sets.map((s) => ({
  key: s.key,
  label: s.label || s.sent || '默认',
  base: baseOf(s),
  durFull: dur(path.join(webDir, baseOf(s), 'full.mp3')),
  durWords: dur(path.join(webDir, baseOf(s), 'words.mp3')),
  voiceLine: `全文/逐句 ${s.sent} · 单词 ${s.word} · 短语 ${s.phrase}`
}));

// ---------- 一致性校验：逐句拼接应还原段落 ----------
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
d.paragraphs.forEach((p, i) => {
  const joined = norm(d.lines.filter((l) => l.p === i + 1).map((l) => l.en).join(' '));
  if (joined !== norm(p)) {
    console.error(`段落 ${i + 1} 与逐句文本不一致：\n  段落: ${norm(p)}\n  逐句: ${joined}`);
    process.exit(2);
  }
});

// ---------- 行内标注 ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildSurfaces() {
  const words = [];
  d.vocab.forEach((v, i) => {
    const forms = (d.forms && d.forms[v.w]) || [v.w];
    forms.forEach((f) => words.push({ surface: f, i }));
  });
  return words.sort((a, b) => b.surface.length - a.surface.length);
}

const WORD_SURFACES = buildSurfaces();

// 逐句里只标生词（长词优先，同一形态多次出现都标）；短语不涂色、不发音，朗读走句下注解的 ▶
function annotate(raw) {
  let out = esc(raw);
  const toks = [];
  WORD_SURFACES.forEach((s) => {
    const re = new RegExp('\\b' + escRe(esc(s.surface)) + '\\b', 'gi');
    out = out.replace(re, (m) => {
      const id = toks.length;
      toks.push({ m, s });
      return '\uE000' + id + '\uE001';
    });
  });
  return out.replace(/\uE000(\d+)\uE001/g, (_, i) => {
    const t = toks[Number(i)];
    return `<span class="w" data-w="${t.s.i}" data-audio="${wordAudio(t.s.i)}" tabindex="0">${t.m}</span>`;
  });
}

// ---------- 组装 ----------
const H = [];
const fullDur = setMeta[0].durFull;
const wordsDur = setMeta[0].durWords;
const totalSent = d.lines.length;
const wordCount = d.paragraphs.join(' ').split(/\s+/).filter(Boolean).length;

H.push('<!doctype html>');
H.push('<html lang="zh-CN">');
H.push('<head>');
H.push('<meta charset="utf-8">');
H.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
H.push(`<title>${esc(d.titleEn)} · 学习包</title>`);
H.push('<link rel="stylesheet" href="../assets/style.css">');
H.push('</head>');
H.push('<body>');
H.push('<div class="wrap">');
H.push('<a class="back" href="../index.html">← 所有篇目</a>');

// 头部
H.push('<header class="top">');
H.push(`<p class="kicker">${esc(d.studentZh || '文文')} · ${esc(d.gradeZh || '中职三年级')} · 英语阅读精读 · 第 ${pad2(d.no)} 篇</p>`);
H.push(`<h1>${esc(d.titleEn)}</h1>`);
H.push(`<p class="sub">${esc(d.titleZh)}</p>`);
H.push('<p class="chips">');
const chipList = [
  `原文 ${wordCount} 词`,
  `${d.paragraphs.length} 段 · ${totalSent} 句`,
  `${d.vocab.length} 个生词`,
  `${d.phrases.length} 个短语`,
  `${d.questions.length} 道题`
];
// 课本篇目先亮出单元/板块（列表页也用这两个字段）
if (d.unitLabel) {
  H.push(`<span class="chip unit">${esc(d.unitLabel)}${d.sectionLabel ? ' · ' + esc(d.sectionLabel) : ''}</span>`);
}
chipList.forEach((t) => H.push(`<span class="chip">${t}</span>`));
H.push('</p>');
H.push(`<p class="lead">${esc(d.leadZh)}</p>`);
H.push('</header>');

// 右侧悬浮站内导航（默认收起成一个小胶囊，展开五个区块；滚动时高亮当前区块）
H.push('<nav class="pagenav" id="pagenav" aria-label="本页导航">');
H.push('<button class="pn-toggle" type="button" aria-expanded="false" aria-controls="pn-list">'
  + '<span class="pn-bars" aria-hidden="true">≡</span>目录</button>');
H.push('<ul class="pn-list" id="pn-list">');
[['text', '原文'], ['quiz', '阅读理解题'], ['read', '逐句对照'], ['words', '重点生词'], ['how', '学习顺序']]
  .forEach(([id, label]) => H.push(`<li><a href="#${id}" data-sec="${id}">${label}</a></li>`));
H.push('</ul>');
H.push('</nav>');

// 播放条
H.push('<div class="bar">');
H.push('<div class="bar-row">');
H.push(`<button class="btn" data-play="${baseOf(cur)}full.mp3" data-dur="full">▶ 全文朗读<small>${fullDur}s</small></button>`);
H.push(`<button class="btn ghost" data-play="${baseOf(cur)}words.mp3" data-dur="words">▶ 生词连读<small>${wordsDur}s</small></button>`);
H.push('<div class="rate"><span>语速</span>');
H.push('<button type="button" data-rate="0.8">0.8×</button>');
H.push('<button type="button" data-rate="0.9">0.9×</button>');
H.push('<button type="button" data-rate="1" class="on">1×</button>');
H.push('</div>');
if (setMeta.length > 1) {
  H.push('<label class="vsel"><span>音色</span><select id="voiceSel" aria-label="选择朗读音色">');
  setMeta.forEach((s) => H.push(`<option value="${esc(s.key)}">${esc(s.label)}</option>`));
  H.push('</select></label>');
}
H.push('<label class="switch"><input type="checkbox" id="autoSound" checked> 点词自动发音</label>');
H.push('</div>');
H.push('<audio id="main" controls preload="none"></audio>');
H.push('</div>');

// 短语按“出现在第几句”归组，跟着句子走
const phByLine = new Map();
d.phrases.forEach((p, i) => {
  const at = typeof p.at === 'number' ? p.at : -1;
  if (!phByLine.has(at)) phByLine.set(at, []);
  phByLine.get(at).push({ p, i });
});

// 一、原文（整段通读）
H.push('<section id="text">');
H.push('<h2><span class="no">一</span>原文<small>先通读一遍，再做题</small></h2>');
H.push('<div class="plaintext">');
d.paragraphs.forEach((p) => H.push(`<p>${esc(p)}</p>`));
H.push('</div>');
H.push('</section>');

// 二、阅读理解题
H.push('<section id="quiz">');
H.push('<h2><span class="no">二</span>阅读理解题<small>先自己做，再展开答案</small></h2>');
d.questions.forEach((q, qi) => {
  H.push('<div class="q">');
  H.push(`<h3><span class="qn">${qi + 1}.</span>${esc(q.q)}</h3>`);
  H.push(`<p class="qzh">${esc(q.qZh)}</p>`);
  H.push('<ul class="opts">');
  q.options.forEach((o) => {
    const ok = o.k === q.answer ? ' class="ok"' : '';
    H.push(`<li${ok}><b>${o.k}.</b>${esc(o.t)}<span class="ozh">（${esc(o.tZh)}）</span></li>`);
  });
  H.push('</ul>');
  H.push('<details><summary>看答案与依据</summary>');
  H.push(`<p class="ans">答案：${q.answer}</p>`);
  H.push(`<p class="ev">依据句：<i>${esc(q.evidence)}</i></p>`);
  H.push(`<p class="ana">解析：${esc(q.evidenceZh)}</p>`);
  H.push('</details>');
  H.push('</div>');
});
H.push('</section>');

// 三、逐句对照
H.push('<section id="read">');
H.push('<h2><span class="no">三</span>逐句对照<small>点左边的 ▶ 朗读，点生词看释义</small></h2>');
H.push('<div class="legend">');
H.push('<span class="k-w"><i></i>生词 · 点一下看音标与例句</span>');
H.push('<label class="switch inline"><input type="checkbox" id="showNotes" checked> 显示译文与注解</label>');
H.push('</div>');

d.paragraphs.forEach((p, pi) => {
  H.push('<div class="para">');
  H.push(`<div class="ptag">第 ${pi + 1} 段</div>`);
  d.lines.forEach((l, li) => {
    if (l.p !== pi + 1) return;
    H.push('<div class="s row-hide">');
    H.push(`<button class="play" type="button" data-play="${sentAudio(li)}" aria-label="播放这句">▶</button>`);
    H.push('<button class="snote off" type="button" aria-pressed="false" aria-label="显示或隐藏这句的译文与注解" title="显示 / 隐藏这句的译文与注解">译</button>');
    H.push(`<div class="en">${annotate(l.en)}</div>`);
    H.push(`<div class="zh">${esc(l.zh)}</div>`);
    const notes = phByLine.get(li);
    if (notes && notes.length) {
      H.push('<div class="pnotes">');
      notes.forEach(({ p: ph, i: pidx }) => {
        H.push('<div class="pnote">');
        H.push(`<button class="pmini" type="button" data-play="${phraseAudio(pidx)}" aria-label="播放短语">▶</button>`);
        H.push(`<b>${esc(ph.p)}</b>`);
        H.push(`<span class="pz">${esc(ph.zh)}</span>`);
        H.push('<span class="psep">·</span>');
        H.push(`<span class="px">${esc(ph.ex)}</span>`);
        H.push(`<span class="pz2">（${esc(ph.exZh)}）</span>`);
        if (ph.note) H.push(`<span class="puse">用法：${esc(ph.note)}</span>`);
        H.push('</div>');
      });
      H.push('</div>');
    }
    H.push('</div>');
  });
  H.push('</div>');
});
H.push('</section>');

// 四、生词
H.push('<section id="words">');
H.push('<h2><span class="no">四</span>重点生词<small>点 ▶ 听发音</small></h2>');
H.push('<p class="hint">音标为美式音标（IPA）；<span class="star">★</span> 为初中一年级高频、必须会拼写和使用的核心词。</p>');
H.push('<div class="tablewrap"><table>');
H.push('<thead><tr><th>#</th><th>单词</th><th>音标</th><th>词性</th><th>释义</th><th>例句 / 译文</th></tr></thead>');
H.push('<tbody>');
d.vocab.forEach((v, i) => {
  H.push('<tr>');
  H.push(`<td class="num">${i + 1}</td>`);
  H.push(`<td class="word"><b>${esc(v.w)}</b>${v.core ? ' <span class="star">★</span>' : ''}` +
    `<button class="mini" type="button" data-play="${wordAudio(i)}" aria-label="播放 ${esc(v.w)}">▶</button></td>`);
  H.push(`<td class="ipa">${esc(v.ipa)}</td>`);
  H.push(`<td class="pos">${esc(v.pos)}</td>`);
  const formLine = (v.form && v.form.length)
    ? '<div class="tform">' + v.form.map((f) => `<b>${esc(f[0])}</b><i>${esc(f[1])}</i>`).join('<span class="tplus">+</span>') + '</div>'
    : '';
  const inflLine = v.infl ? `<div class="tinf"><b>变形</b> ${esc(v.infl)}</div>` : '';
  H.push(`<td class="zh">${esc(v.zh)}${formLine}${inflLine}</td>`);
  H.push(`<td class="ex"><span class="en">${esc(v.ex)}</span><span class="zh">${esc(v.exZh)}</span></td>`);
  H.push('</tr>');
});
H.push('</tbody></table></div>');
H.push('</section>');

// 五、学习顺序
H.push('<section id="how">');
H.push('<h2><span class="no">五</span>建议学习顺序</h2>');
H.push('<ol class="steps">');
[
  '先听全文音频 1—2 遍，不看书，抓大意（谁、做了什么、为什么）。',
  '切到“逐句对照”，点每句左边的 ▶ 一句一句跟读；橙黄色的是生词，点一下看音标和例句，再点一下关掉。',
  '句子下方的浅绿注解是重点短语：释义、例句、译文都在里面，点小 ▶ 可以单独听。',
  '默认只显示英文，最适合跟读；想看中文，就打开右上“显示译文与注解”（一键全开），或者点某句右边的“译”只放这一行。',
  '只看中文译文，尝试口头把每一段“译回”英文，再与原文比对。',
  '做题，用“依据句”核对答案出处；错题标出是细节题、猜词题还是主旨题。',
  '睡前再听一遍全文，不看文字，检验理解是否顺。'
].forEach((t) => H.push(`<li>${esc(t)}</li>`));
H.push('</ol>');
H.push('</section>');

// 页脚音色说明：跟着顶部「音色」选择器走（切换时 app.js 改这一行的文字）
H.push('<footer>');
H.push(`<span>原文来源：${esc(d.source)}</span>`);
H.push('<span>词汇标准：初中一年级</span>');
H.push(`<span id="voiceLine">朗读：${esc(setMeta[0].voiceLine)}</span>`);
H.push('<span>本页可直接打印 / 存为 PDF</span>');
H.push(`<span class="build" title="生成这一版网页的时间">更新于 ${stamp()}</span>`);
H.push('</footer>');

H.push('</div>');
H.push('<div id="card" role="tooltip"></div>');

// 数据（短语只在句子下面注解里出现，不再弹短语卡，所以只发 words）
// sets：可切换的音色套（含每套的音频前缀与时长），app.js 据此换路径
const DOC = {
  words: d.vocab.map((v, i) => ({
    w: v.w, ipa: v.ipa, pos: v.pos, zh: v.zh, ex: v.ex, exZh: v.exZh,
    form: v.form || null, infl: v.infl || '', note: v.note || '', audio: wordAudio(i)
  })),
  sets: setMeta,
  voiceDefault: setMeta[0].key
};
H.push('<script>window.DOC = ' + JSON.stringify(DOC).replace(/</g, '\\u003c') + ';</script>');
H.push('<script src="../assets/app.js"></script>');
H.push('</body>');
H.push('</html>');

const out = path.join(webDir, 'index.html');
fs.writeFileSync(out, H.join('\n'), 'utf8');

// ---------- 结构化元数据（目录首页用：原文 + 选择题） ----------
const meta = {
  no: d.no,
  titleEn: d.titleEn,
  titleZh: d.titleZh,
  lead: d.leadZh,
  student: d.student || 'wenwen',
  studentZh: d.studentZh || '文文',
  gradeZh: d.gradeZh || '中职三年级',
  unit: d.unit || 0,
  unitLabel: d.unitLabel || '',
  part: d.part || 0,
  sectionLabel: d.sectionLabel || '',
  chips: chipList,
  stats: {
    words: wordCount,
    paragraphs: d.paragraphs.length,
    sentences: totalSent,
    vocab: d.vocab.length,
    phrases: d.phrases.length,
    questions: d.questions.length
  },
  paragraphs: d.paragraphs,
  questions: d.questions.map((q) => ({
    q: q.q, qZh: q.qZh, options: q.options,
    answer: q.answer, evidence: q.evidence, evidenceZh: q.evidenceZh
  }))
};
fs.mkdirSync(path.join(webDir, 'assets'), { recursive: true });
fs.writeFileSync(path.join(webDir, 'assets', 'practice.json'), JSON.stringify(meta, null, 1), 'utf8');

// ---------- 刷新共享静态模板（站点根 assets/，各篇共用一份，页面用 ../assets/ 引用） ----------
// 模板可能和脚本同目录（tools/），也可能在上一级（技能包的 scripts/ 与 assets/）
const TPL = [
  path.join(__dirname, 'assets'),
  path.join(__dirname, '..', 'assets')
].find((p) => fs.existsSync(path.join(p, 'style.css')));

const SITE_ASSETS = path.join(path.resolve(webDir), '..', 'assets');

if (!TPL) {
  console.warn('警告：找不到 assets/style.css 模板，页面将缺少样式');
} else {
  fs.mkdirSync(SITE_ASSETS, { recursive: true });
  ['style.css', 'app.js'].forEach((f) => {
    const src = path.join(TPL, f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(SITE_ASSETS, f));
  });
  console.log(`OK 共享静态资源 → ${path.relative(process.cwd(), SITE_ASSETS)}`);
}

// ---------- 引用文件存在性检查 ----------
const html = H.join('\n');
const refs = Array.from(new Set(html.match(/(?:\.\.\/)?assets\/[a-z0-9./-]+\.(mp3|css|js)/g) || []));
const missing = refs.filter((r) => !fs.existsSync(path.resolve(webDir, r.split('/').join(path.sep))));
console.log(`OK ${out} ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB | 引用资源 ${refs.length} 个 | 缺失 ${missing.length}`);
if (missing.length) {
  console.error('缺失资源:\n' + missing.join('\n'));
  process.exit(3);
}

