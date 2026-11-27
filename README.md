# ReadingPractices

中职三年级英语阅读精读学习包。每篇一个独立网页：**原文 + 选择题 + 逐句中英对照 + 生词构词拆解 + 重点短语注解 + 朗读音频**，纯静态、离线可用。

在线浏览：<https://wenwen.sjiax.ccwu.cc/>

## 一篇里有什么

点开任意 `practiceNN/`：

1. **原文**——整段英文，先通读；
2. **阅读理解题**——5 题，题干与选项都有中文，答案与依据默认折叠；
3. **逐句对照**——一行英文（加粗）、一行中文，点句首的 ▶ 朗读；正文里只有生词是橙黄底，点一下弹出卡片：音标、词性、释义、**构词拆解**（前缀/词根/后缀）、**变形**（形容词比较级/最高级、动词时态）、记忆点、例句，点单词本身即发音；中文译文和短语注解**首次打开默认收起**，右上「显示译文与注解」一键全开/全关，每句右侧的「译」按钮单独放这一行（总关时也能单独点开）；
4. **重点生词表**——每个词带构词行与变形行，可单独听；词汇按初中一年级水平筛，形容词、动词都给出变形；
5. **建议学习顺序**。

重点短语不单独成表，直接挂在它所在句子的下面（释义 + 例句 + 译文 + 发音），句子里不再给短语涂色或发音。

## 目录

```
index.html            目录首页（脚本生成）
404.html
assets/               全站共享的 style.css、app.js（脚本生成）
practiceNN/           每篇一个目录
  index.html
  assets/  practice.json
  assets/audio/        full.mp3、words.mp3、s/、w/、p/
source/               原始 PDF 试卷
tools/                生成脚本 + 模板 + 每篇的源数据
  build-tts.cjs  build-audio-assets.cjs  build-html.cjs  build-catalog.cjs  check-links.cjs
  assets/   style.css、app.js 模板（build-html 复制到站点根 assets/）
  data/     passageN.cjs（原文/译文/生词/短语/题目）
.agents/skills/reading-pack/   生成技能（流程说明 + 脚本 + 数据规范）
AGENTS.md             工作区与站点约定
```

## 新增一篇

```powershell
cd tools
npm install                                   # 只需 msedge-tts
# 1. 写 tools/data/passageN.cjs（格式见 .agents/skills/reading-pack/references/data-schema.md）
# 2. 生成
node build-tts.cjs          .\data\passageN.cjs "..\practiceNN\assets\audio" -6%
node build-audio-assets.cjs .\data\passageN.cjs "..\practiceNN"
node build-html.cjs         .\data\passageN.cjs "..\practiceNN"
node build-catalog.cjs      ".."
node check-links.cjs        ".."
# 3. 提交，Cloudflare 自动部署
git add -A; git commit -m "feat: practiceNN"; git push
```

## 实现说明

- **纯静态**：没有框架、没有构建步骤，Cloudflare Pages 直接发布仓库根目录（构建命令留空，输出目录 `/`）。
- **音频**：Edge 朗读接口（`msedge-tts`）。全文、逐句、短语用女声 `en-US-AvaMultilingualNeural`（−6% / −8%），短语整条连读；单词与生词连读用纯美式 `en-US-AndrewNeural`（−8%，每个词读两遍）。全部是本地 mp3，断网也能听。
- **页面**：每篇一个 `index.html`，样式与交互全站共用站点根 `assets/style.css`、`assets/app.js`（页面用 `../assets/…` 引用），无 CDN、无外部字体，中文用苹方、英文用 Georgia。
- **交互**：句子正文里只标生词（黄底），点一下弹卡片（音标/构词/变形/例句，卡片里的词本身可点读，**打开卡片就自动读**）；**整句朗读只走句首的 ▶**，点句子正文不发声。短语不涂色、不发音，释义、例句、用法和朗读都在句子下面的浅绿注解里（点注解文字或 ▶）。句子/短语和生词卡都会等音频下载得能连续播再开声，网慢时不会只响前半段。
- **词汇**：按初中一年级水平筛选，一般 35–45 个；形容词给比较级/最高级、动词给时态变化，页面显示成「变形」一行。
- **数据驱动**：`tools/data/passageN.cjs` 是唯一源，页面、目录、音频都从它生成；`build-html` 会校验逐句文本能拼回段落，`check-links` 会校验所有相对链接。
- **答案**：原卷没给答案的篇目，答案由原文推断，页面导读里已注明“仅供参考”。

## 许可

仅供学习使用。原文版权归原出题方所有；`source/` 下为原始试卷，仅作存档。
