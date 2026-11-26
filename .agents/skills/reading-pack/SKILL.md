---
name: reading-pack
description: 把英文阅读材料（.doc/.docx/.pdf 练习卷、短文）做成学生能直接用的交互网页学习包：逐句中英对照、可点句子播放、点生词弹卡片（音标/词性/释义/例句/试听）、重点短语、题目翻译＋答案依据，全部用本地 mp3 朗读（默认男声 en-US-AndrewMultilingualNeural）。交付物只有 HTML 版。
whenToUse: 用户给出英语阅读短文/练习卷，要求翻译成中文、摘生词注音标、列重点短语、生成朗读音频，或要一个可交互的网页版学习材料时。
---

# 英语阅读学习包（reading-pack · 仅 HTML 版）

一次输入一篇阅读材料，输出**一个文件夹**：`index.html` + `assets/`（样式、脚本、64 个左右的本地 mp3）。双击即用、断网可用、可直接拷到手机或 U 盘。

不做 md / docx / pdf：打印一律用用户自己提供的源 PDF。

## 交付物

每篇产出一个自包含的静态目录，双击即用、断网可用：

```
<站点根>/practiceNN/
  index.html                  # 单页应用，交互全在这里
  assets/style.css            # 版式（模板复制，勿逐篇改）
  assets/app.js               # 交互（模板复制，勿逐篇改）
  assets/practice.json        # 结构化元数据（标题/原文/题目/统计），目录首页据此生成
  assets/audio/full.mp3       # 整篇朗读
  assets/audio/words.mp3      # 生词连读（每个词读两遍）
  assets/audio/s/01..NN.mp3   # 逐句音频
  assets/audio/w/01-xxx.mp3   # 逐词音频
  assets/audio/p/01-xxx.mp3   # 逐短语音频
```

`practiceNN` 用两位 ASCII 序号；路径里不要有空格和中文，否则 URL 会变成一长串百分号编码。

页面结构（固定顺序）：吸顶播放条 → 一 原文（整段、纯文本、不加标注）→ 二 阅读理解题 → 三 逐句对照（短语注解挂句下）→ 四 重点生词 → 五 建议学习顺序。

**重点短语不单独成表**：每条短语用 `at` 绑到"出现在第几句"，页面把它放在那句译文下面的浅绿注解里（短语 + 释义 + 例句 + 译文 + 小 ▶）。句子只要用到短语就一定有注解，不受词形变化影响（`sweeping the floor` 也能挂 `sweep the floor`）。

**站点层面的约定不进技能**：目录放在哪、目录首页要展示什么、发布到哪个平台、仓库里哪些不提交——这些是项目私有的，写在**工作区的 `AGENTS.md`** 里（本项目：`Practices/` 站点根 + Cloudflare Pages）。做成品前后都先读一遍它。

## 目录约定

```
<工具目录>/           # 脚本 + assets + data + node_modules（位置由 AGENTS.md 规定）
<站点根>/practiceNN/  # 每篇一个输出目录
```

本项目中：工具目录是 `<站点根>/tools/`，技能本体是 `<站点根>/.agents/skills/reading-pack/`（DSH 在项目根下会扫 `.dsh/skills/` 与 `.agents/skills/`）。

## 步骤 0 · 准备工具（每台机器一次）

```powershell
$tool = "<工具目录>"     # 本项目：<站点根>\tools
New-Item -ItemType Directory -Force -Path "$tool\assets","$tool\data" | Out-Null
Copy-Item "<技能目录>\scripts\*.cjs" $tool -Force
Copy-Item "<技能目录>\assets\*" "$tool\assets" -Force
Set-Location $tool; npm install msedge-tts --no-audit --no-fund
```

`<技能目录>` 就是本 SKILL.md 所在目录。只需要 `msedge-tts` 一个包（调 Edge 朗读接口，需联网）。**不需要** `docx`，**不要**用 python-docx（本机 `python` 是 Store 占位符）。

## 步骤 1 · 取原文

- `.doc` / `.docx`：`office_convert`（format: `txt`）取正文，需要核对版式时 `office_render` 看页面图。
- `.pdf`：`office_render` 看页面，**逐字核对**（纯文本抽取会漏标点、错大小写）。
- 顺手修原文笔误（`japan` → `Japan`），并在解析里说明。

## 步骤 2 · 写数据文件 `<工具目录>/data/passageN.cjs`

唯一真相来源，页面和音频都从它生成。字段与规则见 `references/data-schema.md`。

动手前先定死：

- **逐句切开**：每段按句号/问号切，`lines[].en` 必须能拼回 `paragraphs[]`（`build-html.cjs` 会校验，不一致直接退出）。
- **生词 20–30 个**：以初中 1600 词表以外的为主；学生基础弱时，`important`、`during`、`includes` 这类基础词也收进来，`note` 里写清搭配与派生。`core: true` 打 ★ 的必须会拼写。
- **音标美式 IPA**，词性用 `v. / n. / adj. / adv.` 短写。
- **短语 15–17 条**：必须给每条填 `at`（出现在第几句，`lines` 的 0 基下标）；带 `sb/sth/…` 的抽象短语也要填，它们同样会挂到句子上。`phraseSurfaces` 只决定原文里是否涂绿底色，不影响注解出现。释义含糊或容易用错的短语（如 `tell sth apart`）补一个可选 `note`，写用法/易错点，页面在注解里多一行「用法：…」。
- **题目**：题干与四选项都给中文；`answer` 给字母；`evidence` 必须是原文原句；`evidenceZh` 点明题型（细节题/猜词题/主旨题）。
- `titleZh` 8–12 字；`leadZh` 一句话说清"谁、做了什么、为什么"。

## 步骤 3 · 出成品

```powershell
Set-Location "<工具目录>"
$data = ".\data\passageN.cjs"
$web  = "<站点根>\practiceNN"     # 站点根下的一层目录
node build-tts.cjs          $data "$web\assets\audio" en-US-AndrewMultilingualNeural "-6%"
node build-audio-assets.cjs $data $web                en-US-AndrewMultilingualNeural "-6%"
node build-html.cjs         $data $web
node build-catalog.cjs      "<站点根>"      # 重新生成目录首页
node check-links.cjs        "<站点根>"      # 链接完整性
```

1. `build-tts` 出 `full.mp3` / `words.mp3`；
2. `build-audio-assets` 出 `s/`、`w/`、`p/` 三组小音频（已存在则跳过，失败自动重试，可反复重跑续传）；
3. `build-html` 生成 `index.html`，并把 `assets/style.css`、`assets/app.js` 从模板（`<工具目录>/assets/`）复制过去，最后校验所有资源引用；
4. `build-catalog` 扫描 `<站点根>/*/index.html`，抽取标题、中文名与统计，重写 `<站点根>/index.html`——**加新篇后一定要重跑**；
5. `check-links` 逐个 html 校验相对链接，输出 `缺失 0` 才算完。

**语音参数**（已定稿，经 A/B 试听后确定）：

| 用途 | 音色 | 语速 | 说明 |
|---|---|---|---|
| 全文、逐句 | `en-US-AndrewMultilingualNeural` | `-6%` | 整句语气自然，句子层面没发现问题 |
| 单个单词、生词连读 | `en-US-AndrewNeural`（纯美式） | `-8%` | **Multilingual 读孤立单词会走音**（实例：navigation 读错），纯美式正常 |
| 短语 | `en-US-AndrewMultilingualNeural` | `-8%` | 文本**逐词用逗号断开**（`step, by, step`），避免连读听不清 |

- 短语断词在 `build-audio-assets.cjs` 的 `phraseSpeech()` 里做：先把 `sb/sth/adj./…/+` 转成 somebody/something/adjective/空格/plus，再按空格切分、用 `, ` 连接。
- 试听对比过的结论：`-18%` 与 `0%` 对错读没有影响（是模型问题不是语速问题）；逐词拼接（每词单独合成再拼）虽清楚但太机械，不要用。
- **整篇换音色**（学生偏好别的音色时，如练习2 选 `en-GB-RyanNeural`）：把同一个音色名再传给单词、短语两个参数，别让一篇里美音英音打架；语速仍按上表（句子 `-6%`，单词/短语 `-8%`），只换人声：

  ```powershell
  node build-tts.cjs          $data $audio $voice "-6%" $voice
  node build-audio-assets.cjs $data $web   $voice "-6%" $voice $voice
  ```

  换完重跑 `build-html`：播放条上的时长是按 mp3 文件大小算的，会跟着变。

## 步骤 4 · 自检

1. `node --check <web>/assets/app.js` 通过。
2. `build-html` 输出 `缺失 0`，且逐句拼接校验没报错。
3. 音频数量对得上：`s` = 句数，`w` = 生词数，`p` = 短语数，外加 `full.mp3`、`words.mp3`；每个 mp3 > 3 KB 且首字节 `0xFF`。
4. 跑一次冒泡回归：`node <技能目录>\scripts\test-bubble.cjs <篇目录>`，生成的临时页用无头浏览器打开并把标题读出来，期望
   `点注解文字 => p/xx.mp3`、`点短语▶ => p/xx.mp3`、`点句子英文 => s/xx.mp3`；测完删掉 `_test_bubble.html`。
5. `build-catalog` 输出篇数要与目录实际篇数一致；点开首页卡片能进到对应篇目，篇目顶部 `← 所有篇目` 能回到首页（本地按 `file://` 与大屏都要试）。
6. 无头 Chrome 截图看首屏、生词表与题目（注意事项见 `references/troubleshooting.md`）：
   ```powershell
   & "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --disable-gpu --hide-scrollbars `
     --no-sandbox --virtual-time-budget=2500 --window-size=1280,1100 --screenshot="shot.png" "file:///<路径>/index.html"
   ```
7. 抽听 2–3 个 mp3（画面判断不了）或至少核对时长是否与词数/句数成比例。

## 视觉与交互（已定稿，改前先确认）

- **纯白底**，不要米色/渐变；正文近黑，译文深灰；对比度做到 WCAG AA 以上。
- 现用配色：底 `#ffffff`、正文 `#10151b`（18:1）、译文 `#3d4a57`（9:1）、次要 `#4f5b68`（6.9:1）、主色 `#123c60`（11:1）、生词底 `#fdf0c2`、短语底 `#d7efe2`、答案绿 `#d8efe3`。改色先算对比度：正文 ≥12:1，其余 ≥6:1。
- **中文一律苹方**（`PingFang SC` → `Hiragino Sans GB` → `Microsoft YaHei`），**不要用楷体**：楷体在 Retina 屏上偏细、阅读吃力。英文正文用 Georgia。
- 字号：正文 20px、英文句子 21px、中文译文 19px、短语注解 17px、表格 17px、行高 1.7。整体再调只做"统一加一档"，别单独放大某一块。
- **逐句对照里的英文原文加粗**（Georgia bold），与译文、短语注解形成三层视觉层次。
- 响应式三档：`≤1024px`（iPad）字号微降一档、去掉版心限制；`≤900px` 生词表从六列表格改成**卡片式**（单词+★+▶ / 音标右对齐 / 释义 + 词性小标签 / 分隔线 / 例句+译文）；`≤620px`（手机）再降一档、播放按钮缩到 30px。
- 触屏细节：`touch-action: manipulation`、`-webkit-tap-highlight-color: transparent`、按钮 ≥ 34px，表格容器 `-webkit-overflow-scrolling: touch`。
- **生词卡片（点击弹出，不是悬停）**要给全：音标、词性、释义、**构词拆解**（前缀/词根/后缀逐段解释）、记忆提示、例句＋译文。**发音就是点卡片里的单词本身**（词上有虚线，键盘 Enter/空格也行），底部不放"听发音"按钮；底部一行提示固定为"点单词听发音 · 点空白处关闭"。生词表的释义格下方也带一行紧凑构词，方便不开弹窗也能看。再点一次、点空白或 `Esc` 关闭，卡片跟随滚动重定位。
- 短语注解默认展开，右上"显示短语注解"可一键关掉（状态存 `localStorage` 的 `rp.showNotes`），关掉后只剩原文+译文，适合纯跟读。
- 题目答案默认折叠，展开后才把正确项标绿。
- 播放条：全文/生词两个按钮 + 0.8×·0.9×·1× 变速 + "点词自动发音"开关。

## 坑（先看一眼，能省十分钟）

完整清单见 `references/troubleshooting.md`，最常踩的三个：

- PowerShell 的 `Get-Content` / `Set-Content` 会把中文 UTF-8 弄成乱码——改文件只用 `edit` / `write` 工具。
- `msedge-tts` 复用一条连接连续合成，会在第 4、5 个请求处断流：每个音频新建实例、失败重试、已存在跳过。
- 无头 Chrome 截图：滚动后可能全白、JS 设的样式可能截不到——用 `--dump-dom` 验证 DOM 状态，别拿截图当唯一证据。
