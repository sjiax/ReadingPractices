// 给 vocab 每条插入构词拆解（form）与记忆提示（note）
// 用法: node add-forms.cjs <data.cjs>
const fs = require('fs');
const path = require('path');

const file = path.resolve(process.argv[2] || 'data/passage1.cjs');

// form: [[片段, 含义], ...]；空数组表示"不可拆"，只给 note
const MAP = {
  celebrate: {
    form: [['celebr', '聚集、庆贺（拉丁 celebrāre）'], ['-ate', '动词后缀']],
    note: '名词 celebration（庆祝活动）；celebrated 还可作"著名的"'
  },
  government: {
    form: [['govern', '统治、管理'], ['-ment', '名词后缀，表行为或结果']],
    note: 'govern（动词，统治）→ governor（州长、管理者）'
  },
  explain: {
    form: [['ex-', '向外'], ['plain', '平（把话摊平说开）']],
    note: '名词 explanation（解释）；同 plain（平原）同源'
  },
  value: {
    form: [['val', '价值、强壮（同 valid 有效的）'], ['-ue', '名词／动词词尾']],
    note: '形容词 valuable（宝贵的）'
  },
  production: {
    form: [['pro-', '向前'], ['duct', '引导（同 conduct）'], ['-ion', '名词后缀']],
    note: '动词 produce（生产）；同族 introduce、reduce'
  },
  gratitude: {
    form: [['grat-', '感谢、令人愉快（同 grateful）'], ['-itude', '名词后缀，表状态']],
    note: '形容词 grateful（感激的）；近义词 thankfulness'
  },
  respect: {
    form: [['re-', '回、再'], ['spect', '看（同 inspect、spectator）']],
    note: '原义"回头再看一眼"→ 看重、尊敬；形容词 respectful'
  },
  society: {
    form: [['soci-', '同伴、联合（同 social）'], ['-ety', '名词后缀']],
    note: '形容词 social（社会的）；socialist 社会主义者'
  },
  'primary school': {
    form: [['prim-', '第一（同 prime 首要的）'], ['-ary', '形容词后缀'], ['school', '学校']],
    note: 'primary = 初级的，对应 secondary（中等的）'
  },
  ceremony: {
    form: [['caerimonia', '拉丁语"神圣的仪式"，整体记忆']],
    note: '形容词 ceremonial（仪式的）；不只指婚礼，任何仪式都可'
  },
  recognition: {
    form: [['re-', '再'], ['cogn', '知道（同 know）'], ['-ition', '名词后缀']],
    note: '动词 recognize（认出）→ 名词 recognition'
  },
  recently: {
    form: [['recent', '最近的'], ['-ly', '副词后缀']],
    note: '形容词 recent；常与现在完成时连用'
  },
  hallway: {
    form: [['hall', '大厅'], ['way', '通道']],
    note: '合成词；同类 doorway（门口通道）、freeway（高速公路）'
  },
  tidy: {
    form: [['tid', '时节、适当的（同 tide）'], ['-y', '形容词后缀']],
    note: '反义词 untidy（凌乱的）；tidy up 收拾整理'
  },
  sweep: {
    form: [['sweep', '古英语单音节词，不拆分']],
    note: '不规则变化 sweep–swept–swept；工具是 broom（扫帚）'
  },
  describe: {
    form: [['de-', '向下'], ['scribe', '写（同 script 手稿）']],
    note: '名词 description（描述）；describe sb/sth as 把……说成'
  },
  appreciate: {
    form: [['ap-', '= ad-，朝向'], ['preci', '价格、价值（同 price）'], ['-ate', '动词后缀']],
    note: '原义"看出价值"→ 欣赏、感激；名词 appreciation'
  },
  expensive: {
    form: [['ex-', '向外'], ['pens', '支付、称重（同 spend）'], ['-ive', '形容词后缀']],
    note: '名词 expense（花费）；反义词 cheap'
  },
  specific: {
    form: [['spec-', '看（同 spectacle 景象）'], ['-ific', '形容词后缀']],
    note: '动词 specify（明确说明）；名词 specifics（具体细节）'
  },
  detail: {
    form: [['de-', '分开、向下'], ['tail', '切（同 tailor 裁缝）']],
    note: '原义"切成小块"→ 细目、细节；in detail 详细地'
  },
  effort: {
    form: [['ef-', '= ex-，向外'], ['fort', '力量（同 force）']],
    note: 'make an effort to do sth 努力做某事'
  },
  valuable: {
    form: [['value', '价值'], ['-able', '形容词后缀，能……的']],
    note: '反义词 worthless（无价值的）；valuables 贵重物品'
  },
  brightly: {
    form: [['bright', '明亮的'], ['-ly', '副词后缀']],
    note: 'smile brightly 笑得很灿烂；形容词 bright'
  },
  'hand-drawn': {
    form: [['hand', '手'], ['drawn', 'draw 的过去分词，画']],
    note: '复合形容词；同类 hand-made（手工的）'
  },
  'hard-working': {
    form: [['hard', '努力地'], ['working', '工作']],
    note: '复合形容词；名词短语 a hard worker（勤奋的人）'
  }
};

const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const out = [];
let current = null;
let inserted = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const m = /^\s*\{ w: '([^']+)',/.exec(line);
  if (m) current = m[1];
  if (current && /^\s*ex: /.test(line) && MAP[current]) {
    const info = MAP[current];
    const parts = info.form.map(([p, g]) => `['${p}', '${g}']`).join(', ');
    out.push(`      form: [${parts}],`);
    out.push(`      note: '${info.note}',`);
    inserted += 1;
    current = null;
  }
  out.push(line);
}

fs.writeFileSync(file, out.join('\n'), 'utf8');
console.log(`已插入 ${inserted} 条构词说明 -> ${path.basename(file)}`);
