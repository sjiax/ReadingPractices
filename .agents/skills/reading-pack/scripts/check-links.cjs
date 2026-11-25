// 链接完整性检查：扫描目录下所有 html，逐个校验相对 href/src 是否存在
// 用法: node check-links.cjs <rootDir>
const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || '.');
let files = 0, refs = 0, bad = 0;

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) check(p);
  }
}

function check(file) {
  files += 1;
  const html = fs.readFileSync(file, 'utf8');
  const re = /(?:href|src)\s*=\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|data:|#|javascript:)/i.test(url)) continue;
    refs += 1;
    const clean = url.split('#')[0].split('?')[0];
    if (!clean) continue;
    const target = path.resolve(path.dirname(file), decodeURIComponent(clean));
    if (!fs.existsSync(target)) {
      bad += 1;
      console.log(`缺失 ${path.relative(root, file)} -> ${url}`);
    }
  }
}

walk(root);
console.log(`html ${files} 个，相对引用 ${refs} 个，缺失 ${bad} 个`);
process.exit(bad ? 1 : 0);
