import { useStore } from "@/store";
import { exportPagesAsZip } from "@/lib/exporter";
import type { Page, Settings } from "@/types";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

interface ToolbarProps {
  pages: Page[];
  settings: Settings;
}

export default function Toolbar({ pages, settings }: ToolbarProps) {
  const isExporting = useStore((s) => s.isExporting);
  const setIsExporting = useStore((s) => s.setIsExporting);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const handleExportAll = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setProgress({ current: 0, total: pages.length });
    try {
      await exportPagesAsZip(pages, settings, (current, total) => {
        setProgress({ current, total });
      });
    } catch (err) {
      console.error("导出失败:", err);
      const msg = err instanceof Error && err.message.includes("超时")
        ? "导出超时，请尝试减少内容或刷新页面后重试"
        : "导出失败，请重试";
      alert(msg);
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-5">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral text-white shadow-sm">
          <svg width="16" height="16" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M31 21L35 18L44 24V34L34 40L24 34V13L13 7L4 13V24L13 30L17 27" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h1 className="font-serif text-base font-bold leading-tight text-ink">MD2Post</h1>
          <p className="text-[10px] leading-tight text-muted">Markdown 转小红书图文</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 rounded-full bg-cream px-3 py-1">
          <span className="font-mono text-xs text-ink">{pages.length}</span>
          <span className="text-xs text-muted">页</span>
        </div>

        <button
          onClick={handleExportAll}
          disabled={isExporting || pages.length === 0}
          className="flex items-center gap-2 rounded-lg bg-coral px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-coralDark hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExporting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {progress ? `导出中 ${progress.current}/${progress.total}` : "导出中..."}
            </>
          ) : (
            <>
              <Download size={14} />
              导出全部 PNG
            </>
          )}
        </button>
      </div>
    </header>
  );
}
