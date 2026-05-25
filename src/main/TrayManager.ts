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
    const iconPath = path.join(__dirname, 'tray-icon.png');
    const trayIcon = nativeImage.createFromPath(iconPath);
    this.tray = new Tray(trayIcon);
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
