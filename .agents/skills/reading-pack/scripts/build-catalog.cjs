// 生成站点目录首页（卡片列表）：扫描 practiceNN/index.html + assets/practice.json
// 用法: node build-catalog.cjs <站点根>
const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || '.');
if (!fs.existsSync(root)) {
  console.error('目录不存在: ' + root);
  process.exit(1);
}

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const strip = (s) => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

function loadPractice(dir) {
  const index = path.join(dir, 'index.html');
  if (!fs.existsSync(index)) return null;
  const metaFile = path.join(dir, 'assets', 'practice.json');

  let meta = null;
  if (fs.existsSync(metaFile)) {
    try { meta = JSON.parse(fs.readFileSync(metaFile, 'utf8')); } catch (e) { meta = null; }
  }

  if (!meta) {
    const html = fs.readFileSync(index, 'utf8');
    const h1 = /<h1>([\s\S]*?)<\/h1>/.exec(html);
    const sub = /<p class="sub">([\s\S]*?)<\/p>/.exec(html);
    if (!h1) return null;
    meta = {
      titleEn: strip(h1[1]),
      titleZh: sub ? strip(sub[1]) : '',
      chips: Array.from(html.matchAll(/<span class="chip">([\s\S]*?)<\/span>/g)).map((m) => strip(m[1])),
      stats: {}
    };
  }
  meta.dir = path.basename(dir);
  return meta;
}

const items = fs.readdirSync(root, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => loadPractice(path.join(root, e.name)))
  .filter(Boolean)
  .sort((a, b) => a.dir.localeCompare(b.dir, 'en'));

const totalWords = items.reduce((n, it) => n + (it.stats && it.stats.words ? it.stats.words : 0), 0);
const totalQuestions = items.reduce((n, it) => n + (it.stats && it.stats.questions ? it.stats.questions : 0), 0);

const cards = items.map((it, i) => {
  const no = String(i + 1).padStart(2, '0');
  const chips = (it.chips || []).map((c) => `<span class="tag">${esc(c)}</span>`).join('');
  return `
      <a class="card" href="./${encodeURIComponent(it.dir)}/index.html">
        <span class="no">${no}</span>
        <span class="body">
          <span class="zh">${esc(it.titleZh || it.titleEn)}</span>
          <span class="en">${esc(it.titleEn)}</span>
          <span class="metas">${chips}</span>
        </span>
        <span class="go" aria-hidden="true">开始学习 →</span>
      </a>`;
}).join('\n');

const page = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>英语阅读精读 · 学习包</title>
<meta name="description" content="中职三年级英语阅读精读学习包：原文、选择题、逐句对照、生词构词拆解与朗读音频。">
<style>
  :root {
    --ink: #15191f; --ink-2: #26303b; --muted: #4f5b68;
    --line: #d9dee6; --line-soft: #e8ecf2;
    --navy: #123c60; --gold: #8a5600;
    --f-en: Georgia, "Iowan Old Style", "Times New Roman", serif;
    --f-zh: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Source Han Sans SC", system-ui, sans-serif;
    --f-ui: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", "Microsoft YaHei", sans-serif;
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
  body {
    margin: 0; padding: 0 20px 72px; background: #fff; color: var(--ink);
    font-family: var(--f-en); font-size: 20px; line-height: 1.72;
    -webkit-tap-highlight-color: transparent;
  }
  .wrap { max-width: 940px; margin: 0 auto; }
  header { padding: 48px 0 10px; }
  .kicker {
    margin: 0 0 14px; font-family: var(--f-ui); font-size: 14px; font-weight: 600;
    letter-spacing: .18em; text-transform: uppercase; color: var(--gold);
  }
  h1 { margin: 0 0 12px; font-size: clamp(33px, 4.6vw, 50px); line-height: 1.14; letter-spacing: -.01em; color: #0d1219; }
  .sub { margin: 0 0 18px; font-family: var(--f-zh); font-size: 22px; font-weight: 600; color: var(--navy); }
  .lead {
    margin: 0; padding: 15px 18px; background: #f7f9fc; border: 1px solid var(--line-soft);
    border-left: 4px solid var(--navy); border-radius: 0 10px 10px 0;
    font-family: var(--f-zh); font-size: 18px; line-height: 1.75; color: #2b3742;
  }
  .stats { margin: 18px 0 6px; font-family: var(--f-ui); font-size: 14.5px; color: var(--muted); }
  h2.section {
    margin: 34px 0 16px; padding-bottom: 10px; border-bottom: 2px solid var(--line);
    font-family: var(--f-ui); font-size: 22px; font-weight: 700; color: #0d1219;
    display: flex; align-items: baseline; gap: 10px;
  }
  h2.section small { margin-left: auto; font-weight: 400; font-size: 14px; color: var(--muted); }
  .list { display: grid; gap: 14px; }
  .card {
    display: grid; grid-template-columns: 52px 1fr auto; align-items: center; gap: 16px;
    padding: 18px 20px; background: #fff; border: 1px solid var(--line); border-radius: 14px;
    text-decoration: none; color: inherit; transition: border-color .15s, box-shadow .15s, transform .1s;
  }
  .card:hover { border-color: #b9c6d6; box-shadow: 0 6px 18px rgba(20, 38, 58, .08); transform: translateY(-1px); }
  .card:active { transform: translateY(0); }
  .no {
    display: grid; place-items: center; width: 44px; height: 44px; border-radius: 10px;
    background: var(--navy); color: #fff; font-family: var(--f-ui); font-size: 16px; font-weight: 700;
  }
  .body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .zh { font-family: var(--f-zh); font-size: 20px; font-weight: 700; color: #10151b; }
  .en { font-size: 17px; color: #3d4a57; }
  .metas { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
  .tag {
    font-family: var(--f-ui); font-size: 12.5px; color: var(--ink-2);
    background: #f4f6fa; border: 1px solid var(--line); border-radius: 999px; padding: 2px 9px;
  }
  .go { font-family: var(--f-ui); font-size: 14.5px; font-weight: 600; color: var(--navy); white-space: nowrap; }
  .card:hover .go { text-decoration: underline; }
  footer {
    margin-top: 48px; padding-top: 18px; border-top: 1px solid var(--line);
    font-family: var(--f-ui); font-size: 13.5px; color: #5c6875; display: flex; flex-wrap: wrap; gap: 6px 16px;
  }
  .empty { padding: 28px; text-align: center; color: var(--muted); font-family: var(--f-ui); }
  @media (max-width: 720px) {
    body { padding: 0 14px 56px; font-size: 19px; }
    .card { grid-template-columns: 44px 1fr; gap: 12px; padding: 15px; }
    .go { grid-column: 2; }
    h1 { font-size: 31px; }
  }
  @media print {
    @page { size: A4; margin: 16mm 14mm; }
    body { padding: 0; font-size: 11pt; }
    .card { break-inside: avoid; }
    .go { display: none; }
  }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <p class="kicker">中职三年级 · 英语阅读精读</p>
    <h1>Reading Practices</h1>
    <p class="sub">英语阅读精读学习包</p>
    <p class="lead">每篇进去先看到整段原文和 5 道选择题；再往下是逐句中英对照、点词看音标与构词、重点短语注解，以及全文和逐句朗读音频。所有音频都是本地文件，断网也能用。</p>
    <p class="stats">共 ${items.length} 篇 · 约 ${totalWords} 词原文 · ${totalQuestions} 道题</p>
  </header>

  <h2 class="section">全部篇目<small>按上传顺序排列</small></h2>
  <div class="list">
${items.length ? cards : '<p class="empty">还没有篇目：把生成的 practiceNN 文件夹放进站点根后重新生成目录。</p>'}
  </div>

  <footer>
    <span>共 ${items.length} 篇</span>
    <span>朗读：en-US-AndrewMultilingualNeural</span>
    <span>纯静态页面，无外部依赖</span>
  </footer>
</div>
</body>
</html>
`;

const out = path.join(root, 'index.html');
fs.writeFileSync(out, page, 'utf8');
console.log(`OK ${out}  ${items.length} 篇  ${(Buffer.byteLength(page) / 1024).toFixed(1)} KB`);
items.forEach((it) => console.log('   - ' + it.dir + '  ' + (it.titleZh || it.titleEn)));
