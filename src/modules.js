// 模块注册表：32 个模块 → 15 个源文件 + hash 路由。
import modules from './legacy/modules.json';

export const MODULES = modules;

// 统一壳侧边导航（与旧壳 platform-nav 分组一致）
export const NAV_GROUPS = [
  { title: '首页', items: [
    { module: 'home', label: '首页数据看板' },
  ]},
  { title: '租户管理', items: [
    { module: 'tenant-list', label: '租户管理' },
  ]},
  { title: '业务开通', items: [
    { module: 'business', label: '业务开通' },
  ]},
  { title: '资金运营', items: [
    { module: 'wallets', label: '租户平台钱包' },
    { module: 'funds', label: '资金待办' },
  ]},
  { title: '通道管理', items: [
    { module: 'channel-vendors', label: '通道管理' },
  ]},
  { title: '报表体系', subgroups: [
    { title: '日终统计', items: [
      { module: 'tenant-daily-report', label: '租户日终报表', level: 3 },
      { module: 'channel-daily-report', label: '通道日终报表', level: 3 },
    ]},
  ], items: [
    { module: 'ledger', label: '租户整体流水' },
  ]},
  { title: '审计体系', items: [
    { module: 'orders', label: '全局订单查询' },
    { module: 'audit', label: '审计日志' },
  ]},
  { title: '协同运营', items: [
    { module: 'tickets', label: '租户协同工单' },
  ]},
  { title: '系统管理 / 设置', items: [
    { module: 'system-accounts', label: '系统管理' },
  ]},
];

export const ALL_NAV_MODULES = NAV_GROUPS.flatMap(group => [
  ...(group.items || []),
  ...(group.subgroups || []).flatMap(sub => sub.items),
]);
