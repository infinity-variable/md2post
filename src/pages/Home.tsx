import { useState, useCallback, useRef, useEffect } from "react";
import Editor from "@/components/Editor";
import Preview from "@/components/Preview";
import SettingsPanel from "@/components/SettingsPanel";
import Toolbar from "@/components/Toolbar";
import { useDebounced } from "@/hooks/useDebounced";
import { usePagination } from "@/hooks/usePagination";
import { useStore } from "@/store";
import { saveImageToStore } from "@/lib/imageStore";

const DEFAULT_LEFT_WIDTH = 360;
const DEFAULT_RIGHT_WIDTH = 280;
const MIN_PANEL_WIDTH = 220;
const MAX_LEFT_WIDTH = 600;
const MAX_RIGHT_WIDTH = 400;

export default function Home() {
  const content = useStore((s) => s.content);
  const settings = useStore((s) => s.settings);
  const loadImages = useStore((s) => s.loadImages);

  // 启动时从 IndexedDB 加载图片，并预加载默认图片（如果需要）
  useEffect(() => {
    const initImages = async () => {
      await loadImages();
      // 检查默认图片是否已存在，不存在则从 public 目录加载
      // 使用 import.meta.env.BASE_URL 前缀，确保在子路径部署（如 GitHub Pages /md2post/）下也能正确加载
      const images = useStore.getState().images;
      const base = import.meta.env.BASE_URL;
      const defaultImages: Record<string, string> = {
        img_cat_qavr: `${base}default-cat.png`,
        "img_插图_7j65": `${base}default-insert.png`,
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
            // 更新内存中的 images
            useStore.setState((state) => ({
              images: { ...state.images, [ref]: dataUrl },
            }));
          } catch (err) {
            console.error(`预加载默认图片 ${ref} 失败:`, err);
          }
        }
      }
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

  const draggingRef = useRef<"left" | "right" | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // 对内容防抖 120ms，避免频繁输入时重复计算分页，同时保持实时感
  const debouncedContent = useDebounced(content, 120);
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

  return (
    <div className="flex h-full flex-col"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <Toolbar pages={pages} settings={settings} />
      <div className="flex min-h-0 flex-1">
        {/* 左侧编辑器 */}
        <aside style={{ width: leftWidth }} className="shrink-0 border-r border-border overflow-hidden">
          <Editor />
        </aside>

        {/* 左侧拖拽分割条 */}
        <div
          className={`resize-handle${draggingRef.current === "left" ? " active" : ""}`}
          onMouseDown={handleMouseDown("left")}
        />

        {/* 中间预览区 */}
        <main className="flex min-w-0 flex-1 flex-col bg-cream">
          <Preview pages={pages} settings={settings} />
        </main>

        {/* 右侧拖拽分割条 */}
        <div
          className={`resize-handle${draggingRef.current === "right" ? " active" : ""}`}
          onMouseDown={handleMouseDown("right")}
        />

        {/* 右侧设置面板 */}
        <aside style={{ width: rightWidth }} className="shrink-0 border-l border-border overflow-hidden">
          <SettingsPanel />
        </aside>
      </div>
    </div>
  );
}
