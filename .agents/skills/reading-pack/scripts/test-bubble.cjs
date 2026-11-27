// 冒泡回归测试：句子只有点 ▶ 才播放；注解/短语▶ 播短语；点生词弹卡
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
  function fire(el) {
    if (!el) { log.push('MISSING'); return; }
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  }
  var steps = [
    ['点句子正文', function () { return document.querySelector('.s .en'); }],
    ['点句子的▶', function () { return document.querySelector('.s .play'); }],
    ['点注解文字', function () { return document.querySelector('.pnote'); }],
    ['点短语▶', function () { return document.querySelector('.pnote .pmini'); }],
    ['点句子里的生词', function () { return document.querySelector('.s .w'); }]
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
console.log('期望：点句子正文 -> none；点句子的▶ -> s/xx；注解/短语▶ -> p/xx；点生词 -> card=on');
