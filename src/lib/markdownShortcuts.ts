/**
 * Markdown 编辑器快捷键工具
 * 操作受控 textarea：计算新内容与新选区，通过 setContent 更新，下一帧恢复选区
 */

interface WrapOptions {
  before: string;
  after: string;
  placeholder: string;
}

/**
 * 包裹当前选中的文本，若未选中则插入占位符并选中
 */
export function wrapSelection(
  textarea: HTMLTextAreaElement,
  value: string,
  setValue: (v: string) => void,
  opts: WrapOptions
): void {
  const { before, after, placeholder } = opts;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = value.slice(start, end) || placeholder;
  const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
  setValue(newValue);

  const selectStart = start + before.length;
  const selectEnd = selectStart + selected.length;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(selectStart, selectEnd);
  });
}

/**
 * 切换当前行的前缀（如列表 "- "）
 * 已有前缀则移除，没有则添加
 */
export function toggleLinePrefix(
  textarea: HTMLTextAreaElement,
  value: string,
  setValue: (v: string) => void,
  prefix: string
): void {
  const start = textarea.selectionStart;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = value.indexOf("\n", start);
  const realLineEnd = lineEnd === -1 ? value.length : lineEnd;
  const currentLine = value.slice(lineStart, realLineEnd);

  let newValue: string;
  let newCursor: number;
  if (currentLine.startsWith(prefix)) {
    // 移除前缀
    newValue = value.slice(0, lineStart) + currentLine.slice(prefix.length) + value.slice(realLineEnd);
    newCursor = Math.max(lineStart, start - prefix.length);
  } else {
    // 添加前缀
    newValue = value.slice(0, lineStart) + prefix + currentLine + value.slice(realLineEnd);
    newCursor = start + prefix.length;
  }
  setValue(newValue);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(newCursor, newCursor);
  });
}

interface ShortcutConfig {
  key: string; // 小写字母
  ctrl?: boolean; // ctrl 或 meta
  shift?: boolean;
}

/**
 * 处理快捷键，返回 true 表示已处理（应 preventDefault）
 */
export function handleMarkdownShortcut(
  e: KeyboardEvent,
  textarea: HTMLTextAreaElement,
  value: string,
  setValue: (v: string) => void
): boolean {
  const isCtrl = e.ctrlKey || e.metaKey;
  if (!isCtrl) return false;

  const key = e.key.toLowerCase();
  const configs: Array<ShortcutConfig & { action: () => void }> = [
    {
      key: "b",
      ctrl: true,
      action: () => wrapSelection(textarea, value, setValue, { before: "**", after: "**", placeholder: "加粗" }),
    },
    {
      key: "i",
      ctrl: true,
      action: () => wrapSelection(textarea, value, setValue, { before: "_", after: "_", placeholder: "斜体" }),
    },
    {
      key: "h",
      ctrl: true,
      action: () => wrapSelection(textarea, value, setValue, { before: "==", after: "==", placeholder: "高亮" }),
    },
    {
      key: "k",
      ctrl: true,
      action: () => wrapSelection(textarea, value, setValue, { before: "`", after: "`", placeholder: "代码" }),
    },
    {
      key: "u",
      ctrl: true,
      action: () => wrapSelection(textarea, value, setValue, { before: "<u>", after: "</u>", placeholder: "下划线" }),
    },
    {
      key: "l",
      ctrl: true,
      action: () => toggleLinePrefix(textarea, value, setValue, "- "),
    },
  ];

  const matched = configs.find((c) => c.key === key && !!c.ctrl === !!isCtrl && !!c.shift === !!e.shiftKey);
  if (matched) {
    e.preventDefault();
    matched.action();
    return true;
  }
  return false;
}

/**
 * 支持的快捷键列表（用于 UI 提示）
 */
export const SHORTCUTS: Array<{ keys: string; label: string }> = [
  { keys: "Ctrl+B", label: "加粗" },
  { keys: "Ctrl+H", label: "高亮" },
  { keys: "Ctrl+K", label: "行内代码" },
  { keys: "Ctrl+U", label: "下划线" },
  { keys: "Ctrl+L", label: "列表项" },
];
