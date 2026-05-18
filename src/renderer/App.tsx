import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Memo, FilterType, Settings } from './types';
import { classifyContent, FILTER_LABELS, formatTime } from './utils/classifier';
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

const api = window.memoAPI;

function applyTheme(theme: Settings['theme']) {
  const apply = (resolved: 'dark' | 'light') => {
    document.documentElement.setAttribute('data-theme', resolved);
    api.setBgColor(resolved === 'dark' ? '#1a1a2e' : '#f5f5f8');
  };
  if (theme === 'system') {
    api.getSystemTheme().then(apply);
  } else {
    apply(theme);
  }
}

export default function App() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchMode, setSearchMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [clipboardOn, setClipboardOn] = useState(false);
  const [windowPinned, setWindowPinned] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getAll().then(setMemos);
    api.getSettings().then(s => {
      applyTheme(s.theme);
      setClipboardOn(s.clipboardEnabled);
    });

    const unsubFocus = api.onPanelFocus(() => {
      inputRef.current?.focus();
    });
    const unsubBlur = api.onPanelBlur(() => {
      inputRef.current?.blur();
    });

    const unsubClip = api.onMemoAdded((memo: Memo) => {
      setMemos(prev => [memo, ...prev]);
    });

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSysThemeChange = () => {
      api.getSettings().then(s => {
        if (s.theme === 'system') {
          applyTheme('system');
        }
      });
    };
    mq.addEventListener('change', onSysThemeChange);

    return () => {
      unsubFocus();
      unsubBlur();
      unsubClip();
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

    const newMemo = await api.add(trimmed);
    setMemos(prev => [newMemo, ...prev]);
    setInput('');
    setSearchMode(false);
  }, [input]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      if (showSettings) {
        setShowSettings(false);
      } else if (input) {
        setInput('');
        setSearchMode(false);
      }
    }
  }, [handleSubmit, input, showSettings]);

  const handleDelete = useCallback(async (id: string) => {
    await api.delete(id);
    setMemos(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleToggleDone = useCallback(async (id: string) => {
    const updated = await api.toggleDone(id);
    if (updated) {
      setMemos(prev => prev.map(m => m.id === id ? updated : m));
    }
  }, []);

  const handleTogglePin = useCallback(async (id: string) => {
    const updated = await api.togglePin(id);
    if (updated) {
      setMemos(prev => prev.map(m => m.id === id ? updated : m));
    }
  }, []);

  const handleChangeType = useCallback(async (id: string, newType: Memo['type']) => {
    const updated = await api.update(id, { type: newType });
    if (updated) {
      setMemos(prev => prev.map(m => m.id === id ? updated : m));
    }
  }, []);

  const filteredMemos = memos
    .filter(m => {
      if (filter !== 'all') return m.type === filter;
      if (searchMode && input.trim()) {
        return m.content.toLowerCase().includes(input.trim().toLowerCase());
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

  if (showSettings) {
    return (
      <div className="panel">
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onSettingsChanged={handleSettingsChanged}
        />
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        {clipboardOn && (
          <span className="header-btn header-btn-active" data-tooltip="剪贴板监听中">
            <img className="header-icon" src={imgClipboard} alt="剪贴板" />
          </span>
        )}
        <button
          className="header-btn"
          data-tooltip={windowPinned ? '已常驻，点击取消' : '常驻面板'}
          onClick={async () => {
            const newPinned = await api.setPinned(!windowPinned);
            setWindowPinned(newPinned);
          }}
        >
          <img className="header-icon" src={windowPinned ? imgPinOn : imgPinOff} alt="常驻" />
        </button>
        <button
          className="header-btn"
          data-tooltip="设置"
          onClick={() => setShowSettings(true)}
        >
          <img className="header-icon" src={imgSettings} alt="设置" />
        </button>
      </div>

      <div className="panel-input-area">
        <input
          ref={inputRef}
          className="panel-input"
          placeholder={searchMode ? '搜索已有记录...' : '记点什么...'}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        {searchMode && (
          <div className="search-hint">
            Enter=新建 &nbsp;|&nbsp; 匹配 {filteredMemos.length} 条
          </div>
        )}
      </div>

      <div className="panel-tabs">
        {filters.map(f => (
          <button
            key={f}
            className={`tab ${filter === f ? 'tab-active' : ''}`}
            onClick={() => { setFilter(f); setSearchMode(false); setInput(''); }}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="panel-list">
        {filteredMemos.length === 0 ? (
          <div className="empty-hint">
            {filter === 'clipboard'
              ? '暂无内容，复制内容后自动记录'
              : filter === 'image'
              ? '暂无图片，复制图片后自动记录'
              : '暂无记录，输入内容后按 Enter 保存'}
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
            />
          ))
        )}
      </div>
    </div>
  );
}

function MemoItem({
  memo,
  onDelete,
  onToggleDone,
  onTogglePin,
  onChangeType,
}: {
  memo: Memo;
  onDelete: (id: string) => void;
  onToggleDone: (id: string) => void;
  onTogglePin: (id: string) => void;
  onChangeType: (id: string, type: Memo['type']) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (memo.type === 'image' && memo.imagePath) {
      api.readImage(memo.imagePath).then(setImageSrc);
    }
  }, [memo.imagePath, memo.type]);

  const handleCopy = useCallback(async () => {
    if (memo.type === 'image' && memo.imagePath) {
      await api.copyImage(memo.imagePath);
    } else {
      await api.copyText(memo.content);
    }
  }, [memo]);

  const typeColors: Record<string, string> = {
    link: 'var(--danger)',
    todo: 'var(--warning)',
    text: 'var(--info)',
    clipboard: 'var(--text-muted)',
    image: '#72c97b',
  };

  const types: Memo['type'][] = ['link', 'todo', 'text', 'clipboard', 'image'];

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
          <img className="memo-image" src={imageSrc} alt={memo.content} />
        ) : (
          <span className={`memo-content ${memo.done ? 'line-through' : ''}`}>
            {memo.content}
          </span>
        )}
      </div>

      <div className="memo-meta">
        <span className="memo-time">{formatTime(memo.createdAt)}</span>

        {showActions && (
          <div className="memo-actions">
            {memo.type === 'todo' && (
              <button
                className="action-btn"
                data-tooltip={memo.done ? '标记未完成' : '标记完成'}
                onClick={() => onToggleDone(memo.id)}
              >
                <img className="action-icon" src={memo.done ? imgUndo : imgCheck} alt={memo.done ? '撤销' : '完成'} />
              </button>
            )}
            <button
              className="action-btn"
              data-tooltip="复制"
              onClick={handleCopy}
            >
              <img className="action-icon" src={imgCopy} alt="复制" />
            </button>
            <button
              className="action-btn"
              data-tooltip={memo.pinned ? '取消置顶' : '置顶'}
              onClick={() => onTogglePin(memo.id)}
            >
              <img className="action-icon" src={imgPinItem} alt="置顶" />
            </button>
            <select
              className="type-select"
              value={memo.type}
              onChange={e => onChangeType(memo.id, e.target.value as Memo['type'])}
              onClick={e => e.stopPropagation()}
            >
              {types.map(t => (
                <option key={t} value={t}>{FILTER_LABELS[t]}</option>
              ))}
            </select>
            <button
              className="action-btn action-delete"
              data-tooltip="删除"
              onClick={() => onDelete(memo.id)}
            >
              <img className="action-icon" src={imgDelete} alt="删除" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
