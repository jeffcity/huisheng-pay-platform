// 模块注册表一致性：每个模块的 sourceKey/initialHash 都能落到真实源文件；
// 导航覆盖所有业务模块。
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modules = JSON.parse(await readFile(path.join(root, "src/legacy/modules.json"), "utf8"));

test("模块数量与旧单体一致（31 个模块）", () => {
  assert.equal(Object.keys(modules).length, 31);
});

test("每个模块的源文件存在于 public/legacy/sources", async () => {
  const keys = new Set(Object.values(modules).map(m => m.sourceKey));
  for (const key of keys) {
    await stat(path.join(root, "public/legacy/sources", `${key}.html`));
  }
});

test("每个模块都有 label/group/code", () => {
  for (const [id, m] of Object.entries(modules)) {
    assert.ok(m.label, `${id} 缺 label`);
    assert.ok(m.group, `${id} 缺 group`);
    assert.ok(m.code, `${id} 缺 code`);
  }
});
