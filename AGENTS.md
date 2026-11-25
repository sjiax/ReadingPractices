# 工作区约定（文文 / 英语阅读练习站）

本文件放在仓库根（= 站点根），同时硬链接到 `D:\_文文安琪\文文\AGENTS.md`，DSH 从工作区根读它、git 从仓库根追踪它，两边是同一个文件。

技能负责“把一篇阅读材料做成学习包”的通用流程；站点长什么样、放在哪、怎么发布，看这里。两者冲突时以本文件为准。

## 1. 仓库与目录

**仓库根就是站点根，也是 Cloudflare 的发布目录**（`sjiax/ReadingPractices`，公开仓库）。

```
Practices/                     # 仓库根 + 站点根
  index.html                   # 目录首页（脚本生成，勿手改）
  404.html
  practiceNN/                  # 每篇一个目录，名字就是 URL
    index.html
    assets/  style.css · app.js · practice.json · audio/{full,words,s,w,p}
  tools/                       # 生成脚本 + 模板 + 源数据（公开，但不会被页面引用）
    build-*.cjs  check-links.cjs  test-bubble.cjs  list-voices.cjs  sample-voices.cjs
    assets/    style.css、app.js（模板，build-html 复制进每篇）
    data/      passageN.cjs（每篇的唯一源数据，含原文/译文/生词/短语/题目）
    node_modules/              # 本地依赖，.gitignore 排除，不进仓库
  skills/reading-pack/         # 生成技能本体（SKILL.md + scripts + assets + references）
  AGENTS.md                    # 本文件
  .gitignore
```

- 新篇目一律 `Practices\practiceNN`（两位 ASCII 序号），**不要套 `网页版\`**，不要中文目录名，不要空格。
- `tools/` 和 `skills/` 会被静态发布成 `/tools/…`、`/skills/…`。这是**有意为之**（开源仓库，没什么可藏的），不要去“隐藏”它们。
- `tools/node_modules`、`tools/shots`、`*.bak`、`_test_*.html` 不进仓库，也不会被发布。

## 2. 首页与单篇的结构

**目录首页**（`Practices/index.html`）只做导航：一行一张卡片，含序号、中文名、英文标题、统计标签、「开始学习 →」。首页**不放**原文和题目。

**每篇页面**（`practiceNN/index.html`）固定顺序：

1. 「← 所有篇目」+ 标题区（中文名、英文标题、统计、导读）；
2. 吸顶播放条（全文 / 生词连读 / 变速 / 点词自动发音）；
3. **一 原文**：整段英文，纯文本，不加标注；
4. **二 阅读理解题**：题干 + 题干中文 + A–D（含选项中文），答案与依据默认折叠；
5. 三 逐句对照（点句朗读、点生词弹卡、短语注解挂句下）；
6. 四 重点生词；五 建议学习顺序。

首页读各篇的 `assets/practice.json`，篇目读 `tools/data/passageN.cjs`。**加新篇后必须重跑 `build-catalog.cjs`**。

## 3. 部署（Cloudflare Pages）

| 项 | 值 |
|---|---|
| 连接方式 | Git 集成（push → 自动部署，实测 75–105 秒生效） |
| 生产分支 | `main`（其他分支 → 预览部署） |
| 构建命令 | 留空（没有构建步骤） |
| 构建输出目录 | `/`（仓库根就是站点根） |
| 入口 | `index.html`（目录请求自动回落） |
| 404 | `404.html` |
| 自定义域名 | `https://wenwen.sjiax.ccwu.cc/` |

- **不需要 `*.js` 入口**：`index.html` 就是云端认的首页。JS 只在写 Workers 函数或 SPA 重写时才需要。
- 链接全部相对路径（`./practiceNN/index.html`、`../index.html`）；不要 `/practiceNN/` 这种绝对路径。
- 每篇页头的 `← 所有篇目` 指向 `../index.html`，所以篇目必须正好在站点根下一层。
- 缓存：HTML 是 `max-age=0, must-revalidate`，改完刷新即生效；音频文件名固定，若发现“改了音频线上还是旧的”，在链接上加个 `?v=2` 或等缓存过期。

## 4. 新增一篇的标准动作

```powershell
Set-Location "D:\_文文安琪\文文\Practices\tools"
$data = ".\data\passageN.cjs"
$web  = "..\practiceNN"
node build-tts.cjs          $data "$web\assets\audio" en-US-AndrewMultilingualNeural "-6%"
node build-audio-assets.cjs $data $web                en-US-AndrewMultilingualNeural "-6%"
node build-html.cjs         $data $web
node build-catalog.cjs      ".."
node check-links.cjs        ".."
```

收尾必须：`缺失 0` + 链接 `缺失 0` + 首页出现新卡片 + 篇目顶部能返回 + 冒泡回归（`node ..\skills\reading-pack\scripts\test-bubble.cjs ..\practiceNN`）通过。
然后 `git add -A && git commit && git push`，等 Cloudflare 自动部署。

## 5. 内容约定

- **原卷没有答案时**，答案由我依据原文推断，并在该篇导读里注明“原卷未给答案，本页答案为依据原文推断，仅供参考”。不要伪装成原卷答案。
- **原文保持原样**：不改人称、时态、词序。有人觉得 `the school cleaner … she` 奇怪，那是 “cleaner = 清洁剂” 的词义误判，不是人称错误（已与用户确认，不改）。
- **原文里的中文夹注要移出句子**：像 `interchange（互换） station` 这种印在英文里的括号注释会打断句子；把该词收进生词表、注释写进 `note`，句子保持纯英文。
- 每道题的答案必须能指回**原文原句**（`evidence`），解析里点明细节题 / 猜词题 / 主旨题。
- 生词按出现顺序排，每个都要有 **构词拆解 + 记忆点**；拆不开的词（ceremony、sweep）如实写“整体记忆”，不硬编词根。

## 6. 版式约定（读者是基础较弱的学生，主要用 iPad）

- 纯白底、苹方中文、Georgia 英文；正文 20px / 英文句 21px / 译文 19px；**英文原文加粗**。
- 生词**点击**弹出（不是悬停）；卡片给音标、词性、释义、构词、记忆点、例句；**点单词本身发音，底部不放“听发音”按钮**。
- 重点短语的释义与例句挂在它所在句子下面（浅绿注解），可一键收起。
- 题目答案默认折叠，展开后才把正确项标绿。
- 字号再调只做“整体加一档”，别单独放大某一块。
- 打印用用户提供的源 PDF，网页不做“只打印某块”。

## 7. 技能位置与分工

- 技能本体：`Practices\skills\reading-pack\`（仓库内，随 git 备份）。
- 工作区入口：`D:\_文文安琪\文文\.dsh\skills\reading-pack` 是指向它的**目录联接**，DSH 靠这个路径发现技能；改内容改哪边都行，因为是同一个目录。
- 新机器 clone 仓库后，在本工作区建同样的联接即可：
  `New-Item -ItemType Junction -Path .dsh\skills\reading-pack -Target <仓库>\skills\reading-pack`
- 改**通用流程**（取词、切句、音频参数、卡片结构、版式值）→ 改 `skills/reading-pack`，并同步 `tools/assets` 里的模板；改完核对两边哈希一致。
- 改**本站点约定**（目录、首页、部署、仓库卫生）→ 只改本文件。
