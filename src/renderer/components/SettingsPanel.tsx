import React, { useState, useEffect, useCallback } from 'react';
import { Settings } from '../types';
import imgClose from '../assets/icons/close.png';

const api = window.memoAPI;

interface Props {
  onClose: () => void;
  onSettingsChanged: (s: Settings) => void;
}

const THEME_LABELS: Record<string, string> = {
  dark: '暗色',
  light: '亮色',
  system: '跟随系统',
};

export default function SettingsPanel({ onClose, onSettingsChanged }: Props) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [recordingHotkey, setRecordingHotkey] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);

  useEffect(() => {
    api.getSettings().then(setSettings);
  }, []);

  const updateSetting = useCallback(async (partial: Partial<Settings>) => {
    const updated = await api.updateSettings(partial);
    setSettings(updated);
    onSettingsChanged(updated);
  }, [onSettingsChanged]);

  const handleHotkeyClick = useCallback(() => {
    setRecordingHotkey(true);
    setPressedKeys([]);
  }, []);

  const handleHotkeyKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const keys: string[] = [];
    if (e.ctrlKey || e.metaKey) keys.push('CommandOrControl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');

    // 忽略单独按修饰键
    const code = e.code;
    if (['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight'].includes(code)) {
      setPressedKeys(keys);
      return;
    }

    // 映射常见按键
    const keyMap: Record<string, string> = {
      'Space': 'Space',
      'Escape': 'Esc',
      'Enter': 'Enter',
      'Tab': 'Tab',
      'Backspace': 'Backspace',
    };
    const keyName = keyMap[e.code] || e.key.toUpperCase();
    keys.push(keyName);

    const combo = keys.join('+');
    updateSetting({ hotkey: combo });
    setRecordingHotkey(false);
    setPressedKeys([]);
  }, [updateSetting]);

  if (!settings) return null;

  return (
    <div className="settings-overlay">
      <div className="settings-header">
        <h3>设置</h3>
        <button className="header-btn" onClick={onClose}><img className="header-icon" src={imgClose} alt="关闭" /></button>
      </div>

      <div className="settings-body">
        {/* 主题 */}
        <div className="settings-group">
          <div className="settings-group-label">主题</div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">主题色</div>
              <div className="settings-row-desc">选择暗色、亮色或跟随系统</div>
            </div>
            <div className="theme-options">
              {(['dark', 'light', 'system'] as const).map(t => (
                <button
                  key={t}
                  className={`theme-btn ${settings.theme === t ? 'theme-btn-active' : ''}`}
                  onClick={() => updateSetting({ theme: t })}
                >
                  {THEME_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 快捷键 */}
        <div className="settings-group">
          <div className="settings-group-label">快捷键</div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">唤起面板</div>
              <div className="settings-row-desc">点击输入框后按下组合键</div>
            </div>
            <div>
              <input
                className="hotkey-input"
                readOnly
                value={
                  recordingHotkey
                    ? pressedKeys.length > 0
                      ? pressedKeys.join('+') + '+...'
                      : '按下组合键...'
                    : settings.hotkey.replace('CommandOrControl', 'Ctrl')
                }
                onClick={handleHotkeyClick}
                onKeyDown={handleHotkeyKeyDown}
                onBlur={() => { setRecordingHotkey(false); setPressedKeys([]); }}
              />
              {!recordingHotkey && (
                <div className="hotkey-hint">点击修改</div>
              )}
            </div>
          </div>
        </div>

        {/* 剪贴板 */}
        <div className="settings-group">
          <div className="settings-group-label">实验功能</div>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">剪贴板监听</div>
              <div className="settings-row-desc">自动记录复制的内容</div>
            </div>
            <button
              className={`toggle-switch ${settings.clipboardEnabled ? 'active' : ''}`}
              onClick={() => updateSetting({ clipboardEnabled: !settings.clipboardEnabled })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
