// 生成《阅读练习N 学习包》docx
// 用法: node build-docx.cjs <data.cjs> <out.docx>
const path = require('path');
const fs = require('fs');
const D = require('docx');

const {
  Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  VerticalAlign, Footer, PageNumber, TabStopType, TabStopPosition
} = D;

const dataPath = process.argv[2];
const outPath = process.argv[3];
if (!dataPath || !outPath) {
  console.error('usage: node build-docx.cjs <data.cjs> <out.docx>');
  process.exit(1);
}
const d = require(path.resolve(dataPath));

const SERIF = { ascii: 'Times New Roman', hAnsi: 'Times New Roman', eastAsia: '宋体', cs: 'Times New Roman' };
const SERIF_B = { ascii: 'Times New Roman', hAnsi: 'Times New Roman', eastAsia: '黑体', cs: 'Times New Roman' };
const IPA_FONT = { ascii: 'Segoe UI', hAnsi: 'Segoe UI', eastAsia: '等线', cs: 'Segoe UI' };
const SONG = { ascii: 'Times New Roman', hAnsi: 'Times New Roman', eastAsia: '宋体', cs: 'Times New Roman' };
const KAI = { ascii: 'Times New Roman', hAnsi: 'Times New Roman', eastAsia: '楷体', cs: 'Times New Roman' };

const INK = '1A1A1A';
const GRAY = '595959';
const NAVY = '1F3864';
const ACCENT = '2E5C8A';
const LIGHT = 'EDF2F9';

// ---------- 小工具 ----------
const p = (opts = {}) => new Paragraph(opts);
const run = (text, o = {}) => new TextRun({ text, font: o.font || SERIF, size: o.size || 21, bold: o.bold, italics: o.italics, color: o.color || INK, ...(o.extra || {}) });

function sectionTitle(num, cn, en) {
  return new Paragraph({
    style: 'SectionTitle',
    spacing: { before: 260, after: 130 },
    children: [
      new TextRun({ text: `${num}  `, font: SERIF_B, size: 26, bold: true, color: ACCENT }),
      new TextRun({ text: cn, font: SERIF_B, size: 26, bold: true, color: NAVY }),
      new TextRun({ text: en ? `  ${en}` : '', font: { ascii: 'Segoe UI', hAnsi: 'Segoe UI', eastAsia: '黑体' }, size: 18, color: '8EA9C1' })
    ]
  });
}

const body = (runs, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 80, line: o.line ?? 300 },
  indent: o.indent,
  alignment: o.alignment,
  border: o.border,
  shading: o.shading,
  children: runs
});

// ---------- 表格构件 ----------
const CELL_MARGIN = { top: 48, bottom: 48, left: 100, right: 100 };
const GRID = { style: BorderStyle.SINGLE, size: 2, color: 'C9D3E0' };

function cell(children, width, opts = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    children,
    margins: CELL_MARGIN,
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.head
      ? { type: ShadingType.CLEAR, color: 'auto', fill: NAVY }
      : opts.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: opts.fill } : undefined,
    borders: { top: GRID, bottom: GRID, left: GRID, right: GRID }
  });
}

function headCell(text, width) {
  return cell([new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text, font: SERIF_B, size: 18, bold: true, color: 'FFFFFF' })]
  })], width, { head: true });
}

const COLW = { idx: 520, word: 1660, ipa: 1880, pos: 660, zh: 1560, ex: 3358 };
const PW = Object.values(COLW).reduce((a, b) => a + b, 0); // ≈9638 twips

function table(rows, widths) {
  return new Table({
    width: { size: PW, type: WidthType.DXA },
    columnWidths: widths,
    rows,
    borders: {
      top: GRID, bottom: GRID, left: GRID, right: GRID,
      insideHorizontal: GRID, insideVertical: GRID
    }
  });
}

// ---------- 封面区 ----------
const children = [];

children.push(new Paragraph({
  spacing: { before: 0, after: 60 },
  children: [new TextRun({ text: `中职三年级 · 英语阅读精读学习包（${String(d.no).padStart(2, '0')}）`, font: SERIF_B, size: 18, color: ACCENT, characterSpacing: 20 })]
}));
children.push(new Paragraph({
  spacing: { after: 40 },
  children: [new TextRun({ text: d.titleEn, font: { ascii: 'Georgia', hAnsi: 'Georgia', eastAsia: '黑体' }, size: 40, bold: true, color: NAVY })]
}));
children.push(new Paragraph({
  spacing: { after: 120 },
  children: [new TextRun({ text: d.titleZh, font: SERIF_B, size: 26, color: ACCENT })]
}));
children.push(new Paragraph({
  spacing: { after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 6 } },
  children: [new TextRun({ text: `原文来源：${d.source}　|　词汇标准：${d.level}`, font: SERIF, size: 17, color: GRAY })]
}));

// 导语
children.push(new Paragraph({
  spacing: { before: 120, after: 160, line: 300 },
  indent: { left: 140 },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: 'B7CBE3', space: 10 } },
  shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F5F8FC' },
  children: [
    new TextRun({ text: '导读　', font: SERIF_B, size: 18, bold: true, color: ACCENT }),
    new TextRun({ text: d.leadZh, font: KAI, size: 19, color: '33475B' })
  ]
}));

// ---------- 一、原文 ----------
children.push(sectionTitle('一', '英文原文', 'The Text'));
d.paragraphs.forEach((t, i) => {
  children.push(body([
    new TextRun({ text: `${i + 1}  `, font: { ascii: 'Segoe UI', hAnsi: 'Segoe UI', eastAsia: '黑体' }, size: 17, bold: true, color: '9AB2CC' }),
    new TextRun({ text: t, font: { ascii: 'Georgia', hAnsi: 'Georgia', eastAsia: '宋体' }, size: 21, color: INK })
  ], { after: 120, line: 340 }));
});

// ---------- 二、译文 ----------
children.push(sectionTitle('二', '全文翻译', 'Translation'));
d.paragraphs.forEach((t, i) => {
  children.push(new Paragraph({
    spacing: { before: 30, after: 0, line: 300 },
    indent: { left: 200 },
    children: [new TextRun({ text: `【第 ${i + 1} 段】`, font: SERIF_B, size: 17, bold: true, color: ACCENT })]
  }));
  children.push(new Paragraph({
    spacing: { after: 120, line: 300 },
    indent: { left: 200 },
    children: [new TextRun({ text: d.translation[i], font: KAI, size: 20, color: '333333' })]
  }));
});

// ---------- 三、生词 ----------
children.push(sectionTitle('三', '重点生词', 'New Words'));
children.push(new Paragraph({
  spacing: { after: 120 },
  children: [new TextRun({ text: '音标为美式音标（IPA）；标 ★ 的是初中阶段高频、必须会拼写和使用的核心词。', font: SERIF, size: 17, color: GRAY })]
}));

const vocabRows = [new TableRow({
  tableHeader: true,
  children: [
    headCell('#', COLW.idx), headCell('单词', COLW.word), headCell('音标', COLW.ipa),
    headCell('词性', COLW.pos), headCell('释义', COLW.zh), headCell('例句 / 译文', COLW.ex)
  ]
})];

d.vocab.forEach((v, i) => {
  vocabRows.push(new TableRow({
    children: [
      cell([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: [new TextRun({ text: String(i + 1), font: { ascii: 'Segoe UI', hAnsi: 'Segoe UI', eastAsia: '等线' }, size: 16, color: GRAY })] })], COLW.idx),
      cell([new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({ text: v.w, font: { ascii: 'Georgia', hAnsi: 'Georgia', eastAsia: '宋体' }, size: 19, bold: true, color: NAVY }),
          v.core ? new TextRun({ text: ' ★', font: { ascii: 'Segoe UI', hAnsi: 'Segoe UI', eastAsia: '宋体' }, size: 16, color: 'C00000' }) : new TextRun({ text: '' })
        ]
      })], COLW.word, { fill: i % 2 ? 'FAFCFF' : undefined }),
      cell([new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: v.ipa, font: IPA_FONT, size: 18, color: '3A4A5C' })] })], COLW.ipa),
      cell([new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: v.pos, font: { ascii: 'Georgia', hAnsi: 'Georgia', eastAsia: '宋体' }, size: 17, italics: true, color: GRAY })] })], COLW.pos),
      cell([new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: v.zh, font: SONG, size: 18 })] })], COLW.zh),
      cell([
        new Paragraph({ spacing: { before: 0, after: 20 }, children: [new TextRun({ text: v.ex, font: { ascii: 'Georgia', hAnsi: 'Georgia', eastAsia: '宋体' }, size: 17, color: '24405C' })] }),
        new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: v.exZh, font: KAI, size: 16, color: GRAY })] })
      ], COLW.ex)
    ]
  }));
});
children.push(table(vocabRows, [COLW.idx, COLW.word, COLW.ipa, COLW.pos, COLW.zh, COLW.ex]));

// ---------- 四、短语 ----------
children.push(sectionTitle('四', '重点短语', 'Key Phrases'));
const PH = { p: 2750, zh: 2400, ex: 4488 };
const phraseRows = [new TableRow({
  tableHeader: true,
  children: [headCell('短语', PH.p), headCell('释义', PH.zh), headCell('例句 / 译文', PH.ex)]
})];
d.phrases.forEach((v, i) => {
  phraseRows.push(new TableRow({
    children: [
      cell([new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: v.p, font: { ascii: 'Georgia', hAnsi: 'Georgia', eastAsia: '宋体' }, size: 18, bold: true, color: NAVY })] })], PH.p, { fill: i % 2 ? 'FAFCFF' : undefined }),
      cell([new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: v.zh, font: SONG, size: 18 })] })], PH.zh),
      cell([
        new Paragraph({ spacing: { before: 0, after: 20 }, children: [new TextRun({ text: v.ex, font: { ascii: 'Georgia', hAnsi: 'Georgia', eastAsia: '宋体' }, size: 17, color: '24405C' })] }),
        new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: v.exZh, font: KAI, size: 16, color: GRAY })] })
      ], PH.ex)
    ]
  }));
});
children.push(table(phraseRows, [PH.p, PH.zh, PH.ex]));

// ---------- 五、题目 ----------
children.push(sectionTitle('五', '阅读理解题 · 答案与依据', 'Questions & Answers'));
d.questions.forEach((q, qi) => {
  children.push(new Paragraph({
    spacing: { before: qi ? 200 : 60, after: 50, line: 300 },
    children: [
      new TextRun({ text: `${qi + 1}. `, font: SERIF_B, size: 20, bold: true, color: NAVY }),
      new TextRun({ text: q.q, font: { ascii: 'Georgia', hAnsi: 'Georgia', eastAsia: '宋体' }, size: 20, bold: true, color: '1B2B3D' })
    ]
  }));
  children.push(new Paragraph({
    spacing: { after: 80 },
    indent: { left: 240 },
    children: [new TextRun({ text: q.qZh, font: KAI, size: 17, color: GRAY })]
  }));
  q.options.forEach((o) => {
    const isAns = o.k === q.answer;
    children.push(new Paragraph({
      spacing: { after: 30, line: 280 },
      indent: { left: 320 },
      children: [
        new TextRun({ text: `${o.k}. ${o.t}`, font: { ascii: 'Georgia', hAnsi: 'Georgia', eastAsia: '宋体' }, size: 18, bold: isAns, color: isAns ? '1F6B3B' : '3A3A3A' }),
        new TextRun({ text: `（${o.tZh}）`, font: SONG, size: 16, color: isAns ? '1F6B3B' : '8A8A8A' })
      ]
    }));
  });
  children.push(new Paragraph({
    spacing: { before: 60, after: 40, line: 300 },
    indent: { left: 320 },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F2F7F2' },
    children: [
      new TextRun({ text: `答案：${q.answer}　`, font: SERIF_B, size: 18, bold: true, color: '1F6B3B' }),
      new TextRun({ text: '依据句：', font: SERIF_B, size: 17, bold: true, color: '1F6B3B' }),
      new TextRun({ text: q.evidence, font: { ascii: 'Georgia', hAnsi: 'Georgia', eastAsia: '宋体' }, size: 17, italics: true, color: '2B4A35' })
    ]
  }));
  children.push(new Paragraph({
    spacing: { after: 60, line: 280 },
    indent: { left: 320 },
    children: [new TextRun({ text: `解析：${q.evidenceZh}`, font: KAI, size: 17, color: '44515E' })]
  }));
});

// ---------- 六、音频 ----------
children.push(sectionTitle('六', '朗读音频', 'Audio'));
children.push(new Paragraph({
  spacing: { after: 100 },
  children: [new TextRun({ text: `音频与本学习包放在同一目录的“音频”文件夹中：`, font: SERIF, size: 18, color: '333333' })]
}));
d.audio.forEach((a) => {
  children.push(new Paragraph({
    spacing: { after: 70, line: 300 },
    indent: { left: 200 },
    children: [
      new TextRun({ text: '▶ ', font: { ascii: 'Segoe UI', hAnsi: 'Segoe UI', eastAsia: '等线' }, size: 18, color: ACCENT }),
      new TextRun({ text: a.name, font: { ascii: 'Segoe UI', hAnsi: 'Segoe UI', eastAsia: '等线' }, size: 18, bold: true, color: NAVY }),
      new TextRun({ text: `　${a.desc}`, font: KAI, size: 17, color: GRAY })
    ]
  }));
});

// 使用建议
children.push(new Paragraph({
  spacing: { before: 220, after: 100 },
  children: [new TextRun({ text: '建议学习顺序', font: SERIF_B, size: 20, bold: true, color: NAVY })]
}));
[
  '① 先听全文音频 1—2 遍，不看书，抓大意（谁、做了什么、为什么）。',
  '② 打开原文跟读，圈出不认识的词，对照第“三、四”部分清障。',
  '③ 只看中文译文，尝试口头把每一段“译回”英文，再与原文比对。',
  '④ 做题，用“依据句”核对答案出处；错题标出是细节题、猜词题还是主旨题。',
  '⑤ 睡前再听一遍音频，不看文字，检验理解是否顺。'
].forEach((t) => {
  children.push(new Paragraph({
    spacing: { after: 50, line: 300 },
    indent: { left: 200 },
    children: [new TextRun({ text: t, font: SONG, size: 18, color: '33404D' })]
  }));
});

// ---------- 文档 ----------
const doc = new Document({
  creator: 'DSH 学习包生成器',
  title: `${d.titleEn} — 学习包`,
  description: `中职三年级英语阅读精读学习包：${d.titleZh}`,
  styles: {
    default: {
      document: {
        run: { font: SERIF, size: 21, color: INK },
        paragraph: { spacing: { line: 320, after: 80 } }
      }
    },
    paragraphStyles: [
      {
        id: 'SectionTitle', name: 'Section Title', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: SERIF_B, size: 26, bold: true, color: NAVY },
        paragraph: { spacing: { before: 300, after: 140 }, keepNext: true }
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1134, bottom: 1134, left: 1134, right: 1134, header: 720, footer: 720 }
      }
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `${d.titleZh} · 学习包　　第 `, font: SERIF, size: 16, color: '9AA5B1' }),
            new TextRun({ children: [PageNumber.CURRENT], font: SERIF, size: 16, color: '9AA5B1' }),
            new TextRun({ text: ' 页 / 共 ', font: SERIF, size: 16, color: '9AA5B1' }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: SERIF, size: 16, color: '9AA5B1' }),
            new TextRun({ text: ' 页', font: SERIF, size: 16, color: '9AA5B1' })
          ]
        })]
      })
    },
    children
  }]
});

Packer.toBuffer(doc).then((buf) => {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  console.log(`OK ${outPath} ${buf.length} bytes`);
}).catch((e) => {
  console.error('FAIL', e && e.stack ? e.stack : e);
  process.exit(1);
});
