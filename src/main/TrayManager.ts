const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');

export class TrayManager {
  private tray: any | null = null;
  private windowManager: any;

  constructor(windowManager: any) {
    this.windowManager = windowManager;
    this.createTray();
  }

  private createTray() {
    // 创建一个简单的 16x16 图标
    const icon = nativeImage.createEmpty();
    this.tray = new Tray(icon);

    // 用透明像素创建一个最小图标（Windows 托盘区域只需一个占位）
    const size = 16;
    const buf = Buffer.alloc(size * size * 4);
    // 画一个简单的圆形图标
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cx = size / 2;
        const cy = size / 2;
        const r = size / 2 - 1;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        const idx = (y * size + x) * 4;
        if (dist <= r) {
          buf[idx] = 233;     // R
          buf[idx + 1] = 69;  // G
          buf[idx + 2] = 96;  // B
          buf[idx + 3] = 255; // A
        }
      }
    }
    const trayIcon = nativeImage.createFromBuffer(buf, { width: size, height: size });
    this.tray.setImage(trayIcon);
    this.tray.setToolTip('极简便签');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示/隐藏面板',
        click: () => this.windowManager.toggle(),
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          this.windowManager.close();
          require('electron').app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.on('click', () => this.windowManager.toggle());
  }
}
