# 瞄感 AimSense — 完整项目规划

## 一、项目概述
面向 FPS 玩家的灵敏度校准网页工具（纯前端、桌面端，不做手机适配）。玩家输入鼠标 DPI 与游戏灵敏度倍率，通过定位/跟枪两项测试得出技能无关的表现分析，并在多次换灵敏度测试后找出个人最佳 eDPI。

## 二、技术方案
- Vite + React (JavaScript)，纯前端无后端、无构建外依赖
- 数据持久化：localStorage（设置项 + 测试记录）
- 核心运行时：requestAnimationFrame 采样（跟枪）、performance.now() 计时、PointerEvent 获取光标位置
- 坐标统一：球尺寸/速度以 1080p 为基准，按 `window.innerHeight / 1080` 等比缩放；处理 devicePixelRatio

## 三、页面结构与流程
```
设置页 Settings
  · 输入 DPI（数字输入，记忆上次）
  · 输入灵敏度倍率（默认 1，步进 0.01，可拖滑条或手动输）
  · 实时显示 eDPI = DPI × 倍率
  · 历史记录列表：每次测试的 eDPI/得分/类型/时间，可删除
  ┌──────────────────────────────┐
  │ [ 开始定位测试 ]  [ 开始跟枪测试 ]  ← 两项独立入口
  └──────────────────────────────┘
  （记录当前 DPI/倍率快照，独立成条）
      ├── 定位测试页 ClickingTest
      │   · 20 球，直径 ~40px(1080p基准)
      │   · 球随机位置，最小间距限制
      │   · 记录每球：命中次数、点中偏移、方向角、耗时
      │   · 记录光标轨迹（最后 500ms，判定过冲）
      └── 跟枪测试页 TrackingTest
          · 3 轮 × 10s，速度 300/600/900 px/s 递增
          · 球沿直线移动，每轮随机角度，边界弹射
          · 每帧采样光标与球心距离、沿运动方向有符号误差
              ↓
          结果页 Result
          · 得分(0-100) + 单次方向性建议
          · 过冲/欠冲分析可视化（轨迹图/误差曲线）
          · 历史最佳 eDPI 对比
          · [ 修改灵敏度再测 ] 按钮 → 返回设置页
```

## 四、测试模式详细设计

### 定位模式（Clicking）
| 项 | 值 |
|---|---|
| 目标数 | 20 个 |
| 球直径 | 40px @1080p 等比缩放 |
| 生成规则 | 随机位置，距上一球 ≥ 300px，距屏幕边缘 ≥ 80px |
| 计分方式 | 每次点击判中/未中，未中可继续点（记重试次数），点中即刷新球 |
| 记录指标 | 每球：总命中次数、点中时的偏移距离(px)、方向角、耗时；末次轨迹采样（判定过冲） |

### 跟枪模式（Tracking）
| 项 | 值 |
|---|---|
| 轮次 | 3 轮 × 10 秒 |
| 球直径 | 50px @1080p |
| 速度 | 300 / 600 / 900 px/s（按高度缩放） |
| 移动方式 | 直线匀速，每轮随机一个方向角；球到边界后弹射反向 |
| 记录指标 | 每帧(~60Hz)：光标位置、球位置、距离、沿运动方向的有符号误差 |

## 五、指标与算法

### 统计指标
- 定位：一次命中率（首点即中占比）、平均偏移（归一化为球半径倍数）、过冲震荡次数、总用时、前后半程对比
- 跟枪：平均误差、误差标准差、on-target 占比（误差 < 球半径）、有符号误差均值（方向偏差）、每轮分解

### 单次建议（技能无关，方向信号）
| 信号 | 建议 |
|---|---|
| 跟枪有符号误差均值明显为正（光标超前） | 灵敏度偏高 → 调低 |
| 跟枪有符号误差均值明显为负（光标落后） | 灵敏度偏低 → 调高 |
| 定位：一次命中率低 + 轨迹过冲震荡 | 偏高 |
| 定位：多次"差一点"（偏移小但重试多） | 偏低 |
| 误差小而稳定 | 合适，保持 |
| 误差大且抖动，方向无偏 | 保持，提示先练基础 |

### 多测试对比（核心）
- 同人短时间技能恒定 → 不同 eDPI 得分相对可比
- 历史记录中取最佳得分对应的 eDPI 为"个人最佳"
- 结果页展示得分 vs eDPI 折线图，标记甜蜜点
- 辅助信号：同 eDPI 多次测试的得分标准差（稳定性）

### 得分构成（0-100，仅供展示）
- 定位(50%)：一次命中率 30 + 平均偏移 10 + 用时/重试 10
- 跟枪(50%)：on-target 占比 30 + 误差稳定度 20

## 六、数据模型与存储
```js
// localStorage key: aimsense.settings
{ dpi: 800, sensMultiplier: 1.0 }

// localStorage key: aimsense.records[]
{ id, type: 'clicking'|'tracking', timestamp,
  dpi, sensMultiplier, eDPI,
  clicking?: { metrics, shots, radius },
  tracking?: { metrics, samples, radius },
  score, suggestion, analysis }
```

## 七、项目结构
```
aimsense/
├── index.html
├── package.json / vite.config.js
├── PLAN.md
└── src/
    ├── main.jsx / App.jsx（state 切换路由）
    ├── pages/
    │   ├── Settings.jsx
    │   ├── ClickingTest.jsx
    │   ├── TrackingTest.jsx
    │   └── Result.jsx
    ├── components/
    │   ├── TargetBall.jsx / Crosshair.jsx / HUD.jsx
    │   ├── ScoreChart.jsx
    │   └── RecordList.jsx
    ├── hooks/
    │   ├── useClickingTest.js / useTrackingTest.js
    │   └── useLocalStorage.js
    ├── logic/
    │   ├── metrics.js
    │   ├── analyze.js
    │   └── sensitivity.js
    └── styles/index.css（深色 CS 风格）
```

## 八、开发里程碑
- [x] M1 Vite 脚手架、设置页（DPI/倍率输入、eDPI 实时计算、localStorage 持久化）
- [x] M2 定位模式：球生成、点击判定、轨迹采样、HUD
- [x] M3 跟枪模式：匀速直线球、帧采样、轮次切换
- [x] M4 统计与算法：metrics/analyze 实现、单次建议
- [x] M5 结果页：得分展示、偏差可视化、历史对比图、再测循环
- [x] M6 打磨：视觉风格、边界 case（窗口缩放、快速连点、跨屏全屏提示）

## 九、风险与对策
| 风险 | 对策 |
|---|---|
| 过冲判定（末段轨迹采样）精度有限 | M4 先用简化版，试用后调阈值 |
| 高 DPI 屏坐标错位 | 统一 clientX/Y 逻辑坐标，避免 canvas 内缩放 |
| 浏览器刷新丢失进行中测试 | 仅测试完成后落盘，中途丢失可接受 |
| 算法阈值是启发式 | 单次建议附置信度提示，鼓励多测几组 |
| 多人共用一机 | 不做用户系统，记录属浏览器本地，后续可加导出/导入 JSON |
