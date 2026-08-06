// 旧壳 prepareEmbeddedDocument 的忠实移植：fetch 真实源文件 → 内联 authGuard →
// 隐藏内页自带 sidebar/topbar → 注入统一壳补丁与路由同步脚本 → 交给 iframe.srcdoc。
// 与旧实现逐条对应，行为口径不变。
const sourceCache = new Map();

async function fetchSource(key) {
  if (sourceCache.has(key)) return sourceCache.get(key);
  const res = await fetch(`./legacy/sources/${key}.html`);
  if (!res.ok) throw new Error(`页面来源缺失：${key}`);
  const text = await res.text();
  sourceCache.set(key, text);
  return text;
}

function shellPatch(normalizedHash) {
  return `
        <style id="hsUnifiedEmbeddedShell">
          html, body { width: 100% !important; min-height: 100% !important; height: auto !important; overflow: auto !important; }
          body > .app, body > .app-shell { width: 100% !important; min-height: 100vh !important; display: block !important; }
          body > .app > .workspace, body > .app-shell > .main {
            width: 100% !important; min-width: 0 !important; min-height: 100vh !important;
            display: block !important; grid-template-columns: minmax(0, 1fr) !important;
            grid-template-rows: minmax(0, 1fr) !important;
          }
          body > .app > .workspace > .content, body > .app-shell > .main > .content,
          body > .app-shell > .main > .workspace { min-width: 0 !important; width: 100% !important; }
        </style>
        <script>
          const hsNativeReplaceState = window.history.replaceState.bind(window.history);
          window.history.replaceState = (...args) => {
            try { return hsNativeReplaceState(...args); } catch (_) { return undefined; }
          };
          window.__UNIFIED_DEMO_HASH = ${JSON.stringify(normalizedHash)};
          if (window.__UNIFIED_DEMO_HASH) {
            try { window.history.replaceState(null, "", "#" + window.__UNIFIED_DEMO_HASH); } catch (_) {}
          }
        </script>
      `;
}

const routeSync = `
        <script>
          (() => {
            const applyUnifiedRoute = () => {
              const route = window.__UNIFIED_DEMO_HASH || "";
              if (window.channelDemo?.setActiveModule && ["vendors", "collectionChannels", "payoutChannels", "collectionProducts", "payoutProducts"].includes(route)) {
                window.channelDemo.setActiveModule(route);
              }
              if (["login", "bind", "exception"].includes(route)) {
                document.querySelectorAll("[data-view]").forEach(panel => {
                  panel.hidden = panel.dataset.view !== route;
                });
              }
            };
            if (document.readyState === "complete") applyUnifiedRoute();
            else window.addEventListener("load", () => window.setTimeout(applyUnifiedRoute, 0), { once: true });
          })();
        </script>
      `;

export async function prepareEmbeddedDocument(sourceKey, initialHash = '') {
  let html = await fetchSource(sourceKey);
  const guardCode = sourceKey === 'authGuard' ? '' : await fetchSource('authGuard');
  const normalizedHash = String(initialHash || '').replace(/^#/, '');
  html = html.replace(
    /<script\s+src=(["'])\.\.\/platform-auth-route-guard\.js\1([^>]*)><\/script>/gi,
    (_match, _quote, attributes) => `<script${attributes}>${guardCode}</script>`
  );
  html = html.replace(
    /<aside\b[^>]*class=["'][^"']*\bsidebar\b[^"']*["'][^>]*>[\s\S]*?<\/aside>/i,
    match => match.replace(/<aside\b/i, '<aside hidden aria-hidden="true" style="display:none!important"')
  );
  html = html.replace(
    /<header\b[^>]*class=["'][^"']*\btopbar\b[^"']*["'][^>]*>[\s\S]*?<\/header>/i,
    match => match.replace(/<header\b/i, '<header hidden aria-hidden="true" style="display:none!important"')
  );
  html = html.replace(/<\/head>/i, `${shellPatch(normalizedHash)}</head>`);
  html = html.replace(/<\/body>/i, `${routeSync}</body>`);
  return html;
}
