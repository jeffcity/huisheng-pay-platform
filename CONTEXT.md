# 项目边界

- 本项目只维护汇盛支付平台端统一 Demo（React + Arco Design 架构，2026-08-06 重构）。
- 架构：React 壳负责侧边导航/工具栏/路由；内页仍是既有高保真 HTML 源，经 iframe + embed 管线加载，业务口径零改动。
- `public/legacy/sources/` 下 15 个真实 HTML 是内页唯一可编辑源；`src/legacy/modules.json` 是模块注册表。
- 平台端业务需求、待确认事项和专项 Demo 继续以 `../../三端需求管理/平台端/` 为准。
- 跨端业务规则以 `../../10-顶层业务设计/` 与 `../../20-技术契约/` 为准。
- 根目录 `index.html` 是 Vite 入口源文件（可编辑）；`dist/` 是构建产物，禁止手改。

## 已知外部依赖（历史遗留，非本次引入）

- `channels / login / system / tenants` 四个独立页引用 unpkg.com 的 lucide 图标与 Google Fonts；离线打开时图标/字体回退，不影响业务演示。迁移为本地资源属于独立任务，需视觉回归确认后再做。
