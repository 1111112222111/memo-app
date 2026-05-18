const { clipboard } = require('electron');

export class ClipboardService {
  private lastText: string = '';
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private enabled: boolean = false;
  private onNewContent: ((text: string) => void) | null = null;

  setCallback(cb: (text: string) => void) {
    this.onNewContent = cb;
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
      const current = clipboard.readText() || '';
      if (current && current !== this.lastText && current.trim().length > 0) {
        this.lastText = current;
        this.onNewContent?.(current);
      }
    } catch (_) {
      // clipboard read may fail
    }
  }

  destroy() {
    this.stopPolling();
  }
}
