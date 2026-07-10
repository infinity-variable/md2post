import { useStore } from "@/store";
import type { Page } from "@/types";
import { Download, Loader2, Upload } from "lucide-react";

const APP_VERSION = __APP_VERSION__;

interface ToolbarProps {
  pages: Page[];
}

export default function Toolbar({ pages }: ToolbarProps) {
  const isExporting = useStore((s) => s.isExporting);
  const setIsExporting = useStore((s) => s.setIsExporting);
  const requestExport = useStore((s) => s.requestExport);

  const handleExportAll = () => {
    if (isExporting) return;
    requestExport();
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-5">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-burgundy text-white shadow-sm">
          <svg width="16" height="16" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M31 21L35 18L44 24V34L34 40L24 34V13L13 7L4 13V24L13 30L17 27" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h1 className="font-serif text-base font-bold leading-tight text-ink">MD2Post</h1>
          <p className="text-[10px] leading-tight text-muted">Markdown 转小红书图文 · v{APP_VERSION}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 rounded-full bg-cream px-3 py-1">
          <span className="font-mono text-xs text-ink">{pages.length}</span>
          <span className="text-xs text-muted">页</span>
        </div>

        <a
          href="https://creator.xiaohongshu.com/publish/publish?from=tab_switch&target=image"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-ink shadow-sm transition-all hover:bg-cream hover:shadow-md"
        >
          <Upload size={14} />
          上传小红书
        </a>

        <button
          onClick={handleExportAll}
          disabled={isExporting || pages.length === 0}
          className="flex items-center gap-2 rounded-lg bg-burgundy px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-ancora hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExporting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              导出中...
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
