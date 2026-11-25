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

const AUD = path.join(webDir, 'assets', 'audio');
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pad2 = (n) => String(n).padStart(2, '0');
const wordAudio = (i) => `assets/audio/w/${pad2(i + 1)}-${slug(d.vocab[i].w)}.mp3`;
const phraseAudio = (i) => `assets/audio/p/${pad2(i + 1)}-${slug(d.phrases[i].p)}.mp3`;
const sentAudio = (i) => `assets/audio/s/${pad2(i + 1)}.mp3`;

function dur(file) {
  if (!fs.existsSync(file)) return 0;
  const b = fs.readFileSync(file);
  let n = 0;
  for (let i = 0; i + 1 < b.length; i++) {
    if (b[i] === 0xff && (b[i + 1] & 0xe0) === 0xe0) { n++; i += 287; }
  }
  return Math.round(n * 0.024);
}

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
  const list = [];
  d.vocab.forEach((v, i) => {
    const forms = (d.forms && d.forms[v.w]) || [v.w];
    forms.forEach((f) => list.push({ surface: f, kind: 'w', idx: i }));
  });
  d.phrases.forEach((p, i) => {
    const forms = (d.phraseSurfaces && d.phraseSurfaces[p.p]) || [];
    forms.forEach((f) => list.push({ surface: f, kind: 'p', idx: i }));
  });
  list.sort((a, b) => b.surface.length - a.surface.length);
  return list;
}

const SURFACES = buildSurfaces();

function annotate(raw) {
  let out = esc(raw);
  const toks = [];
  SURFACES.forEach((s) => {
    const re = new RegExp('\\b' + escRe(esc(s.surface)) + '\\b', 'gi');
    out = out.replace(re, (m) => {
      const id = toks.length;
      const attr = s.kind === 'w' ? `data-w="${s.idx}"` : `data-p="${s.idx}"`;
      const cls = s.kind === 'w' ? 'w' : 'ph';
      const audioPath = s.kind === 'w' ? wordAudio(s.idx) : phraseAudio(s.idx);
      toks.push(`<span class="${cls}" ${attr} data-audio="${audioPath}" tabindex="0">${m}</span>`);
      return '\uE000' + id + '\uE001';
    });
  });
  return out.replace(/\uE000(\d+)\uE001/g, (_, i) => toks[Number(i)]);
}

// ---------- 组装 ----------
const H = [];
const fullDur = dur(path.join(AUD, 'full.mp3'));
const wordsDur = dur(path.join(AUD, 'words.mp3'));
const totalSent = d.lines.length;
const wordCount = d.paragraphs.join(' ').split(/\s+/).filter(Boolean).length;

H.push('<!doctype html>');
H.push('<html lang="zh-CN">');
H.push('<head>');
H.push('<meta charset="utf-8">');
H.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
H.push(`<title>${esc(d.titleEn)} · 学习包</title>`);
H.push('<link rel="stylesheet" href="assets/style.css">');
H.push('</head>');
H.push('<body>');
H.push('<div class="wrap">');
H.push('<a class="back" href="../index.html">← 所有篇目</a>');

// 头部
H.push('<header class="top">');
H.push(`<p class="kicker">中职三年级 · 英语阅读精读 · 第 ${pad2(d.no)} 篇</p>`);
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
chipList.forEach((t) => H.push(`<span class="chip">${t}</span>`));
H.push('</p>');
H.push(`<p class="lead">${esc(d.leadZh)}</p>`);
H.push('</header>');

// 播放条
H.push('<div class="bar">');
H.push('<div class="bar-row">');
H.push(`<button class="btn" data-play="assets/audio/full.mp3">▶ 全文朗读<small>${fullDur}s</small></button>`);
H.push(`<button class="btn ghost" data-play="assets/audio/words.mp3">▶ 生词连读<small>${wordsDur}s</small></button>`);
H.push('<div class="rate"><span>语速</span>');
H.push('<button type="button" data-rate="0.8">0.8×</button>');
H.push('<button type="button" data-rate="0.9">0.9×</button>');
H.push('<button type="button" data-rate="1" class="on">1×</button>');
H.push('</div>');
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
H.push('<h2><span class="no">三</span>逐句对照<small>点句子朗读，点生词看释义</small></h2>');
H.push('<div class="legend">');
H.push('<span class="k-w"><i></i>生词 · 点一下看音标与例句</span>');
H.push('<span class="k-p"><i></i>重点短语 · 释义与例句就在句子下面</span>');
H.push('<label class="switch inline"><input type="checkbox" id="showNotes" checked> 显示短语注解</label>');
H.push('</div>');

d.paragraphs.forEach((p, pi) => {
  H.push('<div class="para">');
  H.push(`<div class="ptag">第 ${pi + 1} 段</div>`);
  d.lines.forEach((l, li) => {
    if (l.p !== pi + 1) return;
    H.push(`<div class="s" data-play="${sentAudio(li)}">`);
    H.push('<button class="play" type="button" aria-label="播放这句">▶</button>');
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
H.push('<p class="hint">音标为美式音标（IPA）；<span class="star">★</span> 为初中阶段高频、必须会拼写和使用的核心词。</p>');
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
  H.push(`<td class="zh">${esc(v.zh)}${formLine}</td>`);
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
  '切到“逐句对照”，一句一句跟读；橙黄色的是生词，点一下看音标和例句，再点一下关掉。',
  '句子下方的浅绿注解是重点短语：释义、例句、译文都在里面，点小 ▶ 可以单独听。',
  '只想练跟读时，把“显示短语注解”关掉，页面就只剩原文和译文。',
  '只看中文译文，尝试口头把每一段“译回”英文，再与原文比对。',
  '做题，用“依据句”核对答案出处；错题标出是细节题、猜词题还是主旨题。',
  '睡前再听一遍全文，不看文字，检验理解是否顺。'
].forEach((t) => H.push(`<li>${esc(t)}</li>`));
H.push('</ol>');
H.push('</section>');

H.push('<footer>');
H.push(`<span>原文来源：${esc(d.source)}</span>`);
H.push('<span>词汇标准：初中水平</span>');
H.push('<span>朗读：en-US-AndrewMultilingualNeural</span>');
H.push('<span>本页可直接打印 / 存为 PDF</span>');
H.push('</footer>');

H.push('</div>');
H.push('<div id="card" role="tooltip"></div>');

// 数据
const DOC = {
  words: d.vocab.map((v, i) => ({
    w: v.w, ipa: v.ipa, pos: v.pos, zh: v.zh, ex: v.ex, exZh: v.exZh,
    form: v.form || null, note: v.note || '', audio: wordAudio(i)
  })),
  phrases: d.phrases.map((v, i) => ({
    p: v.p, zh: v.zh, ex: v.ex, exZh: v.exZh, audio: phraseAudio(i)
  }))
};
H.push('<script>window.DOC = ' + JSON.stringify(DOC).replace(/</g, '\\u003c') + ';</script>');
H.push('<script src="assets/app.js"></script>');
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

// ---------- 刷新静态模板（style.css / app.js） ----------
// 模板可能和脚本同目录（_工具/），也可能在上一级（技能包的 scripts/ 与 assets/）
const TPL = [
  path.join(__dirname, 'assets'),
  path.join(__dirname, '..', 'assets')
].find((p) => fs.existsSync(path.join(p, 'style.css')));

if (!TPL) {
  console.warn('警告：找不到 assets/style.css 模板，页面将缺少样式');
} else {
  ['style.css', 'app.js'].forEach((f) => {
    const src = path.join(TPL, f);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.join(webDir, 'assets'), { recursive: true });
      fs.copyFileSync(src, path.join(webDir, 'assets', f));
    }
  });
}

// ---------- 引用文件存在性检查 ----------
const html = H.join('\n');
const refs = Array.from(new Set(html.match(/assets\/[a-z0-9./-]+\.(mp3|css|js)/g) || []));
const missing = refs.filter((r) => !fs.existsSync(path.join(webDir, r.split('/').join(path.sep))));
console.log(`OK ${out} ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB | 引用资源 ${refs.length} 个 | 缺失 ${missing.length}`);
if (missing.length) {
  console.error('缺失资源:\n' + missing.join('\n'));
  process.exit(3);
}

