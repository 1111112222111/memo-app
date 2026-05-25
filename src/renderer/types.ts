/// <reference types="react" />

declare global {
  interface Window {
    memoAPI: {
      getAll: () => Promise<Memo[]>;
      add: (content: string, type?: string) => Promise<Memo>;
      update: (id: string, updates: Partial<Memo>) => Promise<Memo | null>;
      delete: (id: string) => Promise<boolean>;
      togglePin: (id: string) => Promise<Memo | null>;
      toggleDone: (id: string) => Promise<Memo | null>;
      readImage: (imagePath: string) => Promise<string | null>;
      getSettings: () => Promise<Settings>;
      updateSettings: (partial: Partial<Settings>) => Promise<Settings>;
      getClipboardEnabled: () => Promise<boolean>;
      setClipboardEnabled: (enabled: boolean) => Promise<void>;
      copyText: (text: string) => Promise<void>;
      copyImage: (imagePath: string) => Promise<void>;
      skipClipboardNext: () => Promise<void>;
      openLink: (url: string) => Promise<void>;
      runTargets: (targets: string[]) => Promise<void>;
      showOpenDialog: () => Promise<string[] | null>;
      setPinned: (pinned: boolean) => Promise<boolean>;
      isPinned: () => Promise<boolean>;
      setBgColor: (color: string) => Promise<void>;
      getSystemTheme: () => Promise<'dark' | 'light'>;
      setAutoStart: (enabled: boolean) => Promise<void>;
      onPanelFocus: (callback: () => void) => () => void;
      onPanelBlur: (callback: () => void) => () => void;
      onMemoAdded: (callback: (memo: Memo) => void) => () => void;
      onTitleFetched: (callback: (data: { id: string; title: string }) => void) => () => void;
    };
  }
}

export interface Memo {
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

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  hotkey: string;
  clipboardEnabled: boolean;
  autoStart: boolean;
}

export type FilterType = 'all' | 'link' | 'todo' | 'text' | 'clipboard' | 'image';
