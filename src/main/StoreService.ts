const fs = require('fs');
const path = require('path');
const { app } = require('electron');

interface Memo {
  id: string;
  content: string;
  type: 'link' | 'todo' | 'text' | 'clipboard' | 'image' | 'runner';
  imagePath?: string;
  targets?: string[];
  title?: string;
  createdAt: number;
  pinned: boolean;
  done: boolean;
}

const MAX_MEMOS = 500;
const AUTO_SAVE_DELAY = 500;

function getDataPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'memos.json');
}

export class StoreService {
  private memos: Memo[] = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private dataPath: string;

  constructor() {
    this.dataPath = getDataPath();
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const raw = fs.readFileSync(this.dataPath, 'utf-8');
        this.memos = JSON.parse(raw);
      }
    } catch (e) {
      console.error('加载数据失败:', e);
      this.memos = [];
    }
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), AUTO_SAVE_DELAY);
  }

  private save() {
    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dataPath, JSON.stringify(this.memos, null, 2), 'utf-8');
    } catch (e) {
      console.error('保存数据失败:', e);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  getAll(): Memo[] {
    return [...this.memos];
  }

  add(content: string, type?: Memo['type']): Memo {
    const memo: Memo = {
      id: this.generateId(),
      content: content.trim(),
      type: type || 'text',
      createdAt: Date.now(),
      pinned: false,
      done: false,
    };
    this.memos.unshift(memo);

    // 限制最大数量
    if (this.memos.length > MAX_MEMOS) {
      this.memos = this.memos.slice(0, MAX_MEMOS);
    }

    this.scheduleSave();
    return memo;
  }

  update(id: string, updates: Partial<Memo>): Memo | null {
    const index = this.memos.findIndex(m => m.id === id);
    if (index === -1) return null;

    this.memos[index] = { ...this.memos[index], ...updates };
    this.scheduleSave();
    return this.memos[index];
  }

  delete(id: string): boolean {
    const index = this.memos.findIndex(m => m.id === id);
    if (index === -1) return false;

    this.memos.splice(index, 1);
    this.scheduleSave();
    return true;
  }

  togglePin(id: string): Memo | null {
    const memo = this.memos.find(m => m.id === id);
    if (!memo) return null;
    return this.update(id, { pinned: !memo.pinned });
  }

  toggleDone(id: string): Memo | null {
    const memo = this.memos.find(m => m.id === id);
    if (!memo) return null;
    return this.update(id, { done: !memo.done });
  }
}
