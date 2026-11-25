// 冒泡回归测试：点注解文字 / 点短语▶ / 点句子，检查各自触发的音频
// 用法: node test-bubble.cjs
const fs = require('fs');
const path = require('path');

const web = 'D:\\_文文安琪\\文文\\阅读练习1\\网页版';
const src = path.join(web, 'index.html');
const out = path.join(web, '_test_bubble.html');

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
    var el = s[1]();
    fire(el);
    setTimeout(function () {
      log.push(s[0] + ' => ' + cur().split('/').slice(-2).join('/'));
      next();
    }, 120);
  }
  setTimeout(next, 300);
})();
</script>
`;

const html = fs.readFileSync(src, 'utf8').replace('</body>', probe + '</body>');
fs.writeFileSync(out, html, 'utf8');
console.log(out);
