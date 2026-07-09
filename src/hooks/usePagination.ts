import { useEffect, useState, useRef } from "react";
import type { Page, Settings } from "@/types";
import { renderBlocks } from "@/lib/markdown";
import { paginateBlocks } from "@/lib/paginator";
import { useStore } from "@/store";

/**
 * 根据内容和设置计算分页结果（异步版本）
 * 等待图片加载完成后再测量高度，避免图片高度为 0 导致分页不准
 */
export function usePagination(content: string, settings: Settings): Page[] {
  const [pages, setPages] = useState<Page[]>([{ index: 1, html: "" }]);
  const images = useStore((s) => s.images);
  // 使用递增 ID 追踪最新的分页请求，避免旧的异步结果覆盖新的
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!content.trim()) {
      setPages([{ index: 1, html: "" }]);
      return;
    }

    const currentId = ++requestIdRef.current;

    (async () => {
      try {
        const blocks = renderBlocks(content, images);
        const result = await paginateBlocks(blocks, settings);
        // 只有当前请求仍是最新的才更新状态
        if (currentId === requestIdRef.current) {
          setPages(result.length > 0 ? result : [{ index: 1, html: "" }]);
        }
      } catch (err) {
        console.error("分页失败:", err);
        if (currentId === requestIdRef.current) {
          setPages([{ index: 1, html: "" }]);
        }
      }
    })();
  }, [content, settings, images]);

  return pages;
}
