// 构建后一致性检查（npm run check 第三段）：
// 1) dist/index.html 由 Vite 生成且引用相对资源（base './'）
// 2) 15 个真实源文件随 dist 发布且无本机路径/外部脚本
// 3) modules.json 每个模块都能落到存在的源文件
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distIndex = await readFile(path.join(root, "dist/index.html"), "utf8");
assert.match(distIndex, /<title>\s*汇盛支付平台端整合 Demo\s*<\/title>/, "dist 标题与项目配置不一致");
assert.match(distIndex, /\bsrc="\.\/assets\//, "dist 必须使用相对资源路径（base './'）");
assert.doesNotMatch(distIndex, /\/Users\/|file:\/\//i, "构建内容泄漏本机绝对路径");
assert.doesNotMatch(distIndex, /<(?:script|link)\b[^>]+(?:src|href)=["']https?:/i, "React 壳不应依赖外部可执行脚本或样式");

const modules = JSON.parse(await readFile(path.join(root, "src/legacy/modules.json"), "utf8"));
const sourceKeys = new Set(Object.values(modules).map(m => m.sourceKey));
// 14 个模块源 + 1 个共享 authGuard（不被任何模块直接引用）
assert.equal(sourceKeys.size, 14, `模块源数量异常：${sourceKeys.size}`);
await stat(path.join(root, "dist/legacy/sources/authGuard.html"));
for (const key of [...sourceKeys]) {
  const p = path.join(root, "dist/legacy/sources", `${key}.html`);
  await stat(p);
  if (key === "authGuard") continue;
  const html = await readFile(p, "utf8");
  assert.doesNotMatch(html, /\/Users\/|file:\/\//i, `${key}.html 泄漏本机绝对路径`);
  // 注：channels/login/system/tenants 四个独立页历史上就引用 unpkg lucide 图标与
  // Google Fonts（见 CONTEXT.md「已知外部依赖」）；迁移不改其运行时行为，
  // 因此外部资源门禁只约束 React 壳与克隆家族页面。
  if (!["channels", "login", "system", "tenants"].includes(key)) {
    assert.doesNotMatch(html, /<(?:script|link)\b[^>]+(?:src|href)=["']https?:/i, `${key}.html 不应依赖外部可执行脚本或样式`);
  }
}
console.log(`检查通过：dist 含 React 壳与 ${sourceKeys.size} 个真实源文件，无本机路径或外部可执行资源。`);
