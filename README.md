# 汇盛支付平台端统一 Demo

平台端独立项目（React + Arco Design 重构版），用于统一维护、版本管理和发布平台端总 Demo。

## 架构

- **React 壳**（`src/`）：侧边导航、工具栏、全局搜索、模块路由，Arco Design 样式基座。
- **内页源**（`public/legacy/sources/`）：15 个真实高保真 HTML 文件，经 `src/embed.js` 管线注入 iframe，业务口径零改动。
- **模块注册表**（`src/legacy/modules.json`）：32 个模块 → 源文件 + hash 路由。

## 维护入口

- 壳/导航/路由：`src/App.jsx`、`src/modules.js`、`src/embed.js`
- 内页内容：`public/legacy/sources/<key>.html`
- 平台端需求资料：`../../三端需求管理/平台端/`

```sh
npm install
npm run dev      # 本地开发
npm run build    # Vite 构建到 dist/
npm run check    # 构建 + 测试 + 门禁
node scripts/dist-smoke.cjs "$(pwd)/dist/index.html"   # 业务链路冒烟（需本机 Chrome）
```

`dist/` 由构建生成，不手工修改。推送 `main` 后 GitHub Actions 重新检查并发布 Pages。
