const { app, ipcMain, globalShortcut, nativeTheme, clipboard, nativeImage, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { WindowManager } = require('./WindowManager');
const { TrayManager } = require('./TrayManager');
const { HotkeyService } = require('./HotkeyService');
const { StoreService } = require('./StoreService');
const { SettingsService } = require('./SettingsService');
const { ClipboardService } = require('./ClipboardService');

function fetchTitle(url: string): Promise<string | null> {
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 5000, headers: { 'User-Agent': 'MemoApp/1.0' } }, (res: any) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchTitle(res.headers.location).then(resolve);
        res.resume();
        return;
      }
      let data = '';
      res.on('data', (chunk: string) => {
        data += chunk;
        if (data.length > 65536) { req.destroy(); }
      });
      res.on('end', () => {
        const m = data.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        resolve(m ? m[1].replace(/[\r\n\t]+/g, ' ').trim() : null);
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/\S+|www\.[a-zA-Z0-9][^\s]*\.[a-z]{2,}/i);
  return m ? m[0] : null;
}

function isFilePath(text: string): boolean {
  return /^([A-Za-z]:[\\\/]|\\\\|~[\\\/]|\/[^\/])/.test(text.trim());
}

let windowManager: InstanceType<typeof WindowManager>;
let trayManager: InstanceType<typeof TrayManager>;
let storeService: InstanceType<typeof StoreService>;
let settingsService: InstanceType<typeof SettingsService>;
let hotkeyService: InstanceType<typeof HotkeyService>;
let clipboardService: InstanceType<typeof ClipboardService>;

function sendToRenderer(channel: string, ...args: any[]) {
  if (windowManager['window']) {
    windowManager['window'].webContents.send(channel, ...args);
  }
}

app.whenReady().then(() => {
  try {
    console.log('[Memo] 正在启动...');

    storeService = new StoreService();
    console.log('[Memo] 存储服务已初始化, 共加载 ' + storeService.getAll().length + ' 条记录');

    settingsService = new SettingsService();
    console.log('[Memo] 设置服务已初始化');
    if (settingsService.getAll().autoStart) {
      app.setLoginItemSettings({ openAtLogin: true });
    }

    windowManager = new WindowManager(storeService);
    console.log('[Memo] 窗口管理器已创建');

    trayManager = new TrayManager(windowManager);
    console.log('[Memo] 托盘管理器已创建');

    hotkeyService = new HotkeyService(windowManager, settingsService.getAll().hotkey);
    console.log('[Memo] 全局快捷键已注册');

    const imageDir = path.join(app.getPath('userData'), 'images');
    clipboardService = new ClipboardService(imageDir);
    clipboardService.setTextCallback((text: string) => {
      const isLink = /^(https?:\/\/|ftp:\/\/|www\.[a-zA-Z0-9])/i.test(text.trim())
        || /https?:\/\/\S+|www\.[a-zA-Z0-9][^\s]*\.[a-z]{2,}/i.test(text);
      const isFile = isFilePath(text);
      const type = (isLink || isFile) ? 'link' : 'clipboard';
      const memo = storeService.add(text, type);
      sendToRenderer('memo:added', memo);
      if (isLink) {
        const url = extractUrl(text);
        if (url) {
          fetchTitle(url).then(title => {
            if (title) {
              storeService.update(memo.id, { title } as any);
              sendToRenderer('memo:titleFetched', { id: memo.id, title });
            }
          });
        }
      }
    });
    clipboardService.setImageCallback((imagePath: string) => {
      const filename = path.basename(imagePath);
      const memo = storeService.add(filename, 'image');
      storeService.update(memo.id, { imagePath } as any);
      const updated = storeService.getAll().find((m: any) => m.id === memo.id);
      sendToRenderer('memo:added', updated);
    });
    if (settingsService.getAll().clipboardEnabled) {
      clipboardService.setEnabled(true);
    }
    console.log('[Memo] 剪贴板服务已初始化');

    // === 备忘录 IPC ===
    ipcMain.handle('memo:getAll', () => storeService.getAll());
    ipcMain.handle('memo:add', (_e: any, content: string, type?: string) => {
      const memo = storeService.add(content, type);
      if (type === 'link') {
        const url = extractUrl(content);
        if (url) {
          fetchTitle(url).then(title => {
            if (title) {
              storeService.update(memo.id, { title } as any);
              sendToRenderer('memo:titleFetched', { id: memo.id, title });
            }
          });
        }
      }
      return memo;
    });
    ipcMain.handle('memo:update', (_e: any, id: string, updates: any) => storeService.update(id, updates));
    ipcMain.handle('memo:delete', (_e: any, id: string) => storeService.delete(id));
    ipcMain.handle('memo:togglePin', (_e: any, id: string) => storeService.togglePin(id));
    ipcMain.handle('memo:toggleDone', (_e: any, id: string) => storeService.toggleDone(id));

    // === 设置 IPC ===
    ipcMain.handle('settings:getAll', () => settingsService.getAll());
    ipcMain.handle('settings:update', (_e: any, partial: any) => {
      const updated = settingsService.update(partial);
      if (partial.hotkey && partial.hotkey !== hotkeyService.getCurrentHotkey()) {
        hotkeyService.reregister(partial.hotkey);
      }
      if (typeof partial.clipboardEnabled === 'boolean') {
        clipboardService.setEnabled(partial.clipboardEnabled);
      }
      if (typeof partial.autoStart === 'boolean') {
        app.setLoginItemSettings({ openAtLogin: partial.autoStart });
      }
      return updated;
    });
    ipcMain.handle('settings:autoStart', (_e: any, enabled: boolean) => {
      app.setLoginItemSettings({ openAtLogin: enabled });
      settingsService.update({ autoStart: enabled });
    });

    // === 剪贴板 IPC ===
    ipcMain.handle('clipboard:getEnabled', () => clipboardService.isEnabled());
    ipcMain.handle('clipboard:setEnabled', (_e: any, enabled: boolean) => {
      clipboardService.setEnabled(enabled);
      settingsService.update({ clipboardEnabled: enabled });
    });
    ipcMain.handle('clipboard:skipNext', () => clipboardService.skipNext());
    ipcMain.handle('clipboard:copyText', (_e: any, text: string) => {
      clipboard.writeText(text);
    });
    ipcMain.handle('clipboard:copyImage', (_e: any, imagePath: string) => {
      if (fs.existsSync(imagePath)) {
        const img = nativeImage.createFromPath(imagePath);
        clipboard.writeImage(img);
      }
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

    // === 打开链接 / 文件 IPC ===
    ipcMain.handle('link:open', (_e: any, url: string) => {
      if (isFilePath(url)) {
        shell.openPath(url);
      } else {
        shell.openExternal(url);
      }
    });

    // === 运行器 IPC ===
    ipcMain.handle('runner:run', (_e: any, targets: string[]) => {
      for (const t of targets) {
        if (isFilePath(t)) {
          shell.openPath(t);
        } else {
          shell.openExternal(t);
        }
      }
    });

    // === 文件浏览对话框 ===
    ipcMain.handle('dialog:showOpenDialog', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        title: '选择文件',
      });
      return result.canceled ? null : result.filePaths;
    });

    // === 读取图片为 base64 ===
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
