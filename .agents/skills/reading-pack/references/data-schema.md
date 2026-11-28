# 数据文件结构（data.cjs）

只有一份数据，页面和全部音频都从它生成。写成 CommonJS：`module.exports = { ... }`。

## 完整示例

```js
module.exports = {
  no: 1,                                  // 第几篇，用于标题与页脚
  titleEn: 'A Letter of Thanks on Labor Thanksgiving Day',
  titleZh: '劳动感谢日的一封感谢信',        // 8–12 字，别硬译
  level: '中职三年级 · 词汇难度按初中一年级筛选',
  source: '阅读练习1(答案ABCDD)',           // 原文件名
  audios: [                               // 可选：多套音色（不写就按单套处理）
    { key: 'andrew', label: '男声 Andrew', sent: 'AndrewNeural', word: 'AndrewNeural', phrase: 'AndrewNeural' },
    { key: 'ava', label: '女声 Ava', sent: 'Ava Multilingual', word: 'AndrewNeural', phrase: 'Ava Multilingual' }
  ],                                      // key = assets/audio/<key>/ 子目录；label 显示在下拉里
  leadZh: '导读一句话：谁、做了什么、为什么；再补字数、段数、适用读法。',

  paragraphs: [                           // 原文，按段落，保持原标点
    'Every year on November 23, Japan celebrates ...',
    'Who is a worker? ...'
  ],

  lines: [                                // 逐句切分：页面逐行对照 + 逐句音频
    { p: 1, en: 'Every year on November 23, Japan celebrates ...', zh: '每年 11 月 23 日 ...' },
    { p: 1, en: 'The name of this holiday includes the word "labor."', zh: '这个节日的名称里包含 ...' }
  ],

  translation: [                          // 可选：整段译文，只用于作者自检
    '每年 11 月 23 日，日本都会庆祝 ...'
  ],

  forms: {                                // 生词在原文里的实际词形（高亮匹配用）
    celebrate: ['celebrates'],
    sweep: ['sweeping'],
    describe: ['described'],
    detail: ['details'],
    'primary school': ['primary schools']
  },

  phraseSurfaces: {                       // 能在原文里字面命中的短语（长短语优先）
    'Labor Thanksgiving Day': ['Labor Thanksgiving Day'],
    'every year': ['Every year'],
    'one another': ['one another']
  },

  vocab: [
    { w: 'recognition', ipa: '/ˌrekəɡˈnɪʃn/', pos: 'n.', zh: '认可，承认；认出', core: true,
      form: [['re-', '再'], ['cogn', '知道（同 know）'], ['-ition', '名词后缀']],
      note: '动词 recognize（认出）→ 名词 recognition',
      ex: 'The letter is a form of recognition of her work.', exZh: '这封信是对她工作的一种认可。' },
    { w: 'smooth', ipa: '/smuːð/', pos: 'adj.', zh: '平滑的，平顺的', core: true,
      form: [['smooth', '整体记忆（古英语 smōth）']],
      infl: '比较级 smoother；最高级 smoothest',          // 形容词：比较级/最高级
      note: '比较级 smoother 就出现在课文里',
      ex: 'This route is smoother.', exZh: '这条路更平顺。' },
    { w: 'guide', ipa: '/ɡaɪd/', pos: 'v.', zh: '引导，指引',
      form: [['guide', '整体记忆']],
      infl: '过去式 guided；过去分词 guided；现在分词 guiding；三单 guides',  // 动词：时态变化
      note: '也可作名词“导游、指南”',
      ex: 'The arrows guide you to the exit.', exZh: '箭头把你引向出口。' }
  ],

  phrases: [
    { p: 'show gratitude to sb', at: 2, zh: '向某人表示感激',
      note: 'gratitude 不可数；也可说 show sb gratitude',   // 可选：用法补充
      ex: 'We should show gratitude to our parents.', exZh: '我们应该感激父母。' }
  ],

  questions: [
    { q: 'When do people in Japan celebrate Labor Thanksgiving Day?',
      qZh: '日本人在什么时候庆祝劳动感谢日？',
      options: [
        { k: 'A', t: 'November 23', tZh: '11 月 23 日' },
        { k: 'B', t: 'October 23', tZh: '10 月 23 日' },
        { k: 'C', t: 'November 13', tZh: '11 月 13 日' },
        { k: 'D', t: 'December 23', tZh: '12 月 23 日' }
      ],
      answer: 'A',
      evidence: 'Every year on November 23, Japan celebrates a special holiday called Labor Thanksgiving Day.',
      evidenceZh: '细节题：文章第一句直接给出时间。' }
  ]
};
```

## 字段用途

| 字段 | 谁用 | 必需 |
|---|---|---|
| `no` `titleEn` `titleZh` `leadZh` `source` | 页头、页脚、朗读开头的标题 | 是 |
| `paragraphs` | 整篇朗读、段落划分 | 是 |
| `lines` | 逐句对照、逐句音频、生词高亮 | 是 |
| `vocab` / `forms` | 生词表、逐词音频、行内高亮 | 是 |
| `vocab[].form` / `vocab[].note` | 生词表里的构词拆解、弹窗里的"构词 + 记" | 是 |
| `vocab[].infl` | 弹窗与生词表里的「变形」一行（形容词比较级/最高级、动词时态） | 否（形容词、动词必写） |
| `phrases` / `at` | 句子下方的短语注解、短语音频 | 是 |
| `phraseSurfaces` | 备用字段，当前页面不涂绿（写不写都行） | 否 |
| `phrases[].note` | 注解里的第二行「用法：…」（可选，只写用法/易错点） | 否 |
| `questions` | 题目区 | 是 |
| `level` | 仅供人看，页面不显示 | 否 |
| `student` / `studentZh` / `gradeZh` | 目录首页按学生分组、篇目页头 kicker（站点约定，默认 `wenwen` / 文文 / 中职三年级） | 否 |
| `unit` / `unitLabel` / `part` / `sectionLabel` | 课本篇目的单元与板块，页头亮出「Unit 6 · Section B 1b」，列表页显示同款标签并按 `unit`+`part` 排序 | 否 |
| `audios` | 多套音色的声明，`[{ key, label, sent, word, phrase }]`：`key` 对应 `assets/audio/<key>/`，第一套是默认；≥2 套时播放条出现「音色」下拉，选择存 `localStorage`（全站通用） | 否 |
| `voices` | 旧字段（单套音色文案），`audios` 出现后不再需要；老数据仍兼容 | 否 |
| `translation` | 作者自检 | 否 |

## 硬性规则

1. **`lines` 必须能拼回 `paragraphs`**：同一 `p` 的 `en` 用空格连接、压缩空白后，要与该段原文完全一致。`build-html.cjs` 会校验，不一致会打印两段文本并以退出码 2 结束。
2. **`forms` 只放原文里真实出现的词形**：`celebrates`、`swept`、`details`、`schools`。写错不会报错，但也不会高亮。
3. **短语不在正文涂色**：正文只标生词，短语的释义、例句、朗读全在句子下面的注解里，注解是否出现只看 `at`。`phraseSurfaces` 现在只是备用字段（写不写都不影响页面）。带 `sb / sth / …` 的短语照常写进 `phrases` 并填 `at`。`phrases[].note` 可选，写用法、易错点、同义结构（15–60 字），页面在注解里单独起一行「用法：…」；别拿它写释义。
4. **`at` 必须指向真实存在的句子**（`0 ≤ at < lines.length`）。可以多对一：一句话里有两条短语就写两个相同 `at`，页面会把它们摞在同一块注解里；没有短语的句子不显示注解块。
5. **匹配优先级**：按字符串长度从长到短替换（`in society` 先于 `society`），重叠时短语获胜，这是预期行为。
6. **`vocab[].core`**：`true` 会在表格里打 ★。35–45 个生词里一般 16–20 个带 ★。
6.1 **顺序按出现先后排**：新词插到对应句附近，别一律追加到末尾。插入会使后续序号整体后移，`assets/audio/w/` 里的文件名是按序号拼的，所以**必须整组重新生成**（先删 `w/` 再跑 `build-audio-assets.cjs`），否则音频和单词对不上。改完生词数记得重跑 `build-catalog.cjs`（首页卡片上的"43 个生词"来自这里）。
7. **`evidence`** 必须是原文原句（可一句，也可用 ` / ` 连两三句），不要改写。
8. **`questions[].options` 顺序**就是 A/B/C/D，`answer` 用字母。
9. **每个生词都要有 `form` 和 `note`**：
   - `form` 是 `[[片段, 含义], …]`，按"前缀 → 词根 → 后缀"从左到右写，弹窗渲染成 `re- 再 + cogn 知道 + -ition 名词后缀`，生词表里也有一行紧凑版。
   - 拆不开的词（如 `ceremony`、`sweep`）写 `form: [['原词', '拉丁语……，整体记忆']]`，别硬编词根。
   - `note` 写同族词、搭配、不规则变化，一句 15–30 字，用 `→` 表示派生方向。
   - **`infl`（变形）**：形容词写 `比较级 X；最高级 Y`（短词 `-er/-est`，长词 `more/most`），动词写 `过去式 X；过去分词 Y；现在分词 Z；三单 W`。不可分级的形容词（`final`、`opposite`、`daily`、`colored`）和名词不用写。中文标签用 `；` 分隔，页面直接显示在卡片和表格里。
   - 常见词缀注释统一口径：`-tion/-ition/-ion` 名词后缀、`-ment` 名词后缀（表行为或结果）、`-ate/-ify` 动词后缀、`-ive/-able/-ary/-ous` 形容词后缀、`-ly` 副词后缀、`re-` 再/回、`ex-/ef-` 向外、`de-` 向下/分开、`pro-` 向前、`pre-` 在前、`spect` 看、`duct` 引导、`scrib` 写、`port` 拿/运。

## 生词怎么选（初中一年级水平）

- 标准是**初一**：初一没学过的都要收，一般 **35–45 个**。`smoother`、`modern`、`choice`、`hall`、`daily`、`however`、`design` 这个级别都算生词。
- 收：抽象词、派生词、复合词（`hard-working`、`hand-drawn`）、常见但学生没掌握的副词（`carefully`、`safely`）。
- 不收：`holiday` `worker` `doctor` `teacher` `picture` 这种最基础的词；`important`、`during` 这类如果学生吃力，收进来并在 `note` 里写清搭配。
- `pos` 用缩写：`v.` `n.` `adj.` `adv.` `v. / n.`。
- `ex` 造一句 6–12 词的短句，尽量复用原文搭配；`exZh` 给自然中文。
- 音标用**美式**，带重音符号；词尾 `r` 不要省。
