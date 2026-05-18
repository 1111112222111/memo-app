const { app, ipcMain, globalShortcut, nativeTheme, clipboard, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { WindowManager } = require('./WindowManager');
const { TrayManager } = require('./TrayManager');
const { HotkeyService } = require('./HotkeyService');
const { StoreService } = require('./StoreService');
const { SettingsService } = require('./SettingsService');
const { ClipboardService } = require('./ClipboardService');

let windowManager: InstanceType<typeof WindowManager>;
let trayManager: InstanceType<typeof TrayManager>;
let storeService: InstanceType<typeof StoreService>;
let settingsService: InstanceType<typeof SettingsService>;
let hotkeyService: InstanceType<typeof HotkeyService>;
let clipboardService: InstanceType<typeof ClipboardService>;

app.whenReady().then(() => {
  try {
    console.log('[Memo] 正在启动...');

    storeService = new StoreService();
    console.log('[Memo] 存储服务已初始化, 共加载 ' + storeService.getAll().length + ' 条记录');

    settingsService = new SettingsService();
    console.log('[Memo] 设置服务已初始化');

    windowManager = new WindowManager(storeService);
    console.log('[Memo] 窗口管理器已创建');

    trayManager = new TrayManager(windowManager);
    console.log('[Memo] 托盘管理器已创建');

    hotkeyService = new HotkeyService(windowManager, settingsService.getAll().hotkey);
    console.log('[Memo] 全局快捷键已注册');

    const imageDir = path.join(app.getPath('userData'), 'images');
    clipboardService = new ClipboardService(imageDir);
    clipboardService.setTextCallback((text: string) => {
      const memo = storeService.add(text, 'clipboard');
      if (windowManager['window']) {
        windowManager['window'].webContents.send('memo:added', memo);
      }
    });
    clipboardService.setImageCallback((imagePath: string) => {
      const filename = path.basename(imagePath);
      const memo = storeService.add(filename, 'image');
      // 用 update 注入 imagePath（add 接口不直接支持 imagePath）
      storeService.update(memo.id, { imagePath } as any);
      const updated = storeService.getAll().find((m: any) => m.id === memo.id);
      if (windowManager['window']) {
        windowManager['window'].webContents.send('memo:added', updated);
      }
    });
    if (settingsService.getAll().clipboardEnabled) {
      clipboardService.setEnabled(true);
    }
    console.log('[Memo] 剪贴板服务已初始化');

    // === 备忘录 IPC ===
    ipcMain.handle('memo:getAll', () => storeService.getAll());
    ipcMain.handle('memo:add', (_e: any, content: string) => storeService.add(content));
    ipcMain.handle('memo:update', (_e: any, id: string, updates: any) => storeService.update(id, updates));
    ipcMain.handle('memo:delete', (_e: any, id: string) => storeService.delete(id));
    ipcMain.handle('memo:togglePin', (_e: any, id: string) => storeService.togglePin(id));
    ipcMain.handle('memo:toggleDone', (_e: any, id: string) => storeService.toggleDone(id));

    // === 设置 IPC ===
    ipcMain.handle('settings:getAll', () => settingsService.getAll());
    ipcMain.handle('settings:update', (_e: any, partial: any) => {
      const updated = settingsService.update(partial);
      // 如果快捷键变了，重新注册
      if (partial.hotkey && partial.hotkey !== hotkeyService.getCurrentHotkey()) {
        hotkeyService.reregister(partial.hotkey);
      }
      // 如果剪贴板开关变了
      if (typeof partial.clipboardEnabled === 'boolean') {
        clipboardService.setEnabled(partial.clipboardEnabled);
      }
      return updated;
    });

    // === 剪贴板 IPC ===
    ipcMain.handle('clipboard:getEnabled', () => clipboardService.isEnabled());
    ipcMain.handle('clipboard:setEnabled', (_e: any, enabled: boolean) => {
      clipboardService.setEnabled(enabled);
      settingsService.update({ clipboardEnabled: enabled });
    });

    // === 窗口常驻 IPC ===
    ipcMain.handle('window:setPinned', (_e: any, pinned: boolean) => {
      windowManager.setPinned(pinned);
      return windowManager.isPinned();
    });
    ipcMain.handle('window:isPinned', () => windowManager.isPinned());

    // === 窗口背景 IPC ===
    ipcMain.handle('window:setBgColor', (_e: any, color: string) => {
      windowManager.setBackgroundColor(color);
    });

    // === 主题 IPC ===
    ipcMain.handle('theme:getSystem', () => {
      return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    });

    // === 复制到剪贴板 IPC ===
    ipcMain.handle('clipboard:copyText', (_e: any, text: string) => {
      clipboard.writeText(text);
    });
    ipcMain.handle('clipboard:copyImage', (_e: any, imagePath: string) => {
      if (fs.existsSync(imagePath)) {
        const img = nativeImage.createFromPath(imagePath);
        clipboard.writeImage(img);
      }
    });

    // === 读取图片为 base64（渲染进程无法直接读取本地文件） ===
    ipcMain.handle('memo:readImage', (_e: any, imagePath: string) => {
      if (fs.existsSync(imagePath)) {
        const buf = fs.readFileSync(imagePath);
        const ext = path.extname(imagePath).slice(1);
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        return `data:${mime};base64,${buf.toString('base64')}`;
      }
      return null;
    });

    console.log('[Memo] 启动完成');
  } catch (err) {
    console.error('[Memo] 启动失败:', err);
  }
});

app.on('window-all-closed', () => {
  // 不退出，保持托盘运行
});

app.on('will-quit', () => {
  hotkeyService?.unregister();
  clipboardService?.destroy();
  globalShortcut.unregisterAll();
});
