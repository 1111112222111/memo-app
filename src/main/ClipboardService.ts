const { clipboard, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

export class ClipboardService {
  private lastText: string = '';
  private lastImageHash: string = '';
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private enabled: boolean = false;
  private onNewText: ((text: string) => void) | null = null;
  private onNewImage: ((imagePath: string) => void) | null = null;
  private imageDir: string;
  private skipCount: number = 0;

  constructor(imageDir: string) {
    this.imageDir = imageDir;
    if (!fs.existsSync(imageDir)) {
      fs.mkdirSync(imageDir, { recursive: true });
    }
  }

  setTextCallback(cb: (text: string) => void) {
    this.onNewText = cb;
  }

  setImageCallback(cb: (imagePath: string) => void) {
    this.onNewImage = cb;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled) {
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private startPolling() {
    if (this.pollTimer) return;
    this.lastText = clipboard.readText() || '';
    // 初始化图片 hash
    const img = clipboard.readImage();
    if (!img.isEmpty()) {
      this.lastImageHash = this.hashBuffer(img.toPNG());
    }
    this.pollTimer = setInterval(() => {
      this.check();
    }, 800);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private check() {
    try {
      // 跳过本轮（内部复制触发）
      if (this.skipCount > 0) {
        this.skipCount--;
        this.lastText = clipboard.readText() || '';
        const img = clipboard.readImage();
        if (!img.isEmpty()) this.lastImageHash = this.hashBuffer(img.toPNG());
        return;
      }

      // 检测图片（优先，因为复制图片时剪贴板也可能有文本）
      const image = clipboard.readImage();
      if (!image.isEmpty()) {
        const pngBuffer = image.toPNG();
        const hash = this.hashBuffer(pngBuffer);
        if (hash !== this.lastImageHash) {
          this.lastImageHash = hash;
          // 保存图片
          const filename = Date.now().toString(36) + '.png';
          const filePath = path.join(this.imageDir, filename);
          fs.writeFileSync(filePath, pngBuffer);
          this.onNewImage?.(filePath);
          return; // 图片优先，不再检测文本
        }
      }

      // 检测文本
      const current = clipboard.readText() || '';
      if (current && current !== this.lastText && current.trim().length > 0) {
        this.lastText = current;
        this.onNewText?.(current);
      }
    } catch (_) {
      // clipboard read may fail
    }
  }

  private hashBuffer(buf: Buffer): string {
    return crypto.createHash('md5').update(buf).digest('hex');
  }

  skipNext() {
    this.skipCount++;
  }

  destroy() {
    this.stopPolling();
  }
}
