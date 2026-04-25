# Electron 到 Tauri 迁移方案

## 目标

- 用 `Tauri 2 + React + TypeScript` 替代 Electron，降低包体和运行时开销。
- 保留现有日历 UI 与共享类型。
- 将桌面能力统一收口到 `desktopApi`，避免前端直接依赖桌面运行时。
- 将黄历缓存、配置读写、窗口控制迁移到 `src-tauri`。

## 当前改造范围

1. 新增 `src/renderer/src/api/desktop.ts`
   - 把前端对 Electron preload 的直接调用替换为统一桌面接口。
   - 在浏览器开发模式下提供回退实现，保证 `npm run dev` 仍可工作。
2. 新增 `src-tauri/`
   - 提供 Tauri 配置、Rust 命令、系统托盘和主窗口控制骨架。
   - 实现 `clock`、`almanac`、`settings`、`resize` 等核心命令。
3. 调整前端
   - 从 `window.calendarApi` 切换到 `desktopApi`。
   - 将原先独立配置窗口改成主界面内的设置面板。
4. 调整工程脚本
   - 移除 Electron 打包脚本。
   - 切换为 `tauri:dev` 与 `tauri:build`。

## 新结构

```text
opencalendar/
├─ src/
│  ├─ renderer/
│  │  └─ src/
│  │     ├─ api/
│  │     │  └─ desktop.ts
│  │     ├─ global.d.ts
│  │     ├─ main.tsx
│  │     └─ styles.css
│  └─ shared/
├─ src-tauri/
│  ├─ capabilities/
│  │  └─ default.json
│  ├─ src/
│  │  └─ main.rs
│  ├─ build.rs
│  ├─ Cargo.toml
│  └─ tauri.conf.json
└─ README.md
```

## 迁移后的桌面职责

- `React`
  - 月历展示、年份/月切换、节假日筛选、黄历展示。
- `desktopApi`
  - 统一前端对桌面端命令与事件的访问方式。
- `Tauri commands`
  - `get_clock_snapshot`
  - `get_almanac`
  - `get_api_key`
  - `set_api_key`
  - `report_calendar_size`
- `Rust`
  - SQLite 缓存
  - TianAPI 请求
  - 配置文件读写
  - 系统托盘和窗口显示/隐藏

## 后续建议

- 安装 Rust 工具链后执行 `npm run tauri:dev` 验证桌面端联调。
- 后续把节假日导入、手动编辑等本地能力继续迁到 `src-tauri`。
- 如果要继续做桌面常驻体验，可以在 Rust 侧补充更细的窗口定位逻辑。
