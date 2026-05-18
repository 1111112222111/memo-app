const { globalShortcut } = require('electron');

export class HotkeyService {
  private windowManager: any;
  private currentHotkey: string;

  constructor(windowManager: any, hotkey?: string) {
    this.windowManager = windowManager;
    this.currentHotkey = hotkey || 'CommandOrControl+Shift+M';
    this.register();
  }

  private register() {
    const ret = globalShortcut.register(this.currentHotkey, () => {
      this.windowManager.toggle();
    });

    if (!ret) {
      console.warn(`全局快捷键 ${this.currentHotkey} 注册失败，可能被其他程序占用`);
    } else {
      console.log(`[Hotkey] 已注册: ${this.currentHotkey}`);
    }
  }

  reregister(newHotkey: string): boolean {
    globalShortcut.unregister(this.currentHotkey);
    this.currentHotkey = newHotkey;
    const ret = globalShortcut.register(this.currentHotkey, () => {
      this.windowManager.toggle();
    });
    if (!ret) {
      console.warn(`全局快捷键 ${this.currentHotkey} 注册失败，可能被其他程序占用`);
    } else {
      console.log(`[Hotkey] 已切换为: ${this.currentHotkey}`);
    }
    return ret;
  }

  getCurrentHotkey(): string {
    return this.currentHotkey;
  }

  unregister() {
    globalShortcut.unregister(this.currentHotkey);
  }
}
