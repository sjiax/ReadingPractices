# 踩过的坑与对策

## 1. 编码：别用 PowerShell 改中文文件

`Get-Content -Raw` + `Set-Content` 往返一次，UTF-8 中文会变成 `鍏ㄦ枃鏈楄` 这种乱码，脚本里的中文注释和正则全会坏。

- 改文本文件只用 `edit` / `write` 工具；读内容用 `read`。
- 控制台里 `Get-Content` 显示乱码不代表文件坏了（那是终端按 ANSI 解码），用 `read` 复核。
- 已经写坏：从原始内容重写，不要试图修补。

## 2. 语音合成：连接会中途断

`msedge-tts` 复用一条连接连续合成，会在第 4、5 个请求处报：

```
Stream closed before the synthesis completed (no turn.end received).
```

对策（`build-audio-assets.cjs` 已实现）：

- 每个音频**新建一个 `MsEdgeTTS` 实例**，合成完立刻 `close()`；
- 每个文件最多重试 4 次，间隔递增；
- 已存在且 > 2 KB 的文件直接跳过，所以失败后**重跑同一命令即可续传**；
- 生成后按帧数粗算时长做体检：24 kHz / 48 kbps 单声道，每帧 288 字节、24 ms。

## 3. 音频文件名：两处 slug 必须一致

`build-audio-assets.cjs` 写文件、`build-html.cjs` 拼路径，用同一条规则：

```
小写 → 非 a-z0-9 替换成 '-' → 去掉首尾 '-'
```

前缀是两位序号（`01-`、`02-`）。改规则必须两处同时改，否则页面里 404 但页面看起来不坏。

`full.mp3` / `words.mp3` 由 `build-tts.cjs` 直接写进 `assets/audio/`，固定文件名，不要改名。

## 4. 无头 Chrome 截图的假象（不是页面的 bug）

- **滚动后截图是空白**：`window.scrollTo` / `scrollIntoView` 之后 `--screenshot` 常常截出全白。要看页面下半部分，改用"整页高窗口"截图，再用 `System.Drawing` 按 `section` 的 `offsetTop` 裁剪。
- **JS 设置的样式可能没被截到**：通过 `?demo=` 加的 class、定位、`opacity`，`--screenshot` 有时拍到加之前的状态。确认状态用 `--dump-dom`：

  ```powershell
  & chrome --headless=new --disable-gpu --no-sandbox --virtual-time-budget=3000 `
      --window-size=1280,1000 --dump-dom "file:///.../index.html?demo=c3" | Out-File dom.html
  ```

  然后检查 `#card` 是否带 `class="show"`。
- 想要一张确定带弹窗的截图：把卡片 HTML **直接写进一份临时副本**再截，截完删掉副本。

页面自带两个诊断钩子，用完不必清理：

- `?debug=overflow` → 把 `scrollWidth / innerWidth / body 高度 / 各 section 的 offsetTop` 写进 `document.title`；
- `?demo=wN`（固定位置显示第 N 个生词的卡）、`?demo=cN`（模拟点击）、`?demo=open`（展开第一题答案）。

## 5. 交互：不要用悬停

实测孩子把鼠标划过文本就弹卡 + 自动发音，太吵。规则固定为：

- 只有**点击生词**才弹卡；句子里的短语不涂色、不发音、不弹卡（释义只在句下注解里，听也听注解的 ▶）；再点、点空白、`Esc` 关闭；
- 顶部开关文案"点词自动发音"；
- 卡片跟随滚动重定位（`scroll` → `placeCard`），不要设成滚动就关闭。

## 6. 短语注解区不能触发整句朗读（真实踩过的冒泡坑）

注解块 `.pnotes` 在句子元素 `.s` 内部，而 `.s` 本身带 `data-play`。所以**不能**这么写：

```js
// 错误：closest 会一路向上找到外层的 .s，结果播的是整句
var mini = e.target.closest('[data-play]');
```

正确做法是把查找限制在注解块内部，拿 `.pnote` 再取它自己的小按钮：

```js
var note = e.target.closest('.pnotes');
if (note) {
  var one = e.target.closest('.pnote');
  var mini = one ? one.querySelector('.pmini') : null;
  if (mini) play(mini.getAttribute('data-play'), null);
  return;                                  // 关键：别再往下走到 .s 分支
}
```

更普遍的原则：`closest(selector)` 是向外扩，凡是"父元素也匹配同一选择器"的场景（`.s[data-play]` 包着 `.pnotes` 里的 `[data-play]`），一律改用"先定容器、再在容器里选元素"。

回归测试：`node scripts/test-bubble.cjs <网页版目录>`，会生成一个临时页面，连点三处并把结果写进 `document.title`，用 `--dump-dom` 读出来即可：

```
点注解文字 => p/01-every-year.mp3
点短语▶   => p/01-every-year.mp3
点句子英文 => s/01.mp3
```

测完删掉 `_test_bubble.html`。

## 7. 答案别提前泄题

题目默认折叠（`<details>`），**展开后**才给正确项上绿色：

```css
.q.revealed .opts li.ok { background: var(--green-soft); color: #12442f; }
```

`app.js` 监听 `details` 的 `toggle` 给 `.q` 加 `revealed`。只写 `.opts li.ok` 会让答案一进页面就露出来。

## 8. 不是 Python 环境

本机 `python` 是 Microsoft Store 占位符，`python-docx` 用不了；本流水线也**不需要** Word/PDF 生成。

- 转换 / 渲染 / 预览 PDF 用 `office_convert`、`office_render` 工具；
- 打印一律用用户提供的源 PDF，页面不做"只打印某块"的功能。

## 9. 模板目录的层级：`_工具/` 与技能包不一样

工作流里 `build-html.cjs` 和 `assets/` 是**同级**（都在 `_工具\` 下），但技能包里脚本在 `scripts\`、模板在 `assets\`，两者**差一层**。原来写死 `path.join(__dirname, 'assets')`，在技能包里就找不到模板——而真实目录里因为 `style.css` 已经存在，这个失败被"资源检查通过"掩盖了。

正确写法是两处都试一遍：

```js
const TPL = [path.join(__dirname, 'assets'), path.join(__dirname, '..', 'assets')]
  .find((p) => fs.existsSync(path.join(p, 'style.css')));
if (!TPL) console.warn('警告：找不到 assets/style.css 模板');
```

**自检办法**：不要只在已有产物的目录里跑。新建一个空目录，只放 `data.cjs` 和 `assets/audio/`，用技能里的脚本跑一遍，确认输出 `缺失 0`、**站点根** `assets/style.css` 与 `assets/app.js` 被真的写出来（模板现在复制到站点根，不再复制进篇目录）。

## 10. 文件被占用（少见）

若浏览器正把 `index.html` 或某个 mp3 锁住，覆盖会 `EBUSY`：写临时文件再 `Move-Item -Force` 重试 8–10 次；仍失败就告诉用户关掉对应程序，不要杀进程。

## 10. 对比度不能凭感觉

改配色前先算相对亮度比：正文 ≥12:1，其他文字 ≥6:1（WCAG AA 是 4.5:1）。色值对照见 SKILL.md 的"视觉与交互"一节。

## 11. 第一次播放只响前半段（句子和生词卡都会）

现象：网慢时点 ▶（或全文朗读）、或点生词弹出卡片自动发音，能听见开头，但一两秒后就断了；再点一次又正常。

原因：`<audio preload="none">`（主播放器）和新建的 `Audio`（生词卡）都在缓冲没准备好时就 `play()`，浏览器边下边播，遇到网络抖动就停。

做法：两路音频统一走 `playWhenReady()`——先 `el.src = src; el.load();`，等 `canplaythrough` 再 `play()`；主播放器 4 秒、生词卡 3 秒兜底先播，避免点了/弹了没反应；`playSeq` / `wordSeq` 两个递增序号取消上一次等待。见 `assets/app.js` 的 `play()`、`playWord()`。

区分：**句子/短语是点击播**，**生词卡是打开就自动播**（受「点词自动发音」开关控制）——两者都要等下载，但触发方式不同，别把它们改成同一种。

## 12. 句子只有 ▶ 能播

逐句对照里整句不再可点：`.s` 上没有 `data-play`，只有 `<button class="play" data-play="...">` 有；`app.js` 只对 `[data-play]` 元素播放，点击句子正文不触发任何音频（只关掉生词卡）。改版时别把 `data-play` 又挂回 `.s` 上——那会让“点句子任意处朗读”复活。
