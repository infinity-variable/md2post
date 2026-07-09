import { useRef, useCallback, useEffect, useState } from "react";
import { useStore } from "@/store";
import { handleMarkdownShortcut, SHORTCUTS } from "@/lib/markdownShortcuts";
import { FileText, ImageIcon, Images, LayoutTemplate, ChevronDown, ChevronRight } from "lucide-react";
import {
  processImageFiles,
  setLastSelection,
  setTextareaEl,
} from "@/lib/imageInsert";
import { DEFAULT_CONTENT, TEMPLATE_TWO } from "@/types";
import ImageManager from "@/components/ImageManager";

export default function Editor() {
  const content = useStore((s) => s.content);
  const setContent = useStore((s) => s.setContent);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImageManager, setShowImageManager] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(true);
  const templateMenuRef = useRef<HTMLDivElement>(null);

  const lineCount = content.split("\n").length;
  const charCount = content.length;

  // 注册 textarea 到模块，供拖拽/粘贴后恢复光标
  useEffect(() => {
    setTextareaEl(textareaRef.current);
    return () => setTextareaEl(null);
  }, []);

  // 模板菜单：点击外部关闭
  useEffect(() => {
    if (!showTemplateMenu) return;
    const handler = (e: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
        setShowTemplateMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTemplateMenu]);

  // 加载模板：编辑器有内容则确认覆盖
  const handleLoadTemplate = (template: string) => {
    const current = useStore.getState().content;
    if (current.trim() !== "" && !confirm("编辑器中已有内容，是否用模板覆盖？")) {
      setShowTemplateMenu(false);
      return;
    }
    setContent(template);
    setShowTemplateMenu(false);
  };

  // 记录最近一次选区，供拖拽等非聚焦场景使用
  const recordSelection = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    setLastSelection({ start: ta.selectionStart, end: ta.selectionEnd });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Ctrl+Z 撤回
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }

    // Ctrl+Y 或 Ctrl+Shift+Z 反撤回
    if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
      e.preventDefault();
      redo();
      return;
    }

    // 回车键：单回车只换行，双回车才加 <br>
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // 检查光标前是否已经有换行（双回车情况）
      const beforeCursor = content.slice(0, start);
      const lastChar = beforeCursor.length > 0 ? beforeCursor[beforeCursor.length - 1] : "";

      if (lastChar === "\n") {
        // 双回车：替换上一个 \n 为 <br>\n\n，形成段落分割
        const newValue = content.slice(0, start - 1) + "<br>\n\n" + content.slice(end);
        setContent(newValue);
        const cursorPos = start + 5; // <br>\n\n 的长度比 \n 多 5
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(cursorPos, cursorPos);
        });
      } else {
        // 单回车：只插入 \n
        const newValue = content.slice(0, start) + "\n" + content.slice(end);
        setContent(newValue);
        const cursorPos = start + 1;
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(cursorPos, cursorPos);
        });
      }
      return;
    }

    handleMarkdownShortcut(e.nativeEvent, textarea, content, setContent);
  }, [content, setContent, undo, redo]);

  // 多图上传：走统一插入流程
  const handleInsertImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    recordSelection();
    await processImageFiles(files);
    e.target.value = "";
  };

  const triggerImageInsert = () => {
    fileInputRef.current?.click();
  };

  // 剪贴板粘贴图片：批量上传，走统一插入流程
  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === "file" && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) imageFiles.push(f);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      const ta = textareaRef.current;
      if (ta) setLastSelection({ start: ta.selectionStart, end: ta.selectionEnd });
      await processImageFiles(imageFiles);
    }
  }, []);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-ink">
          <FileText size={16} className="text-coral" />
          <span className="font-serif text-sm font-semibold">Markdown 编辑器</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" ref={templateMenuRef}>
            <button
              onClick={() => setShowTemplateMenu((v) => !v)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-cream hover:text-coral"
              title="加载模板"
            >
              <LayoutTemplate size={14} />
              模板
            </button>
            {showTemplateMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border border-border bg-card py-1 shadow-lg">
                <button
                  onClick={() => handleLoadTemplate(DEFAULT_CONTENT)}
                  className="block w-full px-3 py-1.5 text-left text-xs text-ink transition-colors hover:bg-cream"
                >
                  模板一 · 快速上手
                </button>
                <button
                  onClick={() => handleLoadTemplate(TEMPLATE_TWO)}
                  className="block w-full px-3 py-1.5 text-left text-xs text-ink transition-colors hover:bg-cream"
                >
                  模板二 · 标题框架
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowImageManager(true)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-cream hover:text-coral"
            title="图片资源管理"
          >
            <Images size={14} />
            图片资源
          </button>
          <button
            onClick={triggerImageInsert}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-cream hover:text-coral"
            title="插入图片（支持多选）"
          >
            <ImageIcon size={14} />
            插图
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleInsertImage}
            style={{ position: "absolute", width: 0, height: 0, opacity: 0, overflow: "hidden", pointerEvents: "none" }}
          />
        </div>
      </div>

      {/* 文本输入区：相对定位，承载悬浮字数统计 */}
      <div className="relative flex-1 min-h-0">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onSelect={recordSelection}
          onBlur={recordSelection}
          className="editor-textarea h-full w-full resize-none border-none bg-transparent px-4 py-3 text-sm leading-relaxed text-ink outline-none"
          placeholder="在这里输入 Markdown..."
          spellCheck={false}
        />
        {/* 悬浮字数统计：靠右靠下，透明底色 */}
        <div className="pointer-events-none absolute bottom-2 right-3 font-mono text-[11px] text-muted/70">
          {lineCount} 行 · {charCount} 字
        </div>
      </div>

      {/* 快捷键提示条 */}
      <div className="border-t border-border bg-cream/60 px-4 py-2">
        <button
          onClick={() => setShowShortcuts((v) => !v)}
          className="mb-1 flex items-center gap-1 text-[11px] font-medium text-ink transition-colors hover:text-coral"
          title={showShortcuts ? "收起快捷键" : "展开快捷键"}
        >
          {showShortcuts ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          快捷键
        </button>
        {showShortcuts && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {SHORTCUTS.map((s) => (
              <span key={s.keys} className="flex items-center gap-1 text-[10px] text-muted">
                <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-ink">
                  {s.keys}
                </kbd>
                {s.label}
              </span>
            ))}
            <span className="flex items-center gap-1 text-[10px] text-muted">
              <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-ink">
                Ctrl+Z
              </kbd>
              撤回
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted">
              <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-ink">
                Ctrl+Y
              </kbd>
              反撤回
            </span>
          </div>
        )}
      </div>

      {showImageManager && <ImageManager onClose={() => setShowImageManager(false)} />}
    </div>
  );
}
