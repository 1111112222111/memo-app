const { app, ipcMain, globalShortcut, nativeTheme } = require('electron');
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

    clipboardService = new ClipboardService();
    clipboardService.setCallback((text: string) => {
      const memo = storeService.add(text, 'clipboard');
      // 通知渲染进程新记录
      if (windowManager['window']) {
        windowManager['window'].webContents.send('memo:added', memo);
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
