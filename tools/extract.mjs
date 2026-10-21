import fs from 'node:fs';
const src = process.argv[2], out = process.argv[3];
const html = fs.readFileSync(src, 'utf8');
const m = html.match(/<script id="mockup-data" type="application\/json">([\s\S]*?)<\/script>/);
const screens = JSON.parse(m[1]);
fs.mkdirSync(out, { recursive: true });
for (const s of screens) {
  fs.writeFileSync(`${out}/${s.id}.css`, s.css.trim() + '\n');
  fs.writeFileSync(`${out}/${s.id}.html`, s.html + '\n');
  console.log(s.id, s.w + 'x' + s.h);
}
