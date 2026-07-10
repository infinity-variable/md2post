import { useState, useCallback, useRef, useEffect } from "react";
import Editor from "@/components/Editor";
import Preview from "@/components/Preview";
import SettingsPanel from "@/components/SettingsPanel";
import Toolbar from "@/components/Toolbar";
import { useDebounced } from "@/hooks/useDebounced";
import { usePagination } from "@/hooks/usePagination";
import { useStore } from "@/store";
import { saveImageToStore } from "@/lib/imageStore";
import { processImageFiles } from "@/lib/imageInsert";
import { PanelLeftOpen, PanelRightOpen } from "lucide-react";

const DEFAULT_LEFT_WIDTH = 360;
const DEFAULT_RIGHT_WIDTH = 280;
const MIN_PANEL_WIDTH = 220;
const MAX_LEFT_WIDTH = 600;
const MAX_RIGHT_WIDTH = 400;

/** 判断是否为可导入的文本文件（.md/.markdown/.txt） */
function isTextFile(f: File): boolean {
  const name = f.name.toLowerCase();
  if (name.endsWith(".md") || name.endsWith(".markdown") || name.endsWith(".txt")) return true;
  const t = f.type;
  if (t === "text/markdown" || t === "text/plain") return true;
  return false;
}

export default function Home() {
  const content = useStore((s) => s.content);
  const settings = useStore((s) => s.settings);
  const loadImages = useStore((s) => s.loadImages);
  const setContent = useStore((s) => s.setContent);
  const [imagesReady, setImagesReady] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  // 启动时从 IndexedDB 加载图片，并预加载默认图片（如果需要）
  // 完成后才标记 imagesReady=true，避免首次渲染时 images 为空导致 404
  useEffect(() => {
    const initImages = async () => {
      await loadImages();
      const images = useStore.getState().images;
      const base = import.meta.env.BASE_URL;
      const defaultImages: Record<string, string> = {
        img_cat_qavr: `${base}default-cat.png`,
        img_insert_kk8n: `${base}default-insert.png`,
      };
      for (const [ref, url] of Object.entries(defaultImages)) {
        if (!images[ref]) {
          try {
            const resp = await fetch(url);
            const blob = await resp.blob();
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            await saveImageToStore(ref, dataUrl);
            useStore.setState((state) => ({
              images: { ...state.images, [ref]: dataUrl },
            }));
          } catch (err) {
            console.error(`预加载默认图片 ${ref} 失败:`, err);
          }
        }
      }
      setImagesReady(true);
    };
    initImages();
  }, [loadImages]);

  // 可拖拽的左右面板宽度
  const [leftWidth, setLeftWidth] = useState(() => {
    try {
      return Number(localStorage.getItem("md2post-left-width")) || DEFAULT_LEFT_WIDTH;
    } catch {
      return DEFAULT_LEFT_WIDTH;
    }
  });
  const [rightWidth, setRightWidth] = useState(() => {
    try {
      return Number(localStorage.getItem("md2post-right-width")) || DEFAULT_RIGHT_WIDTH;
    } catch {
      return DEFAULT_RIGHT_WIDTH;
    }
  });

  // 面板收起状态
  const [editorCollapsed, setEditorCollapsed] = useState(() => {
    try {
      return localStorage.getItem("md2post-editor-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [settingsCollapsed, setSettingsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("md2post-settings-collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleEditor = useCallback(() => {
    setEditorCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("md2post-editor-collapsed", String(next)); } catch {}
      return next;
    });
  }, []);

  const toggleSettings = useCallback(() => {
    setSettingsCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("md2post-settings-collapsed", String(next)); } catch {}
      return next;
    });
  }, []);

  const draggingRef = useRef<"left" | "right" | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // 对内容防抖 120ms，避免频繁输入时重复计算分页，同时保持实时感
  // 图片未就绪时传空内容，避免 @ref 找不到映射而产生 404
  const debouncedContent = useDebounced(imagesReady ? content : "", 120);
  const pages = usePagination(debouncedContent, settings);

  const handleMouseDown = useCallback((side: "left" | "right") => (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = side;
    startXRef.current = e.clientX;
    startWidthRef.current = side === "left" ? leftWidth : rightWidth;
    document.body.classList.add("select-none");
    document.body.classList.add("cursor-col-resize");
  }, [leftWidth, rightWidth]);

  // 全局鼠标移动和松开事件
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    const delta = e.clientX - startXRef.current;
    if (draggingRef.current === "left") {
      const newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_LEFT_WIDTH, startWidthRef.current + delta));
      setLeftWidth(newWidth);
      try { localStorage.setItem("md2post-left-width", String(newWidth)); } catch {}
    } else if (draggingRef.current === "right") {
      const newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_RIGHT_WIDTH, startWidthRef.current - delta));
      setRightWidth(newWidth);
      try { localStorage.setItem("md2post-right-width", String(newWidth)); } catch {}
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    draggingRef.current = null;
    document.body.classList.remove("select-none");
    document.body.classList.remove("cursor-col-resize");
  }, []);

  /* ── 全局拖拽：文本 / 图片 ── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length === 0) return;

    const textFiles: File[] = [];
    const imageFiles: File[] = [];
    const unsupported: string[] = [];
    for (const f of files) {
      if (isTextFile(f)) textFiles.push(f);
      else if (f.type.startsWith("image/")) imageFiles.push(f);
      else unsupported.push(f.name);
    }

    if (unsupported.length > 0) {
      alert(`不支持的文件类型：\n${unsupported.join("\n")}\n\n仅支持 .md / .txt 文本和图片文件。`);
      return;
    }

    // 文本：编辑器空白则直接写入，否则确认覆盖
    if (textFiles.length > 0) {
      const texts: string[] = [];
      for (const f of textFiles) {
        try { texts.push(await f.text()); } catch { /* 忽略读取失败 */ }
      }
      const text = texts.join("\n\n");
      const current = useStore.getState().content;
      if (current.trim() === "") {
        setContent(text);
      } else if (confirm("编辑器中已有内容，是否用拖入的文本覆盖？")) {
        setContent(text);
      }
    }

    // 图片：走统一插入流程（占位符 → 选区 → 光标行 → 文末）
    if (imageFiles.length > 0) {
      await processImageFiles(imageFiles);
    }
  }, [setContent]);

  return (
    <div className="flex h-full flex-col"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Toolbar pages={pages} />
      <div className="flex min-h-0 flex-1">
        {/* 左侧编辑器 */}
        {editorCollapsed ? (
          <button
            onClick={toggleEditor}
            className="flex w-7 shrink-0 flex-col items-center justify-center border-r border-border bg-card py-3 text-muted transition-colors hover:bg-cream hover:text-burgundy"
            title="展开编辑器"
          >
            <PanelLeftOpen size={16} />
          </button>
        ) : (
          <aside
            style={settingsCollapsed ? { flex: "1 1 0%" } : { width: leftWidth }}
            className={settingsCollapsed ? "min-w-0 border-r border-border overflow-hidden" : "shrink-0 border-r border-border overflow-hidden"}
          >
            <Editor onCollapse={toggleEditor} />
          </aside>
        )}

        {/* 左侧拖拽分割条：编辑器和样式都展开时才显示 */}
        {!editorCollapsed && !settingsCollapsed && (
          <div
            className={`resize-handle${draggingRef.current === "left" ? " active" : ""}`}
            onMouseDown={handleMouseDown("left")}
          />
        )}

        {/* 中间预览区 */}
        <main className="flex min-w-0 flex-1 flex-col bg-cream">
          <Preview pages={pages} settings={settings} />
        </main>

        {/* 右侧拖拽分割条：样式展开时才显示 */}
        {!settingsCollapsed && (
          <div
            className={`resize-handle${draggingRef.current === "right" ? " active" : ""}`}
            onMouseDown={handleMouseDown("right")}
          />
        )}

        {/* 右侧设置面板 */}
        {settingsCollapsed ? (
          <button
            onClick={toggleSettings}
            className="flex w-7 shrink-0 flex-col items-center justify-center border-l border-border bg-card py-3 text-muted transition-colors hover:bg-cream hover:text-burgundy"
            title="展开样式"
          >
            <PanelRightOpen size={16} />
          </button>
        ) : (
          <aside style={{ width: rightWidth }} className="shrink-0 border-l border-border overflow-hidden">
            <SettingsPanel onCollapse={toggleSettings} />
          </aside>
        )}
      </div>

      {isDragOver && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-burgundy/10">
          <div className="rounded-xl border-2 border-dashed border-burgundy bg-card/90 px-8 py-6 text-center shadow-lg">
            <div className="font-serif text-base font-semibold text-burgundy">松开以插入</div>
            <div className="mt-1 text-xs text-muted">文本 / 图片</div>
          </div>
        </div>
      )}
    </div>
  );
}
