# Calendar

一个基于 `Tauri 2 + React + TypeScript` 的中文桌面日历应用。

![](html/QQ20260422-230931.png)

## 当前能力

- 中文月历视图，按周一到周日展示
- 年份、月份、节假日快速切换
- 点击日期自动更新选中态和黄历面板
- 节假日显示“休”，补班日显示“班”
- 内置 TianAPI Key 设置面板
- 本地 SQLite 缓存黄历数据
- Tauri 系统托盘控制主窗口显示与隐藏

## 技术栈

- Tauri 2
- React 19
- TypeScript
- Vite
- Rust
- SQLite

## 开发

安装 Node.js 依赖：

```bash
npm install
```

只运行前端：

```bash
npm run dev
```

运行 Tauri 桌面端：

```bash
npm run tauri:dev
```

## 构建

前端构建：

```bash
npm run build
```

桌面应用构建：

```bash
npm run tauri:build
```

## 目录

```text
opencalendar/
├─ src/
│  ├─ renderer/
│  │  └─ src/
│  │     ├─ api/
│  │     ├─ global.d.ts
│  │     ├─ main.tsx
│  │     └─ styles.css
│  └─ shared/
├─ src-tauri/
│  ├─ capabilities/
│  ├─ src/
│  ├─ Cargo.toml
│  └─ tauri.conf.json
└─ TAURI_MIGRATION_PLAN.md
```

## 说明

- 浏览器模式下仍可通过 `npm run dev` 开发界面，桌面 API 会自动回退到浏览器实现。
- 由于当前机器未安装 Rust 工具链，Tauri 桌面端尚未在本机完成编译验证；安装 Rust 后即可继续联调。
