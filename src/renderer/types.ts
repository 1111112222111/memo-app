/// <reference types="react" />

declare global {
  interface Window {
    memoAPI: {
      getAll: () => Promise<Memo[]>;
      add: (content: string) => Promise<Memo>;
      update: (id: string, updates: Partial<Memo>) => Promise<Memo | null>;
      delete: (id: string) => Promise<boolean>;
      togglePin: (id: string) => Promise<Memo | null>;
      toggleDone: (id: string) => Promise<Memo | null>;
      getSettings: () => Promise<Settings>;
      updateSettings: (partial: Partial<Settings>) => Promise<Settings>;
      getClipboardEnabled: () => Promise<boolean>;
      setClipboardEnabled: (enabled: boolean) => Promise<void>;
      setPinned: (pinned: boolean) => Promise<boolean>;
      isPinned: () => Promise<boolean>;
      setBgColor: (color: string) => Promise<void>;
      getSystemTheme: () => Promise<'dark' | 'light'>;
      onPanelFocus: (callback: () => void) => () => void;
      onPanelBlur: (callback: () => void) => () => void;
      onMemoAdded: (callback: (memo: Memo) => void) => () => void;
    };
  }
}

export interface Memo {
  id: string;
  content: string;
  type: 'link' | 'todo' | 'text' | 'clipboard';
  createdAt: number;
  pinned: boolean;
  done: boolean;
}

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  hotkey: string;
  clipboardEnabled: boolean;
}

export type FilterType = 'all' | 'link' | 'todo' | 'text' | 'clipboard';
