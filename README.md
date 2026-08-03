# 汇盛支付平台端统一 Demo

平台端独立项目，用于统一维护、版本管理和发布平台端总 Demo。

## 维护入口

- 唯一可编辑总 Demo：`src/demo.html`
- 本地评审入口：`index.html`
- GitHub Pages 产物：`dist/index.html`
- 平台端需求资料：`../../三端需求管理/平台端/`

```sh
npm test
npm run build
npm run check
```

`index.html` 与 `dist/index.html` 均由构建生成，不手工修改。远端仓库由项目负责人建立后，再配置 GitHub Pages 使用 GitHub Actions 发布。
