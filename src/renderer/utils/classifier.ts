import { Memo } from '../types';

// 动词列表：以这些词开头判定为待办
const TODO_VERBS = [
  '买', '做', '去', '订', '约', '交', '打', '发', '写', '提交',
  '还', '修', '装', '理', '整', '清', '洗', '寄', '取', '订',
  '找', '查', '下载', '安装', '配置', '学', '复习', '准备',
  '处理', '联系', '回复', '打电话', '报名', '申请', '打印',
  '填', '跑', '拿', '带', '换', '关', '开', '取消', '设置',
];

export function classifyContent(content: string): Memo['type'] {
  const trimmed = content.trim();

  // URL 检测
  if (/^https?:\/\//i.test(trimmed)) {
    return 'link';
  }

  // 待办检测：以动词开头
  for (const verb of TODO_VERBS) {
    if (trimmed.startsWith(verb)) {
      return 'todo';
    }
  }

  return 'text';
}

export const FILTER_LABELS: Record<string, string> = {
  all: '全部',
  link: '链接',
  todo: '待办',
  text: '文字',
  clipboard: '剪贴板',
};

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;

  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}
