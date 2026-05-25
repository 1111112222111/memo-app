const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('memoAPI', {
  // 备忘录 CRUD
  getAll: () => ipcRenderer.invoke('memo:getAll'),
  add: (content: string, type?: string) => ipcRenderer.invoke('memo:add', content, type),
  update: (id: string, updates: any) => ipcRenderer.invoke('memo:update', id, updates),
  delete: (id: string) => ipcRenderer.invoke('memo:delete', id),
  deleteMultiple: (ids: string[]) => ipcRenderer.invoke('memo:deleteMultiple', ids),
  togglePin: (id: string) => ipcRenderer.invoke('memo:togglePin', id),
  toggleDone: (id: string) => ipcRenderer.invoke('memo:toggleDone', id),
  readImage: (imagePath: string) => ipcRenderer.invoke('memo:readImage', imagePath),

  // 设置
  getSettings: () => ipcRenderer.invoke('settings:getAll'),
  updateSettings: (partial: any) => ipcRenderer.invoke('settings:update', partial),
  setAutoStart: (enabled: boolean) => ipcRenderer.invoke('settings:autoStart', enabled),

  // 剪贴板
  getClipboardEnabled: () => ipcRenderer.invoke('clipboard:getEnabled'),
  setClipboardEnabled: (enabled: boolean) => ipcRenderer.invoke('clipboard:setEnabled', enabled),
  copyText: (text: string) => ipcRenderer.invoke('clipboard:copyText', text),
  copyImage: (imagePath: string) => ipcRenderer.invoke('clipboard:copyImage', imagePath),
  skipClipboardNext: () => ipcRenderer.invoke('clipboard:skipNext'),

  // 链接 / 文件
  openLink: (url: string) => ipcRenderer.invoke('link:open', url),
  runTargets: (targets: string[]) => ipcRenderer.invoke('runner:run', targets),
  showOpenDialog: () => ipcRenderer.invoke('dialog:showOpenDialog'),

  // 窗口常驻
  setPinned: (pinned: boolean) => ipcRenderer.invoke('window:setPinned', pinned),
  isPinned: () => ipcRenderer.invoke('window:isPinned'),
  setBgColor: (color: string) => ipcRenderer.invoke('window:setBgColor', color),

  // 主题
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
  onTitleFetched: (callback: (data: { id: string; title: string }) => void) => {
    const handler = (_e: any, data: { id: string; title: string }) => callback(data);
    ipcRenderer.on('memo:titleFetched', handler);
    return () => ipcRenderer.removeListener('memo:titleFetched', handler);
  },
});
