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

// 按学生分组（数据里有 student / studentZh / gradeZh；老篇目默认归到文文）
const groups = [];
items.forEach((it) => {
  const key = it.student || 'wenwen';
  let g = groups.find((x) => x.key === key);
  if (!g) {
    g = { key, name: it.studentZh || '文文', grade: it.gradeZh || '中职三年级', items: [] };
    groups.push(g);
  }
  g.items.push(it);
});

// 默认 Tab 固定是文文（即使以后有别的目录排序）
groups.sort((a, b) => (a.key === 'wenwen' ? -1 : b.key === 'wenwen' ? 1 : 0));

function cardHtml(it) {
  const no = String(it.no || 0).padStart(2, '0');
  const unit = it.unitLabel
    ? `<span class="unit">${esc(it.unitLabel)}${it.sectionLabel ? ' · ' + esc(it.sectionLabel) : ''}</span>`
    : '';
  const chips = (it.chips || []).map((c) => `<span class="tag">${esc(c)}</span>`).join('');
  return `
      <a class="card" href="./${encodeURIComponent(it.dir)}/index.html"
        data-no="${Number(it.no) || 0}" data-unit="${Number(it.unit) || 0}" data-part="${Number(it.part) || 0}">
        <span class="no">${no}</span>
        <span class="body">
          <span class="zh">${esc(it.titleZh || it.titleEn)}</span>
          <span class="en">${esc(it.titleEn)}</span>
          <span class="metas">${unit}${chips}</span>
        </span>
        <span class="go" aria-hidden="true">开始学习 →</span>
      </a>`;
}

const tabId = (g) => 'tab-' + g.key;
const panelId = (g) => 'panel-' + g.key;

const tabsHtml = groups.map((g, i) => `
    <button class="tab${i === 0 ? ' on' : ''}" type="button" role="tab" id="${tabId(g)}"
      aria-selected="${i === 0 ? 'true' : 'false'}" aria-controls="${panelId(g)}" data-key="${esc(g.key)}">
      ${esc(g.name)}<small>${esc(g.grade)} · ${g.items.length} 篇</small>
    </button>`).join('');

const panelsHtml = groups.map((g, i) => `
  <section class="panel" id="${panelId(g)}" role="tabpanel" aria-labelledby="${tabId(g)}"${i === 0 ? '' : ' hidden'}>
    <div class="list">
${g.items.map(cardHtml).join('\n')}
    </div>
  </section>`).join('\n');

const tabsMarkup = `
  <div class="tabs" role="tablist" aria-label="选择学生">
${tabsHtml}
  </div>
${panelsHtml}`;

const page = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>英语阅读精读 · 学习包</title>
<meta name="description" content="两个人的英语阅读精读学习包：原文、选择题、逐句对照、生词构词拆解与朗读音频。">
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
  .metaRow {
    display: flex; align-items: center; justify-content: space-between;
    gap: 10px 16px; flex-wrap: wrap; margin: 18px 0 6px;
  }
  .metaRow .stats { margin: 0; }
  .sort { display: flex; align-items: center; gap: 6px; font-family: var(--f-ui); font-size: 13.5px; color: var(--muted); }
  .sort select {
    font-family: var(--f-ui); font-size: 13.5px; padding: 4px 8px;
    border: 1px solid var(--line); border-radius: 8px; background: #fff; color: var(--ink-2); cursor: pointer;
  }
  .tabs {
    display: flex; gap: 4px; margin: 26px 0 20px;
    border-bottom: 2px solid var(--line);
  }
  .tab {
    appearance: none; -webkit-appearance: none; background: none; border: 0;
    border-bottom: 3px solid transparent; margin-bottom: -2px; padding: 10px 14px 12px;
    display: flex; align-items: baseline; gap: 9px; cursor: pointer;
    font-family: var(--f-ui); font-size: 19px; font-weight: 700; color: var(--muted);
    border-radius: 8px 8px 0 0;
    transition: color .15s, border-color .15s, background .15s;
  }
  .tab small { font-size: 12.5px; font-weight: 400; color: var(--muted); }
  .tab:hover { color: var(--navy); background: #f6f9fc; }
  .tab.on { color: var(--navy); border-bottom-color: var(--navy); }
  .tab:focus-visible { outline: 2px solid var(--navy); outline-offset: 2px; }
  .panel[hidden] { display: none; }
  @media (max-width: 720px) {
    .tabs { gap: 0; }
    .tab { font-size: 17px; padding: 9px 10px 11px; gap: 6px; }
  }
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
  .unit {
    font-family: var(--f-ui); font-size: 12.5px; font-weight: 700; color: #7a4b00;
    background: #fff8e8; border: 1px solid #e6cd9c; border-radius: 999px; padding: 2px 9px;
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
    <p class="kicker">两个人的英语阅读课</p>
    <h1>Reading Practices</h1>
    <p class="sub">英语阅读精读学习包</p>
    <p class="lead">每篇进去先看到整段原文和 5 道选择题；再往下是逐句中英对照、点词看音标与构词、重点短语注解，以及全文和逐句朗读音频。所有音频都是本地文件，断网也能用。</p>
    <div class="metaRow">
      <p class="stats">共 ${items.length} 篇 · ${groups.map((g) => `${g.name} ${g.items.length} 篇`).join(' · ')} · 约 ${totalWords} 词原文 · ${totalQuestions} 道题</p>
      <label class="sort">排序
        <select id="sortMode">
          <option value="unit">按单元</option>
          <option value="no">按编号</option>
        </select>
      </label>
    </div>
  </header>

${items.length ? tabsMarkup : '<p class="empty">还没有篇目：把生成的 practiceNN 文件夹放进站点根后重新生成目录。</p>'}

  <footer>
    <span>共 ${items.length} 篇</span>
    <span>朗读：长句/短语 Ava Multilingual · 单词 AndrewNeural</span>
    <span>纯静态页面，无外部依赖</span>
  </footer>
</div>
<script>
(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.panel'));
  function show(key) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-key') === key;
      t.classList.toggle('on', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panels.forEach(function (p) {
      p.hidden = p.id !== 'panel-' + key;
    });
    if (history.replaceState) history.replaceState(null, '', '#' + key);
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function () { show(t.getAttribute('data-key')); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var i = tabs.indexOf(t);
      var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      show(next.getAttribute('data-key'));
    });
  });
  var hash = (location.hash || '').replace('#', '');
  if (hash && tabs.some(function (t) { return t.getAttribute('data-key') === hash; })) show(hash);

  // 排序：按单元（默认）或按编号；无单元的篇目排在后面，组内按编号
  var sortSel = document.getElementById('sortMode');
  function sortCards(mode) {
    document.querySelectorAll('.panel .list').forEach(function (list) {
      var cards = Array.prototype.slice.call(list.querySelectorAll('.card'));
      cards.sort(function (a, b) {
        if (mode === 'unit') {
          var ua = Number(a.getAttribute('data-unit')) || 9999;
          var ub = Number(b.getAttribute('data-unit')) || 9999;
          if (ua !== ub) return ua - ub;
          var pa = Number(a.getAttribute('data-part')) || 999;
          var pb = Number(b.getAttribute('data-part')) || 999;
          if (pa !== pb) return pa - pb;
        }
        return (Number(a.getAttribute('data-no')) || 0) - (Number(b.getAttribute('data-no')) || 0);
      });
      cards.forEach(function (c) { list.appendChild(c); });
    });
  }
  if (sortSel) {
    var savedSort = null;
    try { savedSort = localStorage.getItem('rp.catalogSort'); } catch (err) { savedSort = null; }
    var mode = savedSort === 'no' ? 'no' : 'unit';
    sortSel.value = mode;
    sortCards(mode);
    sortSel.addEventListener('change', function () {
      sortCards(sortSel.value);
      try { localStorage.setItem('rp.catalogSort', sortSel.value); } catch (err) { /* ignore */ }
    });
  }
})();
</script>
</body>
</html>
`;

const out = path.join(root, 'index.html');
fs.writeFileSync(out, page, 'utf8');
console.log(`OK ${out}  ${items.length} 篇  ${(Buffer.byteLength(page) / 1024).toFixed(1)} KB`);
items.forEach((it) => console.log('   - ' + it.dir + '  ' + (it.titleZh || it.titleEn)));
