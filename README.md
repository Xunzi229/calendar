# Calendar

![](html/QQ20260422-230931.png)

一个基于 Electron + React + TypeScript 的桌面中文日历应用。

当前版本重点实现月视图、年份/月分切换、中国节假日跳转、休班标记和 Windows 打包。

## 功能

- 中文月历视图，按周一到周日展示。
- 年份选择器支持滚动加载更多年份，不一次性渲染大量年份。
- 月份选择器支持快速切换月份。
- 左右箭头支持切换上个月/下个月。
- “今天”按钮支持跳回当前日期。
- 点击日期可以切换选中态。
- 点击跨月日期会自动跳到对应月份。
- 假期下拉支持选择中国主要放假节日。
- 选择节日后自动跳到当前年份对应假期月份，并选中假期首日。
- 节假日显示“休”标记，补班日显示“班”标记。
- 底部展示节日百科入口、宜忌信息和节日倒计时。
- 移除了 Electron 默认菜单栏。

## 技术栈

- Electron
- React 19
- TypeScript
- Vite
- electron-builder
- CSS Modules 风格的普通 CSS

## 环境要求

- Node.js >= 20
- npm

当前项目使用 npm 脚本。README 中不再假设必须安装 pnpm。

## 安装依赖

```bash
npm install
```

## 开发运行

当前 `npm run dev` 只启动 Vite 前端开发服务：

```bash
npm run dev
```

如需完整 Electron 开发联调，后续可以补充 Electron dev 启动脚本。

## 类型检查

```bash
npm run typecheck
```

## 构建

```bash
npm run build
```

构建输出：

- `dist/renderer`：前端页面产物。
- `dist/main`：Electron 主进程产物。
- `dist/shared`：共享类型/逻辑产物。

## Windows 打包

```bash
npm run package
```

打包输出位于 `release/`：

- `Calendar Setup 0.1.0.exe`：Windows 安装包。
- `Calendar 0.1.0.exe`：Windows 便携版。
- `win-unpacked/Calendar.exe`：解包后的可运行目录。

也可以只生成目录包：

```bash
npm run package:dir
```

## 注意事项

如果从命令行启动 Electron 时应用闪退，并看到 `app.whenReady` 相关错误，请检查是否设置了：

```powershell
$env:ELECTRON_RUN_AS_NODE
```

如果存在，先移除：

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE
```

## 节假日数据

当前界面内置了 2026 年中国放假安排示例数据，支持：

- 元旦
- 春节
- 清明节
- 劳动节
- 端午节
- 中秋节
- 国庆节

更完整的数据方案见：

- `docs/holiday-data-strategy.md`
- `resources/sql/holiday-schema.sql`
- `src/main/holiday`
- `src/shared/holiday`

推荐长期方案是使用 SQLite 作为本地权威数据源，网络接口只作为年度导入/更新来源。这样应用在离线或接口不可用时仍能正常显示已保存的节假日数据。

## 项目结构

```text
calendar/
├─ docs/
│  └─ holiday-data-strategy.md
├─ html/
│  └─ cc.html
├─ resources/
│  └─ sql/
│     └─ holiday-schema.sql
├─ src/
│  ├─ main/
│  │  ├─ index.ts
│  │  └─ holiday/
│  │     ├─ holidayRepository.ts
│  │     ├─ holidayService.ts
│  │     └─ providers.ts
│  ├─ renderer/
│  │  ├─ index.html
│  │  └─ src/
│  │     ├─ main.tsx
│  │     └─ styles.css
│  └─ shared/
│     └─ holiday/
│        └─ types.ts
├─ calendar-ui-style-description.md
├─ package.json
├─ tsconfig.json
├─ tsconfig.main.json
└─ vite.config.ts
```

## 视觉说明

界面样式参考说明在：

```text
calendar-ui-style-description.md
```

该文件记录了日历界面的布局、颜色、字体、节假日状态、选中态和 AI 重写提示词。

## 后续计划

- 接入 SQLite，持久化节假日数据。
- 增加手动新增/编辑节假日功能。
- 增加年度节假日在线导入。
- 增加农历和黄历数据源。
- 补充 Electron 开发联调脚本。
- 增加应用图标。
