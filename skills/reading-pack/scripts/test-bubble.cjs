// 冒泡回归测试：点注解文字 / 点短语▶ / 点句子，各自应触发对应音频
// 用法: node test-bubble.cjs <网页版目录>
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
    return a ? (a.getAttribute('src') || 'none') : 'no-audio-el';
  }
  function fire(el) {
    if (!el) { log.push('MISSING'); return; }
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  }
  var steps = [
    ['点注解文字', function () { return document.querySelector('.pnote'); }],
    ['点短语▶', function () { return document.querySelector('.pnote .pmini'); }],
    ['点句子英文', function () { return document.querySelector('.s .en'); }]
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
      log.push(s[0] + ' => ' + cur().split('/').slice(-2).join('/'));
      next();
    }, 120);
  }
  setTimeout(next, 300);
})();
</script>
`;

fs.writeFileSync(out, fs.readFileSync(src, 'utf8').replace('</body>', probe + '</body>'), 'utf8');
console.log(out);
console.log('期望：注解 -> p/xx.mp3，短语▶ -> p/xx.mp3，句子 -> s/xx.mp3');
