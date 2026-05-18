const fs = require('fs');
const path = require('path');
const { app } = require('electron');

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  hotkey: string;
  clipboardEnabled: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  hotkey: 'CommandOrControl+Shift+M',
  clipboardEnabled: false,
};

export class SettingsService {
  private settings: Settings;
  private filePath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.filePath = path.join(userDataPath, 'settings.json');
    this.settings = this.load();
  }

  private load(): Settings {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.error('[Settings] 加载失败:', e);
    }
    return { ...DEFAULT_SETTINGS };
  }

  private save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Settings] 保存失败:', e);
    }
  }

  getAll(): Settings {
    return { ...this.settings };
  }

  update(partial: Partial<Settings>): Settings {
    this.settings = { ...this.settings, ...partial };
    this.save();
    return this.getAll();
  }
}
