// 冒泡回归测试：句子/短语只有点 ▶ 才播放；单行开关与总开关；点生词弹卡
// 用法: node test-bubble.cjs <篇目目录>
// 生成 _test_bubble.html，用无头浏览器打开读标题即可看到结果
const fs = require('fs');
const path = require('path');

const web = path.resolve(process.argv[2] || '.');
const src = path.join(web, 'index.html');
const out = path.join(web, '_test_bubble.html');

if (!fs.existsSync(src)) {
  console.error('找不到 ' + src);
  process.exit(1);
}

const probe = `
<script>
(function () {
  var log = [];
  function cur() {
    var a = document.getElementById('main');
    var s = a ? (a.getAttribute('src') || 'none') : 'no-audio-el';
    return s === 'none' ? 'none' : s.split('/').slice(-2).join('/');
  }
  function cardOn() {
    var c = document.getElementById('card');
    return c && c.classList.contains('show') ? 'card=on' : 'card=off';
  }
  function rowState() {
    var s = document.querySelector('.s');
    return s && s.classList.contains('row-hide') ? 'row=hide' : 'row=show';
  }
  function bodyState() {
    return document.body.classList.contains('hide-notes') ? 'body=hide' : 'body=show';
  }
  function fire(el) {
    if (!el) { log.push('MISSING'); return; }
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  }
  function switchTo(v) {
    var c = document.getElementById('showNotes');
    if (!c) return;
    c.checked = v;
    c.dispatchEvent(new Event('change', { bubbles: true }));
  }
  var steps = [
    ['点句子正文', function () { return document.querySelector('.s .en'); }],
    ['点句子的▶', function () { return document.querySelector('.s .play'); }],
    ['点短语注解文字', function () { return document.querySelector('.pnote'); }],
    ['点短语▶', function () { return document.querySelector('.pnote .pmini'); }],
    ['点句子里的生词', function () { return document.querySelector('.s .w'); }],
    ['点单行开关', function () { return document.querySelector('.s .snote'); }],
    ['关总开关', null],
    ['开总开关', null]
  ];
  var i = 0;
  function next() {
    if (i >= steps.length) {
      document.title = 'RESULT ' + JSON.stringify(log);
      return;
    }
    var s = steps[i++];
    if (s[1]) fire(s[1]());
    else switchTo(s[0] === '关总开关' ? false : true);
    setTimeout(function () {
      log.push(s[0] + ' => ' + cur() + ' · ' + cardOn() + ' · ' + rowState() + ' · ' + bodyState());
      next();
    }, 140);
  }
  setTimeout(next, 300);
})();
</script>
`;

fs.writeFileSync(out, fs.readFileSync(src, 'utf8').replace('</body>', probe + '</body>'), 'utf8');
console.log(out);
console.log('期望：点句子正文 none；▶ s/xx；注解文字不变；短语▶ p/xx；生词 card=on；单行开关 row=hide；关总开关 body=hide；开总开关 row/body 都恢复 show');
