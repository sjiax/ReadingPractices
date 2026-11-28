# 工作区约定（文文 / 英语阅读练习站）

本文件放在仓库根（= 站点根），同时硬链接到 `D:\_文文安琪\文文\AGENTS.md`，DSH 从工作区根读它、git 从仓库根追踪它，两边是同一个文件。

技能负责“把一篇阅读材料做成学习包”的通用流程；站点长什么样、放在哪、怎么发布，看这里。两者冲突时以本文件为准。

## 1. 仓库与目录

**仓库根就是站点根，也是 Cloudflare 的发布目录**（`sjiax/ReadingPractices`，公开仓库）。

```
Practices/                     # 仓库根 + 站点根
  index.html                   # 目录首页（脚本生成，勿手改）
  404.html
  README.md                    # 仓库说明（公开，页面不引用）
  assets/                      # 全站共享静态资源（脚本生成，勿手改）
    style.css  app.js          # 各篇页面统一用 ../assets/… 引用
  wenwenNN/ · anqiNN/          # 每篇一个目录，名字就是 URL（学生前缀 + 两位序号）
    index.html
    assets/  practice.json · audio/{full,words,s,w,p}
  source/                      # 原始 PDF 素材（存档用；公开仓库，等于公开可下载）
  tools/                       # 生成脚本 + 模板 + 源数据（公开，但不会被页面引用）
    build-*.cjs  check-links.cjs  test-bubble.cjs  list-voices.cjs  sample-voices.cjs
    assets/    style.css、app.js（模板源，build-html 复制到站点根 assets/）
    data/      wenwenNN.cjs · anqiNN.cjs（每篇的唯一源数据，含原文/译文/生词/短语/题目）
    node_modules/              # 本地依赖，.gitignore 排除，不进仓库
  .agents/skills/reading-pack/ # 生成技能本体（SKILL.md + scripts + assets + references）
  AGENTS.md                    # 本文件
  .gitignore
```

- 新篇目目录一律 `Practices\<student>NN`：`wenwen01…`（文文）、`anqi01…`（安琪），**两位 ASCII 序号、每个学生各自从 01 数起**（所以 `wenwen05` 和 `anqi02` 可以同时存在）。**不要套 `网页版\`**，不要中文目录名，不要空格。
- **两个人共用一套站点**：谁的文章由目录前缀和数据里的 `student`（`wenwen` / `anqi`）、`studentZh`、`gradeZh` 决定，三者必须一致。首页用两个 Tab 分开（文文 · 中职三年级 / 安琪 · 八年级，默认文文），篇目页头 kicker 显示「学生 · 年级 · 第 NN 篇」，这个 NN 是**该学生自己的序号**（数据里的 `no`，不是全站流水号）。
- 历史目录名 `practice01…practice05` 已改为 `wenwen01–03`、`anqi01–02`；站点根的 `_redirects` 给旧地址做了 301，别删。
- `tools/` 会被静态发布成 `/tools/…`。这是**有意为之**（开源仓库，没什么可藏的）。`.agents/` 以点开头，通常不会被发布。
- `tools/node_modules`、`tools/shots`、`*.bak`、`_test_*.html` 不进仓库，也不会被发布。
- **样式和交互全站只有一份**：`assets/style.css`、`assets/app.js` 在站点根，各篇页面用 `../assets/…` 引用；每篇的 `assets/` 只留本篇的 `practice.json` 和音频。改版式/交互只改 `tools/assets/`（同步技能 `assets/`），随便重建一篇就会把站点根那两份刷新，三篇同时生效。

## 2. 首页与单篇的结构

**目录首页**（`Practices/index.html`）只做导航：**两个 Tab**——「文文 · 中职三年级」「安琪 · 八年级」，**默认显示文文**；每个 Tab 里是一行一张卡片（序号、中文名、英文标题、统计标签、「开始学习 →」），课本篇目的卡片前面带「Unit 6 · Section B 1b」这样的单元标签，右上「排序」可切换**按单元**（默认，无单元的后置）/ **按编号**，Tab 上标本篇数，切换用内联 JS（支持 `#wenwen` / `#anqi` 深链）。首页**不放**原文和题目。

**每篇页面**（`wenwenNN/index.html` · `anqiNN/index.html`）固定顺序：

1. 「← 所有篇目」+ 标题区（中文名、英文标题、统计、导读）；
2. 吸顶播放条（全文 / 生词连读 / 变速 / 点词自动发音）；
3. **一 原文**：整段英文，纯文本，不加标注；
4. **二 阅读理解题**：题干 + 题干中文 + A–D（含选项中文），答案与依据默认折叠；
5. 三 逐句对照（点句子的 ▶ 朗读、点生词弹卡、短语注解挂句下）；
6. 四 重点生词；五 建议学习顺序。

首页读各篇的 `assets/practice.json`，篇目读 `tools/data/wenwenNN.cjs`（或 `anqiNN.cjs`）。**加新篇后必须重跑 `build-catalog.cjs`**。

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
- 链接全部相对路径（`./wenwen01/index.html`、`../index.html`）；不要 `/wenwen01/` 这种绝对路径。
- 旧地址（`/practice01/` … `/practice05/`）靠站点根 `_redirects` 301 到新目录；再加新篇不用动它。
- 每篇页头的 `← 所有篇目` 指向 `../index.html`，所以篇目必须正好在站点根下一层。
- 缓存：HTML 与共享的 `assets/*.css|js` 都是 `max-age=0, must-revalidate`，改完刷新即生效；音频文件名固定，若发现“改了音频线上还是旧的”，在链接上加个 `?v=2` 或等缓存过期。

## 4. 新增一篇的标准动作

```powershell
Set-Location "D:\_文文安琪\文文\Practices\tools"
$data = ".\data\wenwenNN.cjs"          # 安琪的篇目换成 .\data\anqiNN.cjs
$web  = "..\wenwenNN"                  # 安琪的篇目换成 ..\anqiNN
node build-tts.cjs          $data "$web\assets\audio"      # 默认：全文/逐句 Ava（女声），生词 AndrewNeural
node build-audio-assets.cjs $data $web                      # 默认：句子/短语 Ava，单词 AndrewNeural
node build-html.cjs         $data $web
node build-catalog.cjs      ".."
node check-links.cjs        ".."
```

收尾必须：`缺失 0` + 链接 `缺失 0` + 首页出现新卡片（在对应学生分组下，序号是该学生自己的序号）+ 篇目顶部能返回 + 冒泡回归（`node ..\.agents\skills\reading-pack\scripts\test-bubble.cjs ..\wenwenNN`）通过。
然后 `git add -A && git commit && git push`，等 Cloudflare 自动部署。

数据里要写 `student` / `studentZh` / `gradeZh`（首页分组和页头 kicker 用）和 `no`（该学生自己的序号）；目录名前缀必须和数据里的 `student` 一致。

音频约定：**全文/逐句/短语用女声 Ava Multilingual，单词用纯美式 AndrewNeural**；短语整条连读，不逐词断开。某篇要换音色就按 skill 的参数传，并在数据里写 `voices: { sent, word, phrase }`（页脚会显示）。
2026-11 用户试听中的变体：**`wenwen04`、`wenwen05` 两篇所有音（全文/逐句/短语/单词）都用男声 `en-US-AndrewNeural`**，不再按句子/词组分音色。生成命令：

```powershell
$v = 'en-US-AndrewNeural'
node build-tts.cjs          $data "$web\assets\audio" $v "-6%" $v
node build-audio-assets.cjs $data $web $v "-6%" $v $v
```

等用户试听完再决定是否改成全站默认；在那之前，默认音色仍是 Ava（句子/短语）+ AndrewNeural（单词）。

## 5. 内容约定

- **原卷没有答案时**，答案由我依据原文推断，并在该篇导读里注明“原卷未给答案，本页答案为依据原文推断，仅供参考”。不要伪装成原卷答案。
- **原文保持原样**：不改人称、时态、词序。有人觉得 `the school cleaner … she` 奇怪，那是 “cleaner = 清洁剂” 的词义误判，不是人称错误（已与用户确认，不改）。
- **原文里的中文夹注要移出句子**：像 `interchange（互换） station` 这种印在英文里的括号注释会打断句子；把该词收进生词表、注释写进 `note`，句子保持纯英文。
- 每道题的答案必须能指回**原文原句**（`evidence`），解析里点明细节题 / 猜词题 / 主旨题。
- 生词按出现顺序排，**标准是初中一年级**（初一没学过的都收，一般 35–45 个）；每个都要有 **构词拆解 + 记忆点**；形容词写比较级/最高级、动词写时态变化（数据 `infl` 字段，页面显示成「变形」一行）；拆不开的词（ceremony、sweep）如实写“整体记忆”，不硬编词根。

## 6. 版式约定（读者是基础较弱的学生，主要用 iPad）

- 纯白底、苹方中文、Georgia 英文；正文 20px / 英文句 21px / 译文 19px；**英文原文加粗**。
- 生词**点击**弹出（不是悬停）；卡片给音标、词性、释义、构词、**变形**（形容词比较级/最高级、动词时态）、记忆点、例句；**点单词本身发音，底部不放“听发音”按钮**。
- **弹卡只服务生词**：句子正文里只标生词（黄底），点开就是生词卡；**短语不涂色、不发音、不弹卡**，短语的释义、例句、用法和朗读全在句子下面的浅绿注解里。之前句子里的绿底短语既弹卡又和注解重复，还把盖住的生词挡住了，已去掉。
- **句子和短语都只有 ▶ 能播**：逐句对照里点句子正文不发声（只关掉卡片），整句朗读只走句首的 ▶；短语注解里点文字也不播，只有小 ▶ 播这一条；**生词卡是打开就自动播**。两路音频都等 `canplaythrough`（下载得能连续播）再开声，避免网慢时第一次只响前半段。
- 重点短语的释义与例句挂在它所在句子下面（浅绿注解），注解里可选一行「用法：…」，写易错点（数据 `phrases[].note`）。
- **译文与注解两级开关**：右上「显示译文与注解」一键全开/全关（收起中文译文 + 短语注解，状态存 `localStorage`）；**首次打开默认全部收起**（英文视图）；每句右侧圆形「译」按钮只收/放这一行，**总开关全关时点它也能单独打开**，勾选状态跟着同步。
- 题目答案默认折叠，展开后才把正确项标绿。
- 字号再调只做“整体加一档”，别单独放大某一块。
- 打印用用户提供的源 PDF，网页不做“只打印某块”。

## 7. 技能位置与分工

- 技能本体：`Practices\.agents\skills\reading-pack\`（仓库内，随 git 备份）。
- DSH 在**项目根**下扫 `.dsh/skills/` 与 `.agents/skills/`：
  - 直接在 `Practices` 里开会话 → 项目根是 Practices → 直接命中 `.agents/skills/reading-pack`，**不需要任何链接**；
  - 在 `文文` 里开会话 → 项目根是 文文 → 走 `文文\.dsh\skills\reading-pack` 这个目录联接，指向仓库那份。
- 新机器 clone 后：`cd Practices` 直接开会话即可用。只有在 `文文` 里开会话时才需要补一次联接：
  `New-Item -ItemType Junction -Path .dsh\skills\reading-pack -Target Practices\.agents\skills\reading-pack`
- 改**通用流程**（取词、切句、音频参数、卡片结构、版式值）→ 改 `.agents\skills\reading-pack`，并同步 `tools/assets` 里的模板；改完核对两边哈希一致。
- 改**本站点约定**（目录、首页、部署、仓库卫生）→ 只改本文件。

## 8. 维护提醒

- 本文件是**硬链接**（仓库根 `Practices/AGENTS.md` ↔ 工作区根 `文文/AGENTS.md`），两边是同一个文件。**用文本编辑器/write 工具保存会断开硬链接**，保存后执行一次修复：

  ```powershell
  Remove-Item 'D:\_文文安琪\文文\AGENTS.md' -Force
  New-Item -ItemType HardLink -Path 'D:\_文文安琪\文文\AGENTS.md' -Target 'D:\_文文安琪\文文\Practices\AGENTS.md'
  ```

  校验：`(Get-Item 'D:\_文文安琪\文文\AGENTS.md').LinkType` 应输出 `HardLink`。
- 硬链接断开也不会丢内容，只是两份会漂移；发现两边不一样时，以仓库里这份为准，重新链接即可。
