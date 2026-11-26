// 冒泡回归测试：点注解 / 点短语▶ / 点句子 / 点绿底里的生词 / 点绿底其余处
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
    return a ? (a.getAttribute('src') || 'none').split('/').slice(-2).join('/') : 'no-audio-el';
  }
  function cardOn() {
    var c = document.getElementById('card');
    return c && c.classList.contains('show') ? 'card=on' : 'card=off';
  }
  function fire(el) {
    if (!el) { log.push('MISSING'); return; }
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  }
  var steps = [
    ['点句子英文', function () { return document.querySelector('.s .en'); }],
    ['点注解文字', function () { return document.querySelector('.pnote'); }],
    ['点短语▶', function () { return document.querySelector('.pnote .pmini'); }],
    ['点绿底里的生词', function () { return document.querySelector('.ph .w'); }],
    ['点绿底其余处', function () { return document.querySelector('.ph'); }]
  ];
  var i = 0;
  function next() {
    if (i >= steps.length) {
      document.title = 'RESULT ' + JSON.stringify(log);
      return;
    }
    var s = steps[i++];
    fire(s[1]());
    setTimeout(function () {
      log.push(s[0] + ' => ' + cur() + ' · ' + cardOn());
      next();
    }, 140);
  }
  setTimeout(next, 300);
})();
</script>
`;

fs.writeFileSync(out, fs.readFileSync(src, 'utf8').replace('</body>', probe + '</body>'), 'utf8');
console.log(out);
console.log('期望：句子 -> s/xx；注解文字、短语▶、绿底其余处 -> p/xx；绿底里的生词 -> card=on、主播放器不动');
