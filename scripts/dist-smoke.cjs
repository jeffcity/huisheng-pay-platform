// dist 冒烟：React 壳加载 → 资金待办渲染 → 详情→审核→2FA→状态流转→审计写回。
// 与旧单体引擎挂载测试同等口径，但目标是重构后的构建产物。
const puppeteer = require('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DIST = 'file://' + process.argv[2];

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', e.message.slice(0, 200)));
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(DIST, { waitUntil: 'networkidle0', timeout: 30000 });

  // React 壳就绪：侧边导航 + iframe 出现
  await page.waitForSelector('.arco-menu-item', { timeout: 10000 });
  console.log('SHELL_OK React+Arco 壳渲染');

  // 切到资金待办（默认 home，点资金待办）
  await page.evaluate(() => {
    [...document.querySelectorAll('.arco-menu-item')].find(b => b.textContent.includes('资金待办'))?.click();
  });

  // 内页在 iframe 内，等引擎表格
  await page.waitForFunction(() => {
    const f = document.querySelector('iframe');
    try { return f?.contentDocument?.querySelector('#tableBody tr'); } catch { return false; }
  }, { timeout: 15000 });
  console.log('EMBED_OK 资金待办经 embed 管线加载');

  const doc = () => page.evaluateHandle(() => document.querySelector('iframe').contentDocument);

  const before = await page.evaluate(async (d) => d.defaultView.__HSPlatformPrototype.getAuditRows().length, await doc());
  const rowIdx = await page.evaluate(async (d) => d.defaultView.__HSPlatformPrototype.getFundRows().findIndex(r => r[0] === 'FT-20260717-002'), await doc());

  // 详情 → 审核
  await page.evaluate(async (d, idx) => {
    const inner = d.defaultView.document;
    inner.querySelector('[data-platform-page-size]').value = '10';
    inner.querySelector('[data-platform-page-size]').dispatchEvent(new inner.defaultView.Event('change', { bubbles: true }));
    inner.querySelector(`#tableBody tr[data-row="${idx}"]`)?.querySelector('[data-detail]')?.click();
  }, await doc(), rowIdx);
  await page.evaluate(async (d) => {
    const inner = d.defaultView.document;
    [...inner.querySelectorAll('#drawerBody button')].find(b => b.dataset.fundAction === 'review')?.click();
  }, await doc());
  await page.waitForFunction(async (d) => d.defaultView.document.querySelector('#fundReviewForm'), { timeout: 5000 }, await doc());
  console.log('DRAWER_OPEN 审核表单');

  // 2FA + confirmed + 提交
  await page.evaluate(async (d) => {
    const inner = d.defaultView.document;
    const form = inner.querySelector('#fundReviewForm');
    form.querySelector('[name="twofa"]').value = '123456';
    const cb = form.querySelector('[name="confirmed"]');
    if (cb && !cb.checked) cb.click();
    form.requestSubmit();
  }, await doc());
  await new Promise(r => setTimeout(r, 1200));

  const after = await page.evaluate(async (d) => {
    const proto = d.defaultView.__HSPlatformPrototype;
    const fundRows = proto.getFundRows();
    const target = fundRows.find(r => r[0] === 'FT-20260717-002');
    const audits = proto.getAuditRows();
    return { status: target?.[5], audits: audits.length, last: audits[0]?.slice(0, 4) };
  }, await doc());

  console.log('AFTER FT-002:', after.status, '| audits', before, '->', after.audits, '| last:', JSON.stringify(after.last));
  const pass = after.status === '待执行' && after.audits > before;
  console.log(pass ? 'DIST_SMOKE_PASS 重构产物端到端业务链路完好' : 'DIST_SMOKE_FAIL');
  await page.screenshot({ path: 'smoke-dist.png' });
  await browser.close();
  process.exit(pass ? 0 : 1);
})();
