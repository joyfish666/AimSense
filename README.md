# 瞄感 AimSense

> 面向 FPS 玩家的灵敏度校准工具 · 纯前端 · 无后端

通过**定位（Clicking）**与**跟枪（Tracking）**两项技能无关的测试，量化你在不同 eDPI 下的表现，找出个人最佳灵敏度。

[English](./README_EN.md) | [在线体验](https://joyfish666.github.io/AimSense/) | [规划文档](./PLAN.md)

## 在线体验

**https://joyfish666.github.io/AimSense/**

> 需使用桌面端浏览器（Chrome / Edge / Firefox），不支持移动端。

## 功能特性

- **eDPI 实时计算** — `eDPI = DPI × 灵敏度倍率`，同时提供 `cm/360°` 参考换算与异常区间提示
- **定位测试** — 20 个随机目标，记录首击命中率、偏移距离、过冲震荡、耗时分段对比
- **跟枪测试** — 4 档速度（150 / 300 / 600 / 900 px/s）× 3 次，横向匀速 + 边界弹射，每帧采样误差与有符号方向偏差
- **技能无关分析** — 单次测试给出方向性建议（偏高/偏低/合适），多次测试通过得分 vs eDPI 曲线定位甜蜜点
- **分榜与历史** — 定位/跟枪独立榜单、得分趋势图（`ScoreChart`），本地持久化、可删除单条记录
- **快速再测循环** — 结果页支持 `±0.05 / 0.1 / 0.2` 步进微调灵敏度后直接重测、同模式重开、切换模式

## 快速开始

```bash
# 环境要求: Node.js >= 20
npm install
npm run dev      # 本地开发 http://localhost:5173
npm run build    # 生产构建 -> dist/
npm run preview  # 预览构建产物
npm run lint     # oxlint 检查
```

## 技术栈

| 类别 | 选型 |
|------|------|
| 构建 / 框架 | Vite 8 + React 19 |
| 语言 | JavaScript (ESM) |
| 样式 | 原生 CSS，深色 CS 风格 |
| 运行时 | `requestAnimationFrame` 帧采样、`performance.now()` 计时、`PointerEvent` |
| 持久化 | `localStorage` (`aimsense.settings` / `aimsense.records`) |
| 质量 | oxlint |

## 项目结构

```
src/
├── App.jsx                 # 轻量状态路由 + 记录落盘/采样压缩
├── pages/
│   ├── Settings.jsx        # DPI/倍率输入、eDPI 展示、测试入口、历史分榜
│   ├── ClickingTest.jsx    # 定位测试
│   ├── TrackingTest.jsx    # 跟枪测试
│   └── Result.jsx          # 得分、建议、可视化、再测操作
├── components/             # TargetBall / Crosshair / HUD / ScoreChart / RecordList 等
├── hooks/                  # useClickingTest / useTrackingTest / useLocalStorage / useCountUp
├── logic/
│   ├── metrics.js          # 指标计算
│   ├── analyze.js          # 单次建议与多测对比
│   └── sensitivity.js      # eDPI / cm360 换算与校验
└── styles/index.css
```

详见 [PLAN.md](./PLAN.md)。

## 工作原理

1. 输入鼠标 `DPI` 与页面 `灵敏度倍率`（均可选填，默认 `800 × 1.0`），得到 `eDPI`。
2. 完成定位或跟枪测试，系统计算得分（0–100）与方向性建议。
3. 通过快速调节按钮微调灵敏度重复测试，对比历史得分曲线，取最高分对应的 `eDPI` 即为个人最佳值。

> 同一用户短时间内技能水平视为恒定，不同 `eDPI` 的得分相对可比。

## 部署

本项目已配置 GitHub Actions 自动部署到 GitHub Pages：

- 工作流：[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)
- 触发条件：推送到 `main` 分支或手动 `workflow_dispatch`
- 流程：`npm ci` → `npm run build` → 上传 `dist` → `actions/deploy-pages`
- Vite `base` 已按 `GITHUB_ACTIONS` 环境变量自动切换为 `/AimSense/`（见 [`vite.config.js:8`](./vite.config.js#L8)）

Fork 后只需在仓库 Settings → Pages 中 Source 选择 **GitHub Actions** 即可复用。

## 浏览器兼容

仅支持桌面端，不做移动端适配。建议全屏/最大化窗口以获得一致的坐标缩放（以 1080p 为基准等比缩放）。

## 许可证

[MIT](./LICENSE) © 2026 Wang Huanyu
