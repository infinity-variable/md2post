/**
 * 图片插入统一逻辑
 * 插入位置优先级：
 *   1. 文本占位符：文中存在 `[图片名]`（忽略大小写，且非图片/链接语法）→ 全部替换为图片
 *   2. 无占位符 + 光标选中了一段文字 → 替换选区
 *   3. 无选区 + 有光标 → 光标所在行下新建一行插入
 *   4. 无光标 → 文末行下新建一行插入
 * 同一张图片若有多个占位符，全部替换，但图片只上传一次。
 */

import { useStore } from "@/store";

/* ── 工具函数 ── */

export function generateImageRef(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").slice(0, 20);
  const rand = Math.random().toString(36).slice(2, 6);
  return `img_${base}_${rand}`;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}

/* ── 光标 / textarea 模块状态 ── */
// 拖拽等非聚焦场景需要拿到最近一次光标位置，故在模块级缓存

let lastSelection: { start: number; end: number } | null = null;
let textareaEl: HTMLTextAreaElement | null = null;

export function setLastSelection(sel: { start: number; end: number } | null) {
  lastSelection = sel;
}
export function getLastSelection() {
  return lastSelection;
}

export function setTextareaEl(el: HTMLTextAreaElement | null) {
  textareaEl = el;
}

/* ── 占位符匹配 ── */

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 构造占位符正则：匹配 `[名称]`，但要求 `[` 前不是 `!`（图片语法），
 * `]` 后不是 `(`（链接语法），忽略大小写。
 */
function buildPlaceholderRegex(name: string): RegExp {
  return new RegExp(`(?<!\\!)\\[${escapeRegExp(name)}\\](?!\\()`, "gi");
}

function hasPlaceholder(content: string, name: string): boolean {
  if (!name) return false;
  return buildPlaceholderRegex(name).test(content);
}

/** 将所有匹配的占位符替换为图片语法（用函数替换避免 $ 特殊字符问题） */
function replacePlaceholders(content: string, name: string, imageText: string): string {
  return content.replace(buildPlaceholderRegex(name), () => imageText);
}

/* ── 主流程 ── */

/**
 * 处理一组图片文件并插入到编辑器内容中。
 * 内部会读取 base64、存入 store、按优先级确定位置、更新 content。
 */
export async function processImageFiles(files: File[]): Promise<void> {
  if (files.length === 0) return;
  const store = useStore.getState();
  let content = store.content;
  let selection = getLastSelection();
  let insertPos: number | null = null;

  for (const file of files) {
    const base64 = await fileToBase64(file);
    const ref = generateImageRef(file.name);
    store.addImage(ref, base64);

    const dims = await getImageDimensions(base64);
    const innerWidth = store.settings.width - store.settings.padding * 2;
    const displayWidth = dims.width > 0 && dims.width < innerWidth ? dims.width : innerWidth;
    const imageText = `![${file.name}|${displayWidth}](@${ref})`;
    const baseName = file.name.replace(/\.[^.]+$/, "");

    // 1. 文本占位符
    if (hasPlaceholder(content, baseName)) {
      content = replacePlaceholders(content, baseName, imageText);
      // 占位符位置不固定，不更新 selection / insertPos
      continue;
    }

    // 2. 选区替换
    if (selection && selection.end > selection.start) {
      const at = selection.start;
      content = content.slice(0, at) + imageText + content.slice(selection.end);
      insertPos = at + imageText.length;
      selection = { start: insertPos, end: insertPos };
      continue;
    }

    // 3. 光标行下 / 4. 文末兜底
    if (content === "") {
      content = imageText;
      insertPos = imageText.length;
    } else {
      const pos = selection ? selection.start : content.length;
      let lineEnd = content.indexOf("\n", pos);
      if (lineEnd === -1) lineEnd = content.length;
      // 在行尾（\n 之前）插入新行；文末则在末尾追加
      content = content.slice(0, lineEnd) + "\n" + imageText + content.slice(lineEnd);
      insertPos = lineEnd + 1 + imageText.length;
    }
    selection = { start: insertPos, end: insertPos };
  }

  store.setContent(content);

  // 恢复光标
  if (textareaEl && insertPos != null) {
    const pos = insertPos;
    requestAnimationFrame(() => {
      textareaEl?.focus();
      try {
        textareaEl?.setSelectionRange(pos, pos);
      } catch {
        /* 忽略 */
      }
    });
  }

  // 存储限额检查
  checkStorageWarning().catch(() => {});
}

/* ── 存储限额 ── */

export interface StorageInfo {
  usage: number; // 字节
  quota: number; // 字节，0 表示无限制/不可用
}

/** 获取浏览器存储用量与配额 */
export async function getStorageInfo(): Promise<StorageInfo> {
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
    }
  } catch {
    /* 忽略 */
  }
  return { usage: 0, quota: 0 };
}

/** 计算当前 images 占用字节数 */
export function calcImagesSize(images: Record<string, string>): number {
  let total = 0;
  try {
    const enc = new TextEncoder();
    for (const v of Object.values(images)) {
      total += enc.encode(v).length;
    }
  } catch {
    for (const v of Object.values(images)) total += v.length;
  }
  return total;
}

/** 格式化字节数为可读字符串 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** 若存储用量超过配额 90%，弹窗提醒 */
export async function checkStorageWarning(): Promise<void> {
  const info = await getStorageInfo();
  if (info.quota > 0 && info.usage / info.quota > 0.9) {
    alert(
      `图片缓存占用已接近浏览器存储上限（${formatBytes(info.usage)} / ${formatBytes(info.quota)}），\n建议清理未使用的图片以避免存储失败。`
    );
  }
}
