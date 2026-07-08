import { useRef, useCallback } from "react";
import { useStore } from "@/store";
import { handleMarkdownShortcut, SHORTCUTS } from "@/lib/markdownShortcuts";
import { FileText, ImageIcon } from "lucide-react";

function generateImageRef(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").slice(0, 20);
  const rand = Math.random().toString(36).slice(2, 6);
  return `img_${base}_${rand}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}

export default function Editor() {
  const content = useStore((s) => s.content);
  const setContent = useStore((s) => s.setContent);
  const addImage = useStore((s) => s.addImage);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lineCount = content.split("\n").length;
  const charCount = content.length;

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

  const handleInsertImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    try {
      const base64 = await fileToBase64(file);
      const ref = generateImageRef(file.name);
      addImage(ref, base64);

      // 获取图片实际尺寸
      const dims = await getImageDimensions(base64);
      const innerWidth = useStore.getState().settings.width - useStore.getState().settings.padding * 2;
      // 如果图片宽度小于页宽则用图片原始宽度，否则用页宽
      const displayWidth = dims.width > 0 && dims.width < innerWidth ? dims.width : innerWidth;

      const start = textarea.selectionStart;
      const insertText = `![${file.name}|${displayWidth}](@${ref})`;
      const newValue = content.slice(0, start) + insertText + content.slice(start);
      setContent(newValue);
      const cursorPos = start + insertText.length;
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorPos, cursorPos);
      });
    } catch (err) {
      console.error("插入图片失败:", err);
    }
    e.target.value = "";
  };

  const triggerImageInsert = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-ink">
          <FileText size={16} className="text-coral" />
          <span className="font-serif text-sm font-semibold">Markdown 编辑器</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={triggerImageInsert}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-cream hover:text-coral"
            title="插入图片"
          >
            <ImageIcon size={14} />
            插图
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInsertImage}
            style={{ position: "absolute", width: 0, height: 0, opacity: 0, overflow: "hidden", pointerEvents: "none" }}
          />
          <div className="font-mono text-xs text-muted">
            {lineCount} 行 · {charCount} 字
          </div>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="editor-textarea flex-1 resize-none border-none bg-transparent px-4 py-3 text-sm leading-relaxed text-ink outline-none"
        placeholder="在这里输入 Markdown..."
        spellCheck={false}
      />

      {/* 快捷键提示条 */}
      <div className="border-t border-border bg-cream/60 px-4 py-2">
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
      </div>
    </div>
  );
}
