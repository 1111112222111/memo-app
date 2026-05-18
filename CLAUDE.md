# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言偏好

始终使用中文回复用户。

## 常用命令

```bash
npm start              # 开发运行 (需先 npm run build)
npm run build          # 构建全部 (main + renderer production)
npm run build:main     # 仅构建主进程
npm run build:renderer # 仅构建渲染进程
npm run dev            # 开发模式 (webpack watch + dev-server)
npm run pack:nsis      # 打包 NSIS 安装包 (需要管理员权限)
npm run pack           # 打包便携版 exe
```

**打包注意事项**: `electron-builder` 在 Windows 上解压 `winCodeSign` 时需要创建符号链接，普通用户权限会失败。必须以管理员身份运行终端，或在 Windows 设置中开启"开发人员模式"。

## 架构概览

```
src/
├── main/                    # Electron 主进程 (target: electron-main)
│   ├── index.ts             # 入口：初始化所有服务、注册全部 IPC handler
│   ├── preload.ts           # contextBridge 暴露 memoAPI 给渲染进程
│   ├── WindowManager.ts     # 无边框窗口、置顶、常驻、背景色
│   ├── TrayManager.ts       # 系统托盘图标与右键菜单
│   ├── HotkeyService.ts     # 全局快捷键注册/动态重绑
│   ├── StoreService.ts      # 备忘录 CRUD + memos.json 持久化
│   ├── SettingsService.ts   # 设置读写 + settings.json 持久化
│   └── ClipboardService.ts  # 剪贴板轮询 (文本+图片)、去重、图片存盘
└── renderer/                # React 渲染进程 (target: web)
    ├── index.tsx / index.html
    ├── App.tsx              # 主面板：输入、标签筛选、列表、搜索
    ├── App.css              # CSS 变量主题系统 (暗色/亮色)
    ├── types.ts             # Memo / Settings / FilterType 类型定义
    ├── declarations.d.ts    # PNG 模块声明
    ├── components/
    │   └── SettingsPanel.tsx # 设置面板：主题、快捷键录制、剪贴板开关
    ├── utils/
    │   └── classifier.ts    # 自动分类、FILTER_LABELS、时间格式化
    └── assets/icons/        # PNG 图标 (webpack asset/resource)
```

**主进程**使用 `require` 风格导入，webpack 打包为 `dist/main/main.js` 和 `dist/main/preload.js`。  
**渲染进程**使用 ESM import，webpack 打包为 `dist/renderer/renderer.js` + `index.html`。

## IPC 通信

所有渲染→主进程通信通过 `ipcMain.handle` / `ipcRenderer.invoke`，preload 通过 `contextBridge.exposeInMainWorld` 暴露 `window.memoAPI`。命名规范：

| 通道 | 方向 | 用途 |
|------|------|------|
| `memo:*` | 双向 | CRUD、togglePin、toggleDone、readImage |
| `settings:*` | 双向 | 读取/更新设置 |
| `clipboard:*` | 双向 | 启停监听、复制文字/图片到剪贴板 |
| `window:*` | 双向 | 常驻状态、背景色 |
| `theme:getSystem` | 主→渲染 | 获取系统主题 |
| `memo:added` | 主→渲染 (send) | 剪贴板新增记录通知 |
| `panel:focus/blur` | 主→渲染 (send) | 窗口焦点事件 |

## 数据模型

```typescript
interface Memo {
  id: string;          // 36进制时间戳+随机数
  content: string;
  type: 'link' | 'todo' | 'text' | 'clipboard' | 'image';
  imagePath?: string;  // 仅 type=image，图片本地绝对路径
  createdAt: number;
  pinned: boolean;
  done: boolean;
}
```

数据存于 `%APPDATA%/memo-app/memos.json`（最多 500 条），设置存于 `settings.json`。图片存于 `%APPDATA%/memo-app/images/`。

## 关键实现细节

- **窗口**: 无边框 (`frame: false`)，实色背景（非透明，避免 Windows 渲染问题），主题切换时通过 IPC 同步背景色
- **提示框**: 无边框窗口原生 `title` 不显示，改用 CSS `[data-tooltip]::after` 自定义 tooltip
- **图片显示**: 渲染进程无法直接读取本地文件，通过 `memo:readImage` IPC 将图片转为 base64 data URL
- **窗口拖动**: 工具栏和标签栏使用 `-webkit-app-region: drag`，按钮用 `no-drag` 排除
- **剪贴板图片**: 800ms 轮询，`clipboard.readImage()` 检测，MD5 去重，存为 PNG

## PRD 规范

PRD 文档位于 `docs/superpowers/specs/`。每次打包/发布前必须将变更同步到 PRD（详见 `.claude/skills/to-prd/SKILL.md`），使用 `🆕 功能名称 \`YYYY-MM-DD\`` 标注新增内容，删除线标记被替换内容。

## Git 忽略

`node_modules/`、`dist/`、`release/` 不进入版本管理。`.claude/skills/` 纳入版本管理。
