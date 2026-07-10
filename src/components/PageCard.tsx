import { type CSSProperties, useState, useCallback, forwardRef } from "react";
import type { Page, Settings } from "@/types";
import { FONT_OPTIONS } from "@/types";
import { Download } from "lucide-react";

interface PageCardProps {
  page: Page;
  settings: Settings;
  total: number;
  onExportSingle?: (page: Page, node: HTMLElement) => void;
  onImageWidthChange?: (src: string, width: number, edge: boolean, center: boolean) => void;
}

const PageCard = forwardRef<HTMLDivElement, PageCardProps>(({ page, settings, total, onExportSingle, onImageWidthChange }, ref) => {
  const innerWidth = settings.width - settings.padding * 2;
  const innerHeight = settings.height - settings.padding * 2;

  // 检测页面是否有突破页边距的图片，如果有则添加 allow-edge class
  const hasEdgeImage = page.html.includes("img-edge");

  const [editingImg, setEditingImg] = useState<{
    src: string;
    width: number;
    edge: boolean;
    center: boolean;
    rect: DOMRect;
  } | null>(null);

  const handleImgClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== "IMG") return;
    const img = target as HTMLImageElement;
    const currentWidth = parseInt(img.dataset.width || "0") || img.clientWidth;
    const isEdge = img.dataset.edge === "1";
    const isCenter = img.dataset.center === "1";
    const rect = img.getBoundingClientRect();
    // 使用 data-src（原始引用 @ref 或 URL）而非 img.src（浏览器解析后的 URL）
    const src = img.dataset.src || img.src;
    setEditingImg({
      src,
      width: currentWidth,
      edge: isEdge,
      center: isCenter,
      rect,
    });
  }, []);

  const handleWidthConfirm = () => {
    if (editingImg && onImageWidthChange) {
      onImageWidthChange(editingImg.src, editingImg.width, editingImg.edge, editingImg.center);
    }
    setEditingImg(null);
  };

  const handleWidthCancel = () => {
    setEditingImg(null);
  };

  const pageStyle: CSSProperties = {
    width: settings.width,
    height: settings.height,
    padding: settings.padding,
    background: settings.bgColor,
    boxSizing: "border-box",
    // 有突破页边距图片时，允许横向溢出（但保持纵向裁剪）
    overflowX: hasEdgeImage ? "visible" : "hidden",
    overflowY: "hidden",
    position: "relative",
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)",
    borderRadius: 4,
  };

  const contentStyle: CSSProperties = {
    width: innerWidth,
    height: innerHeight,
    // 有突破页边距图片时，不裁剪溢出内容（CSS clip-path 会处理裁剪）
    overflow: hasEdgeImage ? "visible" : "hidden",
  };

  const cssVars = {
    "--font-size": `${settings.fontSize}px`,
    "--line-height": String(settings.lineHeight),
    "--paragraph-spacing": `${settings.paragraphSpacing}px`,
    "--letter-spacing": `${settings.letterSpacing}px`,
    "--h1-font-size": `${settings.h1FontSize}px`,
    "--h2-font-size": `${settings.h2FontSize}px`,
    "--h3-font-size": `${settings.h3FontSize}px`,
    "--page-padding": `${settings.padding}px`,
    "--font-family": (FONT_OPTIONS[settings.fontFamily] ?? FONT_OPTIONS.sans).value,
    "--font-weight": String((FONT_OPTIONS[settings.fontFamily] ?? FONT_OPTIONS.sans).weight),
    "--text-color": settings.textColor,
    "--secondary-color": settings.secondaryColor ?? "#929292",
    "--heading-color": settings.headingColor ?? settings.textColor,
    "--bg-color": settings.bgColor,
    "--underline-color": settings.underlineColor,
    "--highlight-color": settings.highlightColor,
    "--code-color": settings.codeColor ?? "#C0392B",
    "--code-bg-color": settings.codeBgColor ?? "#F0EDE5",
  } as CSSProperties;

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={ref} style={pageStyle} className="page-card">
        <div
          className={`page-content${hasEdgeImage ? " allow-edge" : ""}`}
          style={{ ...contentStyle, ...cssVars }}
          dangerouslySetInnerHTML={{ __html: page.html }}
          onClick={handleImgClick}
        />
        {/* 辅助线（仅第一页、3:5尺寸、开关打开时显示） */}
        {page.index === 1 && settings.sizePreset === "3:5" && settings.showGuideLines && (
          <>
            {/* 顶部辅助线：距离顶部 73px */}
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: 73,
                height: 1,
                background: `repeating-linear-gradient(90deg, var(--color-burgundy) 0, var(--color-burgundy) 4px, transparent 4px, transparent 8px)`,
              }}
            />
            {/* 底部辅助线：距离底部 73px */}
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                bottom: 73,
                height: 1,
                background: `repeating-linear-gradient(90deg, var(--color-burgundy) 0, var(--color-burgundy) 4px, transparent 4px, transparent 8px)`,
              }}
            />
          </>
        )}
      </div>
      <div className="flex items-center justify-between" style={{ width: settings.width }}>
        <span className="font-mono text-xs text-muted">
          {page.index} / {total}
        </span>
        {onExportSingle && (
          <button
            onClick={(e) => {
              const pageCardEl = (e.currentTarget.closest('.flex.flex-col.items-center') as HTMLElement)
                ?.querySelector('.page-card') as HTMLElement;
              if (pageCardEl) onExportSingle(page, pageCardEl);
            }}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-cream hover:text-burgundy"
            title="导出此页"
          >
            <Download size={12} />
            导出
          </button>
        )}
      </div>

      {/* 图片宽度调整弹出层 */}
      {editingImg && (
        <div
          className="fixed inset-0 z-50"
          onClick={handleWidthCancel}
        >
          <div
            className="absolute rounded-lg border border-border bg-card p-3 shadow-xl"
            style={{
              left: Math.min(editingImg.rect.left + editingImg.rect.width / 2 - 120, window.innerWidth - 260),
              top: editingImg.rect.bottom + 8,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 text-xs font-medium text-ink">调整图片</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingImg((prev) => prev ? { ...prev, width: Math.max(20, prev.width - 20) } : null)}
                className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted hover:border-burgundy/40 hover:text-burgundy"
              >-20</button>
              <input
                type="text"
                inputMode="numeric"
                value={editingImg.width}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v) && v > 0)
                    setEditingImg((prev) => prev ? { ...prev, width: v } : null);
                }}
                className="h-7 w-16 rounded border border-border bg-card px-2 text-center font-mono text-xs text-ink outline-none focus:border-burgundy"
              />
              <span className="text-[10px] text-muted">px</span>
              <button
                onClick={() => setEditingImg((prev) => prev ? { ...prev, width: Math.min(settings.width, prev.width + 20) } : null)}
                className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted hover:border-burgundy/40 hover:text-burgundy"
              >+20</button>
            </div>
            <label className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
              <input
                type="checkbox"
                checked={editingImg.edge}
                onChange={(e) => setEditingImg((prev) => prev ? { ...prev, edge: e.target.checked, center: false } : null)}
                className="h-3 w-3 accent-burgundy"
              />
              突破页边距（铺满页面宽度）
            </label>
            <label className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
              <input
                type="checkbox"
                checked={editingImg.center}
                onChange={(e) => setEditingImg((prev) => prev ? { ...prev, center: e.target.checked, edge: false } : null)}
                className="h-3 w-3 accent-burgundy"
              />
              居中（保留页边距水平居中）
            </label>
            <div className="mt-2 flex justify-end gap-2">
              <button onClick={handleWidthCancel} className="rounded-md px-3 py-1 text-xs text-muted hover:bg-cream">取消</button>
              <button onClick={handleWidthConfirm} className="rounded-md bg-burgundy px-3 py-1 text-xs text-white hover:bg-ancora">确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

PageCard.displayName = "PageCard";

export default PageCard;
