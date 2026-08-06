// 从旧单体 src/demo.html 解码出 15 个真实页面文件，作为可检索的迁移源。
// 一次性溯源脚本：运行后 src/legacy/sources/*.html 即为新的事实来源。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(path.join(root, 'src/demo.html'), 'utf8');
const blob = html.match(/const sources = (\{.*?\});/s)[1];
const pairs = [...blob.matchAll(/"([^"]+)":"([A-Za-z0-9+/=]+)"/g)];

const out = path.join(root, 'src/legacy/sources');
mkdirSync(out, { recursive: true });
const manifest = [];
for (const [, key, b64] of pairs) {
  const page = Buffer.from(b64, 'base64').toString('utf8');
  writeFileSync(path.join(out, `${key}.html`), page);
  manifest.push({ key, file: `${key}.html`, bytes: Buffer.byteLength(page) });
}
writeFileSync(path.join(root, 'src/legacy/sources.json'), JSON.stringify(manifest, null, 1));
console.log(`extracted ${manifest.length} sources -> ${out}`);
for (const m of manifest) console.log(`  ${m.key.padEnd(14)} ${m.bytes.toLocaleString('en-US')} bytes`);
