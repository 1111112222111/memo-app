const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('memoAPI', {
  // 备忘录 CRUD
  getAll: () => ipcRenderer.invoke('memo:getAll'),
  add: (content: string) => ipcRenderer.invoke('memo:add', content),
  update: (id: string, updates: any) => ipcRenderer.invoke('memo:update', id, updates),
  delete: (id: string) => ipcRenderer.invoke('memo:delete', id),
  togglePin: (id: string) => ipcRenderer.invoke('memo:togglePin', id),
  toggleDone: (id: string) => ipcRenderer.invoke('memo:toggleDone', id),
  readImage: (imagePath: string) => ipcRenderer.invoke('memo:readImage', imagePath),

  // 设置
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  updateSettings: (partial: any) => ipcRenderer.invoke('settings:update', partial),

  // 剪贴板
  getClipboardEnabled: () => ipcRenderer.invoke('clipboard:getEnabled'),
  setClipboardEnabled: (enabled: boolean) => ipcRenderer.invoke('clipboard:setEnabled', enabled),
  copyText: (text: string) => ipcRenderer.invoke('clipboard:copyText', text),
  copyImage: (imagePath: string) => ipcRenderer.invoke('clipboard:copyImage', imagePath),

  // 窗口常驻
  setPinned: (pinned: boolean) => ipcRenderer.invoke('window:setPinned', pinned),
  isPinned: () => ipcRenderer.invoke('window:isPinned'),
  setBgColor: (color: string) => ipcRenderer.invoke('window:setBgColor', color),

  // 主题（主进程获取系统主题）
  getSystemTheme: () => ipcRenderer.invoke('theme:getSystem'),

  // 事件监听
  onPanelFocus: (callback: () => void) => {
    ipcRenderer.on('panel:focus', callback);
    return () => ipcRenderer.removeListener('panel:focus', callback);
  },
  onPanelBlur: (callback: () => void) => {
    ipcRenderer.on('panel:blur', callback);
    return () => ipcRenderer.removeListener('panel:blur', callback);
  },
  onMemoAdded: (callback: (memo: any) => void) => {
    ipcRenderer.on('memo:added', (_e: any, memo: any) => callback(memo));
    return () => ipcRenderer.removeListener('memo:added', callback);
  },
});
