import { useState, useRef, useCallback, useEffect } from "react";
import type { Page, Settings } from "@/types";
import PageCard from "./PageCard";
import { exportSinglePage, exportPagesAsZip } from "@/lib/exporter";
import { useStore } from "@/store";
import { Loader2 } from "lucide-react";

interface PreviewProps {
  pages: Page[];
  settings: Settings;
}

export default function Preview({ pages, settings }: PreviewProps) {
  const [exportingIndex, setExportingIndex] = useState<number | null>(null);
  const setContent = useStore((s) => s.setContent);
  const content = useStore((s) => s.content);
  const images = useStore((s) => s.images);
  const isExporting = useStore((s) => s.isExporting);
  const setIsExporting = useStore((s) => s.setIsExporting);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  // 存储每个 PageCard 的 DOM ref
  const pageRefs = useRef<Map<number, HTMLElement>>(new Map());

  // 监听 store 中的导出请求
  const exportRequest = useStore((s) => s.exportRequest);

  const setRefForPage = useCallback((pageIndex: number, node: HTMLDivElement | null) => {
    if (node) {
      pageRefs.current.set(pageIndex, node);
    } else {
      pageRefs.current.delete(pageIndex);
    }
  }, []);

  // 当 exportRequest 变化时触发导出全部
  useEffect(() => {
    if (exportRequest === 0) return;
    handleExportAll();
  }, [exportRequest]);

  const handleExportSingle = async (page: Page, node: HTMLElement) => {
    if (exportingIndex !== null) return;
    setExportingIndex(page.index);
    try {
      await exportSinglePage(node, settings, page.index);
    } catch (err) {
      console.error("导出失败:", err);
      alert("导出失败，请重试");
    } finally {
      setExportingIndex(null);
    }
  };

  const handleExportAll = async () => {
    if (isExporting) return;
    // 按页码顺序收集 DOM 节点
    const nodes = pages
      .map(p => pageRefs.current.get(p.index))
      .filter((n): n is HTMLElement => n != null);

    if (nodes.length !== pages.length) {
      alert("部分页面尚未渲染，请稍后重试");
      return;
    }

    setIsExporting(true);
    setProgress({ current: 0, total: pages.length });
    try {
      await exportPagesAsZip(nodes, settings, (current, total) => {
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

  /**
   * 点击图片调整后，更新 markdown 源码中对应图片的宽度和 edge 标记
   * data-src 保存原始引用（@ref 或 URL），用于匹配更新
   */
  const handleImageWidthChange = (src: string, newWidth: number, edge: boolean, center: boolean) => {
    const suffix = edge ? `|${newWidth}|edge` : center ? `|${newWidth}|center` : `|${newWidth}`;

    // 如果 src 是 @ref 格式，直接匹配替换
    if (src.startsWith("@")) {
      const refName = src.slice(1);
      // 使用更宽松的 regex，匹配任何 ![...](@ref) 格式
      // [^\]]* 会贪婪匹配直到第一个 ]
      const escapedRef = refName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const imgRegex = new RegExp(
        `!\\[[^\\]]*\\]\\(@${escapedRef}\\)`,
        "g"
      );

      let matchCount = 0;
      const newContent = content.replace(imgRegex, (match) => {
        matchCount++;
        // 从原始匹配中提取 alt（去掉 |width|edge 部分）
        // regex: ![alt|width|edge] -> 提取 alt
        // 字符类中 ] 必须放在开头才表示字符 ]（否则表示结束）
        // [^]|\\]* 匹配不是 ] 或 | 或 \ 的字符（即纯 alt 文本）
        // (?:\|[^\]]*)? 匹配可选的 |width 或 |width|edge 部分
        const altMatch = match.match(/!\[([^]|\\]*)(?:\|[^\]]*)?\]/);
        const alt = altMatch ? altMatch[1] : "";
        return `![${alt}${suffix}](@${refName})`;
      });

      if (matchCount > 0) {
        setContent(newContent);
        return;
      }
    }

    // 对于普通 URL（base64），使用前缀匹配
    const srcPrefix = src.slice(0, 100);
    const imgRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
    let newContent = content;
    let changed = false;

    newContent = newContent.replace(imgRegex, (match, url: string) => {
      // 比较 URL（base64 可能很长，用前缀匹配）
      if (url === src || url.startsWith(srcPrefix) || src.startsWith(url.slice(0, 100))) {
        changed = true;
        // 提取 alt（去掉 |width|edge 部分）
        // [^]|\\]* 匹配不是 ] 或 | 或 \ 的字符
        const altMatch = match.match(/!\[([^]|\\]*)(?:\|[^\]]*)?\]/);
        const alt = altMatch ? altMatch[1] : "";
        return `![${alt}${suffix}](${url})`;
      }
      return match;
    });

    if (changed) setContent(newContent);
  };

  if (pages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted">
        <div className="text-center">
          <Loader2 className="mx-auto mb-2 animate-spin text-coral" size={24} />
          <p className="text-sm">渲染中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="flex flex-col items-center gap-8">
        {pages.map((page) => (
          <PageCard
            key={page.index}
            ref={(node) => setRefForPage(page.index, node)}
            page={page}
            settings={settings}
            total={pages.length}
            onExportSingle={exportingIndex === null ? handleExportSingle : undefined}
            onImageWidthChange={handleImageWidthChange}
          />
        ))}
      </div>
    </div>
  );
}
