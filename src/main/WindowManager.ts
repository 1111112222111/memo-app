const { BrowserWindow, screen } = require('electron');
const path = require('path');

const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 480;
const EDGE_MARGIN = 12;

export class WindowManager {
  private window: any | null = null;
  private storeService: any;
  private pinned: boolean = false;

  constructor(storeService: any) {
    this.storeService = storeService;
    this.createWindow();
  }

  private createWindow() {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    this.window = new BrowserWindow({
      icon: path.join(__dirname, '..', '..', 'icon.png'),
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      x: screenWidth - PANEL_WIDTH - EDGE_MARGIN,
      y: screenHeight - PANEL_HEIGHT - EDGE_MARGIN,
      frame: false,
      backgroundColor: '#1a1a2e',
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    if (process.env.MEMO_DEV === 'true') {
      this.window.loadURL('http://localhost:3000').catch(() => {
        this.window?.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
      });
    } else {
      this.window.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
    }

    this.window.on('blur', () => {
      if (!this.pinned) {
        this.hide();
      }
    });
  }

  setPinned(p: boolean) {
    this.pinned = p;
  }

  isPinned(): boolean {
    return this.pinned;
  }

  setBackgroundColor(color: string) {
    if (this.window) {
      this.window.setBackgroundColor(color);
    }
  }

  toggle() {
    if (!this.window) return;
    if (this.window.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    if (!this.window) return;
    this.window.show();
    this.window.focus();
    this.window.webContents.send('panel:focus');
  }

  hide() {
    if (!this.window) {
      return;
    }
    // 先尝试失焦输入框，避免下一次打开时还带着焦点状态
    try { this.window.webContents.send('panel:blur'); } catch (_) { /* ignore */ }
    this.window.hide();
  }

  isVisible(): boolean {
    return this.window?.isVisible() ?? false;
  }

  close() {
    this.window?.close();
    this.window = null;
  }
}
