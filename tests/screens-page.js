// Builds screens/index.html: every screenshot from tests/screens.spec.js side by side, one row per
// screen, one column per browser and colour scheme. Run by npm run test:screens.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'screens');
const cols = [], rows = new Set();
for (const project of fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory()).sort())
  for (const scheme of ['light', 'dark']) cols.push({ project, scheme });
for (const { project } of cols) for (const f of fs.readdirSync(path.join(dir, project))) rows.add(f.replace(/^(light|dark)-/, '').replace(/\.png$/, ''));
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cell = (c, r) => {
  const f = path.join(c.project, c.scheme + '-' + r + '.png');
  return fs.existsSync(path.join(dir, f)) ? `<td><a href="${esc(f)}"><img src="${esc(f)}" loading="lazy" alt=""></a></td>` : '<td>–</td>';
};
const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Hexadek screens</title>
<style>body{font:14px system-ui,sans-serif;margin:16px;background:#888}table{border-collapse:collapse}
th,td{padding:6px;vertical-align:top;text-align:center}th{color:#fff;position:sticky;top:0;background:#666}
img{width:200px;border:1px solid #444;display:block}td.name{color:#fff;font-weight:600;text-align:left;white-space:nowrap}</style></head><body>
<table><tr><th></th>${cols.map(c => `<th>${esc(c.project)}<br>${c.scheme}</th>`).join('')}</tr>
${[...rows].sort().map(r => `<tr><td class="name">${esc(r.replace(/^\d-/, ''))}</td>${cols.map(c => cell(c, r)).join('')}</tr>`).join('\n')}
</table></body></html>`;
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log('Wrote ' + path.join(dir, 'index.html'));
