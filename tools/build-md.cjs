// 由同一份数据生成 Markdown 学习包
// 用法: node build-md.cjs <data.cjs> <out.md>
const path = require('path');
const fs = require('fs');

const dataPath = process.argv[2];
const outPath = process.argv[3];
if (!dataPath || !outPath) {
  console.error('usage: node build-md.cjs <data.cjs> <out.md>');
  process.exit(1);
}
const d = require(path.resolve(dataPath));

const L = [];
const pad = (n) => String(n).padStart(2, '0');

L.push(`# 阅读练习 ${pad(d.no)}　${d.titleEn}`);
L.push('');
L.push(`## ${d.titleZh}`);
L.push('');
L.push(`> **原文来源**：${d.source}　｜　**词汇标准**：${d.level}`);
L.push('');
L.push(`> ${d.leadZh}`);
L.push('');
L.push('---');
L.push('');

// 一、原文
L.push('## 一、英文原文');
L.push('');
d.paragraphs.forEach((t, i) => {
  L.push(`**${i + 1}**　${t}`);
  L.push('');
});

// 二、译文
L.push('---');
L.push('');
L.push('## 二、全文翻译');
L.push('');
d.paragraphs.forEach((t, i) => {
  L.push(`**【第 ${i + 1} 段】**`);
  L.push('');
  L.push(d.translation[i]);
  L.push('');
});

// 三、生词
L.push('---');
L.push('');
L.push('## 三、重点生词');
L.push('');
L.push('> 音标为美式音标（IPA）；标 **★** 的是初中阶段高频、必须会拼写和使用的核心词。');
L.push('');
L.push('| # | 单词 | 音标 | 词性 | 释义 | 例句 / 译文 |');
L.push('|---:|------|------|------|------|-------------|');
d.vocab.forEach((v, i) => {
  L.push(`| ${i + 1} | **${v.w}**${v.core ? ' ★' : ''} | ${v.ipa} | ${v.pos} | ${v.zh} | ${v.ex}<br>${v.exZh} |`);
});
L.push('');

// 四、短语
L.push('---');
L.push('');
L.push('## 四、重点短语');
L.push('');
L.push('| 短语 | 释义 | 例句 / 译文 |');
L.push('|------|------|-------------|');
d.phrases.forEach((v) => {
  L.push(`| **${v.p}** | ${v.zh} | ${v.ex}<br>${v.exZh} |`);
});
L.push('');

// 五、题目
L.push('---');
L.push('');
L.push('## 五、阅读理解题 · 答案与依据');
L.push('');
d.questions.forEach((q, qi) => {
  L.push(`### ${qi + 1}. ${q.q}`);
  L.push('');
  L.push(q.qZh);
  L.push('');
  q.options.forEach((o) => {
    const mark = o.k === q.answer ? `**${o.k}. ${o.t}**` : `${o.k}. ${o.t}`;
    L.push(`- ${mark}（${o.tZh}）`);
  });
  L.push('');
  L.push(`> **答案：${q.answer}**　依据句：*${q.evidence}*`);
  L.push('>');
  L.push(`> 解析：${q.evidenceZh}`);
  L.push('');
});

// 六、音频
L.push('---');
L.push('');
L.push('## 六、朗读音频');
L.push('');
L.push('音频在同目录的 `音频` 文件夹：');
L.push('');
d.audio.forEach((a) => {
  L.push(`- **${a.name}**　${a.desc}`);
});
L.push('');

// 使用建议
L.push('---');
L.push('');
L.push('## 建议学习顺序');
L.push('');
[
  '先听全文音频 1—2 遍，不看书，抓大意（谁、做了什么、为什么）。',
  '打开原文跟读，圈出不认识的词，对照“三、四”两部分清障。',
  '只看中文译文，尝试口头把每一段“译回”英文，再与原文比对。',
  '做题，用“依据句”核对答案出处；错题标出是细节题、猜词题还是主旨题。',
  '睡前再听一遍音频，不看文字，检验理解是否顺。'
].forEach((t, i) => {
  L.push(`${i + 1}. ${t}`);
});
L.push('');

fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
fs.writeFileSync(path.resolve(outPath), L.join('\n'), 'utf8');
console.log(`OK ${path.resolve(outPath)} ${fs.statSync(path.resolve(outPath)).size} bytes`);
