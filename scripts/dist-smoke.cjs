// dist 冒烟：React 壳加载 → 租户平台钱包渲染 → 钱包详情 → 租户流水下钻。
// 与当前统一导航和重构后的构建产物保持一致。
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

  // 切到财务模块当前唯一入口：租户平台钱包
  await page.evaluate(() => {
    [...document.querySelectorAll('.arco-menu-item')].find(b => b.textContent.includes('租户平台钱包'))?.click();
  });

  // 内页在 iframe 内，等待钱包表格与原型接口就绪
  await page.waitForFunction(() => {
    const frame = document.querySelector('iframe');
    try {
      const inner = frame?.contentDocument;
      return inner?.querySelector('#tableBody tr') && inner?.defaultView?.__HSPlatformPrototype?.getWalletRows;
    } catch {
      return false;
    }
  }, { timeout: 15000 });
  console.log('EMBED_OK 租户平台钱包经 embed 管线加载');

  const doc = () => page.evaluateHandle(() => document.querySelector('iframe').contentDocument);
  const walletCount = await page.evaluate(async d => d.defaultView.__HSPlatformPrototype.getWalletRows().length, await doc());

  // 打开首条钱包详情
  await page.evaluate(async d => {
    d.defaultView.document.querySelector('#tableBody tr [data-detail]')?.click();
  }, await doc());
  await page.waitForFunction(async d => {
    const inner = d.defaultView.document;
    return inner.querySelector('#drawer.open') && inner.querySelector('#drawerTitle')?.textContent.includes('租户平台钱包详情');
  }, { timeout: 5000 }, await doc());
  console.log('DRAWER_OPEN 钱包详情');

  // 从钱包详情下钻至当前租户流水
  await page.evaluate(async d => {
    d.defaultView.document.querySelector('#drawerBody [data-jump-page="ledger"]')?.click();
  }, await doc());
  await page.waitForFunction(async d => {
    const inner = d.defaultView.document;
    return inner.querySelector('#pageTitle')?.textContent.includes('租户整体流水') && inner.querySelector('#tableBody tr');
  }, { timeout: 5000 }, await doc());

  const result = await page.evaluate(async d => {
    const inner = d.defaultView.document;
    return {
      title: inner.querySelector('#pageTitle')?.textContent.trim(),
      rows: inner.querySelectorAll('#tableBody tr').length
    };
  }, await doc());

  const pass = walletCount > 0 && result.title.includes('租户整体流水') && result.rows > 0;
  console.log('AFTER 钱包详情:', walletCount, '个租户钱包 | 下钻', result.title, '| 列表', result.rows, '行');
  console.log(pass ? 'DIST_SMOKE_PASS 重构产物钱包查看与流水下钻链路完好' : 'DIST_SMOKE_FAIL');
  await page.screenshot({ path: 'smoke-dist.png' });
  await browser.close();
  process.exit(pass ? 0 : 1);
})();
