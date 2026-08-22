// 模块注册表一致性：每个模块的 sourceKey/initialHash 都能落到真实源文件；
// 导航覆盖所有业务模块。
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modules = JSON.parse(await readFile(path.join(root, "src/legacy/modules.json"), "utf8"));

test("模块注册表包含 31 个统一入口", () => {
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

test("系统管理新增 IP 规则立即启用，2FA 绑定仅由登录流程触发", async () => {
  const system = await readFile(path.join(root, "public/legacy/sources/system.html"), "utf8");
  const login = await readFile(path.join(root, "public/legacy/sources/login.html"), "utf8");
  const moduleSource = await readFile(path.join(root, "src/modules.js"), "utf8");
  const appSource = await readFile(path.join(root, "src/App.jsx"), "utf8");
  assert.match(system, /新增 IP 规则/);
  assert.match(system, /新增并启用/);
  assert.match(system, /保存成功后立即启用/);
  assert.match(system, /enabled: true, updated:/);
  assert.doesNotMatch(system, /新增规则默认停用|保存后默认停用|新增登录 IP 规则（默认停用）/);
  assert.match(system, /security-entry-toggle/);
  assert.match(system, /登录时强制绑定/);
  assert.doesNotMatch(system, /open-2fa-bind|绑定入口/);
  assert.match(moduleSource, /title: '系统管理', items: \[\s*\{ module: 'system-accounts', label: '系统管理控制台' \},?\s*\]/);
  assert.equal([...moduleSource.matchAll(/module: 'system-(?:accounts|roles|security|menus|fees)'/g)].length, 1);
  assert.equal(modules["system-fees"], undefined);
  assert.doesNotMatch(system, /\{ id: "fees", label: "套餐费率"/);
  assert.doesNotMatch(login, /feesonly|仅套餐费率|id: "fees", label: "套餐费率"/);
  assert.match(appSource, /selectedKeys=\{\[activeTarget\.navId \|\| activeModule\]\}/);
  assert.match(moduleSource, /title: '账号登录（流程示意）'/);
  assert.match(moduleSource, /module: 'login-bind', label: '绑定 Google 2FA'/);
  assert.match(login, /扫描二维码或复制密钥，然后输入 6 位验证码/);
  assert.match(login, /JBSWY3DPEHPK3PXP/);
  assert.match(login, /id="copyBindSecret"/);
  assert.match(login, /验证并绑定/);
  assert.match(login, /body\[data-login-view="bind"\] \.access-rail/);
  assert.match(login, /document\.body\.dataset\.loginView = view/);
  assert.doesNotMatch(login, /<li><span>账号状态<\/span>|<li><span>绑定结果<\/span>|<li><span>恢复码<\/span>/);
});

test("租户创建要求初始登录 IP，并分离登录与 API 两套名单", async () => {
  const tenants = await readFile(path.join(root, "public/legacy/sources/tenants.html"), "utf8");
  assert.match(tenants, /初始管理员登录 IP/);
  assert.match(tenants, /初始管理员登录 IP 必填/);
  assert.match(tenants, /租户后台登录 IP 白名单/);
  assert.match(tenants, /业务 API 来源 IP 白名单/);
  assert.match(tenants, /两套名单相互独立/);
});

test("财务模块保留七类独立待办入口", async () => {
  const funds = await readFile(path.join(root, "public/legacy/sources/funds.html"), "utf8");
  for (const queue of ["存款确认", "提款审核", "账户审核", "人工调整", "异常资金", "结果冲突", "通知失败"]) {
    assert.match(funds, new RegExp(queue), `缺少资金待办：${queue}`);
  }
});

test("统一导航使用最新模块名称", async () => {
  const moduleSource = await readFile(path.join(root, "src/modules.js"), "utf8");
  const system = await readFile(path.join(root, "public/legacy/sources/system.html"), "utf8");

  for (const label of ["财务模块", "报表模块", "审计模块"]) {
    assert.match(moduleSource, new RegExp(`title: '${label}'`), `统一导航缺少：${label}`);
    assert.match(system, new RegExp(label), `系统管理菜单元数据缺少：${label}`);
  }

  for (const legacyLabel of ["资金运营", "报表体系", "审计体系"]) {
    assert.doesNotMatch(moduleSource, new RegExp(`title: '${legacyLabel}'`), `统一导航仍保留旧名称：${legacyLabel}`);
    assert.doesNotMatch(system, new RegExp(legacyLabel), `系统管理菜单元数据仍保留旧名称：${legacyLabel}`);
  }
});
