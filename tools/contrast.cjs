const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const x = lum(a), y = lum(b);
  const hi = Math.max(x, y), lo = Math.min(x, y);
  return ((hi + 0.05) / (lo + 0.05)).toFixed(2);
};
const pairs = [
  ['#10151b', '#ffffff', '英文正文'],
  ['#3d4a57', '#ffffff', '中文译文'],
  ['#4f5b68', '#ffffff', '次要文字'],
  ['#123c60', '#ffffff', '标题/链接'],
  ['#1a2029', '#d7efe2', '短语绿底'],
  ['#1a2029', '#fdf0c2', '生词黄底'],
  ['#12442f', '#d8efe3', '答案绿'],
  ['#ffffff', '#123c60', '按钮白字'],
  ['#4f5b68', '#eef2f8', '表头旁注']
];
for (const [fg, bg, name] of pairs) {
  console.log(name.padEnd(8, ' '), fg, 'on', bg, '=>', ratio(fg, bg) + ':1');
}
