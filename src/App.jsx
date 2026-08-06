import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MODULES, NAV_GROUPS } from './modules.js';
import { prepareEmbeddedDocument } from './embed.js';

function NavIcon({ paths }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

// 与旧壳 platform-nav 一致的图标（从旧单体原样提取的 path 数据）
const ICONS = {
  home: ['M3 10.5 12 3l9 7.5', 'M5.5 9.5V21h13V9.5M9 21v-7h6v7'],
  tenant: ['M4 21V7l8-4 8 4v14', 'M8 10h1m3 0h1m3 0h1M8 14h1m3 0h1m3 0h1M9 21v-3h6v3'],
  business: ['M8 3v4m8-4v4M7 11h10m-10 4h6'],
  businessRect: ['M8 3v4m8-4v4'],
  wallet: ['M4 7.5h14a2 2 0 0 1 2 2V19H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13v3.5', 'M15 12h6v4h-6a2 2 0 0 1 0-4Z'],
  funds: [],
  channel: [],
  report: ['M5 20V10m7 10V4m7 16v-7'],
  ledger: ['M6 4h12M6 9h12M6 14h12M6 19h12', 'M3 4h.01M3 9h.01M3 14h.01M3 19h.01'],
  orders: [],
  audit: ['M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z', 'm9 12 2 2 4-4'],
  tickets: ['M4 5h16v5a2 2 0 0 0 0 4v5H4v-5a2 2 0 0 0 0-4V5Z', 'M9 8v8'],
  system: [],
  search: [],
};

const MODULE_ICON = {
  home: ICONS.home, 'tenant-list': ICONS.tenant, business: ICONS.business,
  wallets: ICONS.wallet, funds: ICONS.funds, 'channel-vendors': ICONS.channel,
  'tenant-daily-report': ICONS.report, 'channel-daily-report': ICONS.report,
  ledger: ICONS.ledger, orders: ICONS.orders, audit: ICONS.audit,
  tickets: ICONS.tickets, 'system-accounts': ICONS.system,
};

export default function App() {
  const [activeModule, setActiveModule] = useState('home');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const frameRef = useRef(null);
  const searchRef = useRef(null);

  const openModule = useCallback(async (moduleId, hash) => {
    const target = MODULES[moduleId] || MODULES.home;
    setActiveModule(MODULES[moduleId] ? moduleId : 'home');
    setLoading(true);
    setError('');
    try {
      const doc = await prepareEmbeddedDocument(target.sourceKey, hash ?? target.initialHash);
      const frame = frameRef.current;
      if (!frame) return;
      frame.title = '汇盛支付平台端 · ' + target.label;
      frame.srcdoc = doc;
    } catch (err) {
      setError(String(err?.message || err));
      setLoading(false);
    }
  }, []);

  useEffect(() => { openModule(activeModule); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 旧壳对外的 postMessage API 与全局对象，供内页跨模块导航复用（口径不变）
  useEffect(() => {
    const onMessage = (event) => {
      const data = event.data;
      if (!data || data.type !== 'hs-demo-open-module') return;
      openModule(data.module, typeof data.hash === 'string' ? data.hash : undefined);
    };
    window.addEventListener('message', onMessage);
    window.__HSPlatformTotalDemo = Object.freeze({
      openModule,
      getActiveModule: () => activeModule,
      getSourceKey: moduleId => MODULES[moduleId]?.sourceKey || null,
      getModuleIds: () => Object.keys(MODULES)
    });
    return () => window.removeEventListener('message', onMessage);
  }, [openModule, activeModule]);

  const onShellSearch = (event) => {
    if (event.key !== 'Enter') return;
    const childDocument = frameRef.current?.contentDocument;
    const target = childDocument?.querySelector(
      "#globalSearch, #keywordFilter, [data-page-filter='0'], input[type='search']"
    );
    if (!target) return;
    target.value = searchRef.current.value;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    target.focus();
  };

  const activeTarget = MODULES[activeModule] || MODULES.home;
  const navLabel = (id) => {
    const item = NAV_GROUPS.flatMap(g => [...(g.items || []), ...(g.subgroups || []).flatMap(s => s.items)])
      .find(i => i.module === id);
    return item?.label || MODULES[id]?.label || '';
  };

  return (
    <div className="bundle product-shell-mode">
      <aside className="platform-sidebar">
        <div className="platform-brand">
          <span className="platform-brand-mark">HS</span>
          <span className="platform-brand-copy"><strong>汇盛支付</strong><small>平台端控制台</small></span>
        </div>
        <nav className="platform-nav" aria-label="平台端完整业务目录">
          {NAV_GROUPS.map(group => (
            <section className="platform-nav-group" key={group.title}>
              <h2>{group.title}</h2>
              {group.subgroups?.map(sub => (
                <div key={sub.title}>
                  <div className="platform-nav-subgroup">{sub.title}</div>
                  <div className="platform-nav-items">
                    {sub.items.map(item => (
                      <NavItem key={item.module} item={item} active={activeModule} onOpen={openModule} />
                    ))}
                  </div>
                </div>
              ))}
              {group.items && (
                <div className="platform-nav-items">
                  {group.items.map(item => (
                    <NavItem key={item.module} item={item} active={activeModule} onOpen={openModule} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </nav>
      </aside>
      <main className="platform-main">
        <div className="platform-toolbar">
          <div className="platform-breadcrumb">
            <strong>平台端</strong><span>/</span><span>{navLabel(activeTarget.navId || activeModule)}</span>
          </div>
          <div className="platform-toolbar-actions">
            <label className="platform-search">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></svg>
              <input ref={searchRef} type="search" placeholder="搜索租户、订单、通道、审计单号" aria-label="平台全局搜索" onKeyDown={onShellSearch} />
            </label>
            <span className="platform-chip success">生产只读</span>
            <span className="platform-chip primary">平台超管</span>
          </div>
        </div>
        <main className="frame-shell">
          {loading && !error && (
            <div className="loading"><div className="loading-card"><i className="spinner" /><span>正在载入审查页面</span></div></div>
          )}
          {error && (
            <div className="loading"><div className="loading-card">页面来源缺失：{error}</div></div>
          )}
          <iframe
            ref={frameRef}
            title="汇盛支付平台端页面"
            referrerPolicy="no-referrer"
            onLoad={() => setLoading(false)}
          />
        </main>
      </main>
    </div>
  );
}

function NavItem({ item, active, onOpen }) {
  const isActive = active === item.module || (MODULES[active]?.navId === item.module);
  const icon = MODULE_ICON[item.module];
  return (
    <button
      type="button"
      className={`platform-nav-item${item.level === 3 ? ' level-3' : ''}${isActive ? ' active' : ''}`}
      data-module={item.module}
      title={item.label}
      aria-label={item.label}
      aria-current={isActive ? 'page' : 'false'}
      onClick={() => onOpen(item.module)}
    >
      {icon?.length ? <NavIcon paths={icon} /> : null}
      <span>{item.label}</span>
    </button>
  );
}
