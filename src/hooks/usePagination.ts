import { useEffect, useState } from "react";
import type { Page, Settings } from "@/types";
import { renderBlocks } from "@/lib/markdown";
import { paginateBlocks } from "@/lib/paginator";
import { useStore } from "@/store";

/**
 * 根据内容和设置计算分页结果
 */
export function usePagination(content: string, settings: Settings): Page[] {
  const [pages, setPages] = useState<Page[]>([{ index: 1, html: "" }]);
  const images = useStore((s) => s.images);

  useEffect(() => {
    if (!content.trim()) {
      setPages([{ index: 1, html: "" }]);
      return;
    }
    try {
      const blocks = renderBlocks(content, images);
      const result = paginateBlocks(blocks, settings);
      setPages(result.length > 0 ? result : [{ index: 1, html: "" }]);
    } catch (err) {
      console.error("分页失败:", err);
      setPages([{ index: 1, html: "" }]);
    }
  }, [content, settings, images]);

  return pages;
}
