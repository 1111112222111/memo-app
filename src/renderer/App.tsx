import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Memo, FilterType, Settings } from './types';
import { classifyContent, FILTER_LABELS, formatTime, isFilePath } from './utils/classifier';
import SettingsPanel from './components/SettingsPanel';
import imgClipboard from './assets/icons/clipboard.png';
import imgPinOn from './assets/icons/pin-on.png';
import imgPinOff from './assets/icons/pin-off.png';
import imgPinItem from './assets/icons/pin-item.png';
import imgSettings from './assets/icons/settings.png';
import imgCheck from './assets/icons/check.png';
import imgUndo from './assets/icons/undo.png';
import imgDelete from './assets/icons/delete.png';
import imgCopy from './assets/icons/copy.png';
import imgBack from './assets/icons/back.png';
import imgEmptyWrite from './assets/icons/write.png';
import imgEmptyTodo from './assets/icons/todo.png';
import imgEmptyLink from './assets/icons/link.png';
import imgEmptyImage from './assets/icons/image.png';

const api = window.memoAPI;

function applyTheme(theme: Settings['theme']) {
  const apply = (resolved: 'dark' | 'light') => {
    document.documentElement.setAttribute('data-theme', resolved);
    api.setBgColor(resolved === 'dark' ? '#21232B' : '#FAFAF8');
  };
  if (theme === 'system') {
    api.getSystemTheme().then(apply);
  } else {
    apply(theme);
  }
}

// ==================== 快捷功能页面 ====================
function QuickPanel({ onBack }: { onBack: () => void }) {
  const [runners, setRunners] = useState<Memo[]>([]);

  const loadRunners = useCallback(async () => {
    const all = await api.getAll();
    setRunners(all.filter(m => m.type === 'runner'));
  }, []);

  useEffect(() => { loadRunners(); }, [loadRunners]);

  const handleCreate = useCallback(async () => {
    await api.add('未命名运行', 'runner');
    loadRunners();
  }, [loadRunners]);

  const handleDelete = useCallback(async (id: string) => {
    await api.delete(id);
    loadRunners();
  }, [loadRunners]);

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-header-left">
          <button className="header-btn" onClick={onBack} data-tooltip="返回">
            <img className="header-icon" src={imgBack} alt="返回" />
          </button>
          <span className="header-title">快捷功能</span>
        </div>
        <div className="header-actions">
          <button className="header-btn" onClick={handleCreate} data-tooltip="新建运行">
            ＋
          </button>
        </div>
      </div>

      <div className="panel-list">
        {runners.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">点击 ＋ 新建运行项目</div>
          </div>
        ) : (
          runners.map(r => (
            <RunnerItem key={r.id} memo={r} onDelete={handleDelete} onUpdated={loadRunners} />
          ))
        )}
      </div>
    </div>
  );
}

function RunnerItem({ memo, onDelete, onUpdated }: { memo: Memo; onDelete: (id: string) => void; onUpdated: () => void }) {
  const [targets, setTargets] = useState(memo.targets || []);
  const [title, setTitle] = useState(memo.title || memo.content || '');
  const [editingTitle, setEditingTitle] = useState(false);
  const [targetInput, setTargetInput] = useState('');

  const saveTitle = useCallback(async (t: string) => {
    setTitle(t);
    await api.update(memo.id, { title: t || undefined, content: t || memo.content });
  }, [memo.id, memo.content]);

  const addTarget = useCallback(async () => {
    const t = targetInput.trim();
    if (!t) return;
    const newTargets = [...targets, t];
    setTargets(newTargets);
    await api.update(memo.id, { targets: newTargets });
    setTargetInput('');
  }, [targetInput, targets, memo.id]);

  const removeTarget = useCallback(async (idx: number) => {
    const newTargets = targets.filter((_, i) => i !== idx);
    setTargets(newTargets);
    await api.update(memo.id, { targets: newTargets });
  }, [targets, memo.id]);

  const handleBrowse = useCallback(async () => {
    const paths = await api.showOpenDialog();
    if (paths && paths.length > 0) {
      const newTargets = [...targets, ...paths];
      setTargets(newTargets);
      await api.update(memo.id, { targets: newTargets });
    }
  }, [targets, memo.id]);

  return (
    <div className="runner-card">
      <div className="runner-card-header">
        {editingTitle ? (
          <input
            className="title-edit-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); saveTitle(title); setEditingTitle(false); }
              if (e.key === 'Escape') { setEditingTitle(false); setTitle(memo.title || memo.content || ''); }
            }}
            onBlur={() => { saveTitle(title); setEditingTitle(false); }}
            onClick={e => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span className="runner-card-title" onClick={() => setEditingTitle(true)} title="点击编辑标题">
            {title || '未命名运行'}
          </span>
        )}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button className="runner-btn" onClick={() => api.runTargets(targets)} data-tooltip="一键打开所有目标">
            ▶ 运行
          </button>
          <button className="action-btn action-delete" onClick={() => onDelete(memo.id)} data-tooltip="删除">
            <img className="action-icon" src={imgDelete} alt="删除" />
          </button>
        </div>
      </div>

      {targets.length > 0 && (
        <div className="runner-tags">
          {targets.map((t, i) => (
            <span key={i} className="runner-tag">
              <span className="runner-tag-text">{t}</span>
              <button className="runner-tag-remove" onClick={() => removeTarget(i)}>×</button>
            </span>
          ))}
        </div>
      )}

      <div className="runner-input-row">
        <input
          className="runner-target-input"
          placeholder="输入网址或文件路径，回车添加..."
          value={targetInput}
          onChange={e => setTargetInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTarget(); } }}
        />
        <button className="runner-add-btn" onClick={addTarget}>+</button>
        <button className="runner-add-btn" onClick={handleBrowse} data-tooltip="浏览文件">…</button>
      </div>
    </div>
  );
}

// ==================== 主面板 ====================
export default function App() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchMode, setSearchMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickPanel, setShowQuickPanel] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [clipboardOn, setClipboardOn] = useState(false);
  const [windowPinned, setWindowPinned] = useState(false);
  const [tabMenu, setTabMenu] = useState<{ filter: FilterType; x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getAll().then(setMemos);
    api.getSettings().then(s => {
      applyTheme(s.theme);
      setClipboardOn(s.clipboardEnabled);
    });

    const unsubFocus = api.onPanelFocus(() => inputRef.current?.focus());
    const unsubBlur = api.onPanelBlur(() => inputRef.current?.blur());
    const unsubClip = api.onMemoAdded((memo: Memo) => setMemos(prev => [memo, ...prev]));
    const unsubTitle = api.onTitleFetched(({ id, title }) => {
      setMemos(prev => prev.map(m => m.id === id ? { ...m, title } : m));
    });

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSysThemeChange = () => {
      api.getSettings().then(s => { if (s.theme === 'system') applyTheme('system'); });
    };
    mq.addEventListener('change', onSysThemeChange);

    return () => {
      unsubFocus(); unsubBlur(); unsubClip(); unsubTitle();
      mq.removeEventListener('change', onSysThemeChange);
    };
  }, []);

  const handleSettingsChanged = useCallback((s: Settings) => {
    applyTheme(s.theme);
    setClipboardOn(s.clipboardEnabled);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    setSearchMode(value.length > 0 && filter === 'all');
  }, [filter]);

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const newMemo = await api.add(trimmed, classifyContent(trimmed));
    setMemos(prev => [newMemo, ...prev]);
    setInput('');
    setSearchMode(false);
  }, [input]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
    else if (e.key === 'Escape') {
      if (lightboxSrc) setLightboxSrc(null);
      else if (showSettings) setShowSettings(false);
      else if (input) { setInput(''); setSearchMode(false); }
    }
  }, [handleSubmit, input, showSettings, lightboxSrc]);

  const handleDelete = useCallback(async (id: string) => {
    await api.delete(id);
    setMemos(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleToggleDone = useCallback(async (id: string) => {
    const updated = await api.toggleDone(id);
    if (updated) setMemos(prev => prev.map(m => m.id === id ? updated : m));
  }, []);

  const handleTogglePin = useCallback(async (id: string) => {
    const updated = await api.togglePin(id);
    if (updated) setMemos(prev => prev.map(m => m.id === id ? updated : m));
  }, []);

  const handleChangeType = useCallback(async (id: string, newType: Memo['type']) => {
    const updated = await api.update(id, { type: newType });
    if (updated) setMemos(prev => prev.map(m => m.id === id ? updated : m));
  }, []);

  const handleUpdateTitle = useCallback(async (id: string, title: string) => {
    const updated = await api.update(id, { title: title || undefined });
    if (updated) setMemos(prev => prev.map(m => m.id === id ? updated : m));
  }, []);

  const handleClearFilter = useCallback(async (f: FilterType) => {
    setTabMenu(null);
    const ids = memos
      .filter(m => (f === 'all' || m.type === f) && !m.pinned && m.type !== 'runner')
      .map(m => m.id);
    if (ids.length > 0) {
      await api.deleteMultiple(ids);
      setMemos(prev => prev.filter(m => !ids.includes(m.id)));
    }
  }, [memos]);

  useEffect(() => {
    if (!tabMenu) return;
    const close = () => setTabMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', onKey); };
  }, [tabMenu]);

  const filteredMemos = memos
    .filter(m => m.type !== 'runner')
    .filter(m => {
      if (filter !== 'all') return m.type === filter;
      if (searchMode && input.trim()) {
        const q = input.trim().toLowerCase();
        return m.content.toLowerCase().includes(q) || (m.title && m.title.toLowerCase().includes(q));
      }
      return true;
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.createdAt - a.createdAt;
    })
    .slice(0, 50);

  const filters: FilterType[] = clipboardOn
    ? ['all', 'link', 'todo', 'text', 'clipboard', 'image']
    : ['all', 'link', 'todo', 'text'];

  // 快捷功能页面
  if (showQuickPanel) {
    return <QuickPanel onBack={() => setShowQuickPanel(false)} />;
  }

  // 设置页面
  if (showSettings) {
    return (
      <div className="panel">
        <SettingsPanel onClose={() => setShowSettings(false)} onSettingsChanged={handleSettingsChanged} />
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-header-left">
          <span className="header-title">极简便签</span>
          {clipboardOn && (
            <span className="header-btn header-btn-active" data-tooltip="剪贴板监听中">
              <img className="header-icon" src={imgClipboard} alt="剪贴板" />
            </span>
          )}
        </div>
        <div className="header-actions">
          <button className="header-btn" data-tooltip="快捷功能" onClick={() => setShowQuickPanel(true)}>
            ⚡
          </button>
          <button
            className={windowPinned ? 'header-btn header-btn-pin' : 'header-btn'}
            data-tooltip={windowPinned ? '已常驻，点击取消' : '常驻面板'}
            onClick={async () => { const p = await api.setPinned(!windowPinned); setWindowPinned(p); }}
          >
            <img className="header-icon" src={windowPinned ? imgPinOn : imgPinOff} alt="常驻" />
          </button>
          <button className="header-btn" data-tooltip="设置" onClick={() => setShowSettings(true)}>
            <img className="header-icon" src={imgSettings} alt="设置" />
          </button>
        </div>
      </div>

      <div className="panel-input-area">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            className="panel-input"
            placeholder={searchMode ? '搜索已有记录...' : '记点什么...'}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        {searchMode && (
          <div className="search-hint">
            <kbd>Enter</kbd> 新建 · 匹配 {filteredMemos.length} 条
          </div>
        )}
      </div>

      <div className="panel-tabs">
        {filters.map(f => {
          const unpinnedCount = memos.filter(m => (f === 'all' || m.type === f) && !m.pinned && m.type !== 'runner').length;
          return (
            <button
              key={f}
              className={`tab ${filter === f ? 'tab-active' : ''}`}
              onClick={() => { setFilter(f); setSearchMode(false); setInput(''); }}
              onContextMenu={e => {
                e.preventDefault();
                setTabMenu({ filter: f, x: e.clientX, y: e.clientY });
              }}
            >
              {FILTER_LABELS[f]}
              {tabMenu?.filter === f && (
                <div className="tab-context-menu" style={{ left: tabMenu.x, top: tabMenu.y }}>
                  <button
                    className="tab-context-menu-item"
                    onClick={e => { e.stopPropagation(); handleClearFilter(f); }}
                  >
                    清空 {unpinnedCount} 条未置顶记录
                  </button>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="panel-list">
        {filteredMemos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <img className="empty-state-icon-img" src={
                filter === 'clipboard' ? imgClipboard :
                filter === 'image' ? imgEmptyImage :
                filter === 'todo' ? imgEmptyTodo :
                filter === 'link' ? imgEmptyLink :
                imgEmptyWrite
              } alt="" />
            </div>
            <div className="empty-state-text">
              {filter === 'clipboard' ? <><strong>复制</strong>内容后自动记录</>
                : filter === 'image' ? <><strong>复制图片</strong>后自动记录</>
                : filter === 'todo' ? <>输入<strong>待办事项</strong>后保存</>
                : filter === 'link' ? <>粘贴<strong>网址</strong>后自动识别</>
                : <>输入后 <strong>Enter</strong> 保存</>}
            </div>
          </div>
        ) : (
          filteredMemos.map(memo => (
            <MemoItem
              key={memo.id}
              memo={memo}
              onDelete={handleDelete}
              onToggleDone={handleToggleDone}
              onTogglePin={handleTogglePin}
              onChangeType={handleChangeType}
              onUpdateTitle={handleUpdateTitle}
              onOpenLightbox={setLightboxSrc}
            />
          ))
        )}
      </div>

      {lightboxSrc && (
        <div className="lightbox-overlay" onClick={() => setLightboxSrc(null)}>
          <img className="lightbox-image" src={lightboxSrc} alt="放大预览" />
        </div>
      )}
    </div>
  );
}

// ==================== 备忘录条目 ====================
function MemoItem({
  memo,
  onDelete,
  onToggleDone,
  onTogglePin,
  onChangeType,
  onUpdateTitle,
  onOpenLightbox,
}: {
  memo: Memo;
  onDelete: (id: string) => void;
  onToggleDone: (id: string) => void;
  onTogglePin: (id: string) => void;
  onChangeType: (id: string, type: Memo['type']) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onOpenLightbox: (src: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  useEffect(() => {
    if (memo.type === 'image' && memo.imagePath) {
      api.readImage(memo.imagePath).then(setImageSrc);
    }
  }, [memo.imagePath, memo.type]);

  const handleCopy = useCallback(async () => {
    await api.skipClipboardNext();
    if (memo.type === 'image' && memo.imagePath) {
      await api.copyImage(memo.imagePath);
    } else {
      await api.copyText(memo.content);
    }
  }, [memo]);

  const handleClickContent = useCallback(() => {
    if (memo.type === 'link') {
      const target = memo.content;
      if (isFilePath(target)) {
        api.openLink(target.trim());
        return;
      }
      const match = target.match(/https?:\/\/\S+|www\.[a-zA-Z0-9][^\s]*\.[a-z]{2,}/i);
      if (match) {
        const url = match[0].startsWith('http') ? match[0] : 'https://' + match[0];
        api.openLink(url);
      }
    } else if (memo.type === 'image' && imageSrc) {
      onOpenLightbox(imageSrc);
    }
  }, [memo, imageSrc, onOpenLightbox]);

  const typeColors: Record<string, string> = {
    link: 'var(--danger)',
    todo: 'var(--warning)',
    text: 'var(--info)',
    clipboard: 'var(--text-muted)',
    image: '#72c97b',
    runner: 'var(--accent)',
  };

  const types: Memo['type'][] = ['link', 'todo', 'text', 'clipboard', 'image'];

  const hasTitle = !!memo.title;
  const isLink = memo.type === 'link';
  const canClick = isLink || memo.type === 'image';

  return (
    <div
      className={`memo-item ${memo.pinned ? 'memo-pinned' : ''} ${memo.done ? 'memo-done' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="memo-main">
        <span
          className="memo-type-dot"
          style={{ background: typeColors[memo.type] }}
          data-tooltip={FILTER_LABELS[memo.type]}
        />
        {memo.type === 'image' && imageSrc ? (
          <img className="memo-image" src={imageSrc} alt={memo.content} onClick={handleClickContent} />
        ) : editingTitle || hasTitle ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {editingTitle ? (
              <input
                className="title-edit-input"
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); onUpdateTitle(memo.id, titleDraft); setEditingTitle(false); }
                  if (e.key === 'Escape') { setEditingTitle(false); }
                }}
                onBlur={() => { onUpdateTitle(memo.id, titleDraft); setEditingTitle(false); }}
                onClick={e => e.stopPropagation()}
                autoFocus
              />
            ) : (
              <span className="memo-link-title" onClick={() => { setEditingTitle(true); setTitleDraft(memo.title || ''); }} title="点击编辑标题">
                {memo.title}
              </span>
            )}
            <span
              className={`memo-content ${memo.done ? 'line-through' : ''} ${canClick ? 'memo-content-link' : ''}`}
              onClick={canClick ? handleClickContent : undefined}
            >
              {memo.content}
            </span>
          </div>
        ) : (
          <span
            className={`memo-content ${memo.done ? 'line-through' : ''} ${canClick ? 'memo-content-link' : ''}`}
            onClick={canClick ? handleClickContent : undefined}
          >
            {memo.content}
          </span>
        )}
      </div>

      <div className="memo-meta">
        <span className="memo-time">{formatTime(memo.createdAt)}</span>

        {showActions && (
          <div className="memo-actions">
            {memo.type === 'todo' && (
              <button className="action-btn" data-tooltip={memo.done ? '标记未完成' : '标记完成'} onClick={() => onToggleDone(memo.id)}>
                <img className="action-icon" src={memo.done ? imgUndo : imgCheck} alt={memo.done ? '撤销' : '完成'} />
              </button>
            )}
            <button className="action-btn" data-tooltip="复制" onClick={handleCopy}>
              <img className="action-icon" src={imgCopy} alt="复制" />
            </button>
            <button className="action-btn" data-tooltip={memo.title ? '编辑标题' : '添加标题'}
              onClick={() => { setEditingTitle(true); setTitleDraft(memo.title || ''); }}>
              标题
            </button>
            <button className="action-btn" data-tooltip={memo.pinned ? '取消置顶' : '置顶'} onClick={() => onTogglePin(memo.id)}>
              <img className="action-icon" src={imgPinItem} alt="置顶" />
            </button>
            <select
              className="type-select"
              value={memo.type}
              onChange={e => onChangeType(memo.id, e.target.value as Memo['type'])}
              onClick={e => e.stopPropagation()}
            >
              {types.map(t => (<option key={t} value={t}>{FILTER_LABELS[t]}</option>))}
            </select>
            <button className="action-btn action-delete" data-tooltip="删除" onClick={() => onDelete(memo.id)}>
              <img className="action-icon" src={imgDelete} alt="删除" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
