import { useState, useEffect, useMemo } from "react";
import { useStore } from "@/store";
import { Trash2, X, AlertTriangle } from "lucide-react";
import {
  getStorageInfo,
  calcImagesSize,
  formatBytes,
} from "@/lib/imageInsert";

interface ImageManagerProps {
  onClose: () => void;
}

export default function ImageManager({ onClose }: ImageManagerProps) {
  const images = useStore((s) => s.images);
  const content = useStore((s) => s.content);
  const cleanupImages = useStore((s) => s.cleanupImages);
  const deleteImages = useStore((s) => s.deleteImages);

  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number }>({ usage: 0, quota: 0 });
  const [cleaning, setCleaning] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // images 变化时重新计算浏览器存储用量
  useEffect(() => {
    getStorageInfo().then(setStorageInfo).catch(() => {});
  }, [images]);

  // 当前内容中引用的 ref 集合
  const usedRefs = useMemo(() => {
    const refs = new Set<string>();
    const re = /!\[[^\]]*\]\(@([^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) refs.add(m[1]);
    return refs;
  }, [content]);

  const entries = useMemo(() => Object.entries(images), [images]);
  const imagesSize = useMemo(() => calcImagesSize(images), [images]);
  const unusedCount = entries.filter(([ref]) => !usedRefs.has(ref)).length;
  const overQuota = storageInfo.quota > 0 && storageInfo.usage / storageInfo.quota > 0.9;

  // 图片被清理/删除后，同步移除已不存在的选中项
  useEffect(() => {
    setSelected((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const ref of prev) {
        if (images[ref]) next.add(ref);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [images]);

  const toggleSelect = (ref: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  };

  const handleCleanup = async () => {
    setCleaning(true);
    const count = await cleanupImages();
    setCleaning(false);
    if (count > 0) {
      alert(`已清理 ${count} 张未使用的图片`);
    } else {
      alert("没有需要清理的图片");
    }
  };

  const handleDeleteSelected = async () => {
    const refs = [...selected];
    if (refs.length === 0) return;
    const usedSelected = refs.filter((r) => usedRefs.has(r));
    if (usedSelected.length > 0) {
      if (!confirm(`选中的 ${refs.length} 张图片中有 ${usedSelected.length} 张正在使用，删除后对应位置将无法显示，确定删除？`)) {
        return;
      }
    }
    await deleteImages(refs);
    setSelected(new Set());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-[520px] flex-col rounded-lg border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-ink">
            <span className="font-serif text-sm font-semibold">图片资源</span>
            <span className="font-mono text-[11px] text-muted">
              {entries.length} 张 · {formatBytes(imagesSize)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDeleteSelected}
              disabled={selected.size === 0}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-cream hover:text-coral disabled:cursor-not-allowed disabled:opacity-50"
              title="删除选中的图片"
            >
              <Trash2 size={12} />
              删除选中{selected.size > 0 ? `(${selected.size})` : ""}
            </button>
            <button
              onClick={handleCleanup}
              disabled={cleaning || unusedCount === 0}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-cream hover:text-coral disabled:cursor-not-allowed disabled:opacity-50"
              title="清理未引用的图片"
            >
              <Trash2 size={12} />
              清理未使用{unusedCount > 0 ? `(${unusedCount})` : ""}
            </button>
            <button
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-cream hover:text-ink"
              title="关闭"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* 限额提醒 */}
        {storageInfo.quota > 0 && (
          <div className="border-b border-border px-4 py-2">
            {overQuota ? (
              <div className="flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1.5 text-[11px] text-red-600">
                <AlertTriangle size={12} className="shrink-0" />
                <span>
                  浏览器存储已接近上限（{formatBytes(storageInfo.usage)} / {formatBytes(storageInfo.quota)}），建议清理
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[10px] text-muted">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream">
                  <div
                    className="h-full rounded-full bg-coral transition-all"
                    style={{ width: `${Math.min(100, (storageInfo.usage / storageInfo.quota) * 100)}%` }}
                  />
                </div>
                <span className="font-mono">
                  {formatBytes(storageInfo.usage)} / {formatBytes(storageInfo.quota)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 图片网格 */}
        <div className="flex-1 overflow-y-auto p-3">
          {entries.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-xs text-muted">
              暂无图片，拖拽 / 粘贴 / 点击插图以上传
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {entries.map(([ref, dataUrl]) => {
                const used = usedRefs.has(ref);
                const isSel = selected.has(ref);
                return (
                  <div
                    key={ref}
                    onClick={() => toggleSelect(ref)}
                    className={
                      "group relative cursor-pointer overflow-hidden rounded-md border bg-cream transition-all " +
                      (isSel ? "border-coral ring-1 ring-coral" : "border-border hover:border-coral/40")
                    }
                    title={ref}
                  >
                    <div className="flex aspect-square items-center justify-center">
                      <img
                        src={dataUrl}
                        alt={ref}
                        className="max-h-full max-w-full object-contain"
                        draggable={false}
                      />
                    </div>
                    <div className="truncate px-1.5 py-1 text-[9px] text-muted" title={ref}>
                      {ref}
                    </div>
                    <span
                      className={
                        "absolute right-1 top-1 rounded px-1 py-0.5 text-[8px] " +
                        (used ? "bg-green-100 text-green-700" : "bg-cream text-muted")
                      }
                    >
                      {used ? "使用中" : "未使用"}
                    </span>
                    {/* 选中复选框 */}
                    <span
                      className={
                        "absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded border text-[8px] " +
                        (isSel ? "border-coral bg-coral text-white" : "border-border bg-card/80 text-transparent")
                      }
                    >
                      ✓
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selected.size > 0 && (
          <div className="border-t border-border px-4 py-2 text-[10px] text-muted">
            已选中 {selected.size} 张，点击空白处或图片切换选中
          </div>
        )}
      </div>
    </div>
  );
}
