import { domToPng } from "modern-screenshot";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { Settings, FontFamily } from "@/types";

/**
 * 获取北京时间（UTC+8）的 Date 对象
 */
function getBeijingDate(): Date {
  return new Date(Date.now() + 8 * 60 * 60 * 1000);
}

/**
 * 格式化北京时间戳为 YYMMDDHHMMSS
 */
function formatBeijingTimestamp(): string {
  const d = getBeijingDate();
  const yy = String(d.getUTCFullYear()).slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${yy}${mm}${dd}${hh}${mi}${ss}`;
}

/**
 * 将 ArrayBuffer 转为 base64（分块处理避免栈溢出）
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * 字体族对应的 Google Fonts 参数
 */
const GOOGLE_FONT_PARAMS: Record<FontFamily, string> = {
  serif: "Noto+Serif+SC:wght@400;500;600;700",
  sans: "Noto+Sans+SC:wght@300;400;500;700",
  kai: "LXGW+WenKai:wght@400;700",
};

/**
 * 字体族对应的 font-family 名称
 */
const FONT_FAMILY_NAMES: Record<FontFamily, string> = {
  serif: "Noto Serif SC",
  sans: "Noto Sans SC",
  kai: "LXGW WenKai",
};

/**
 * 从 Google Fonts 下载当前字体族 + JetBrains Mono 的字体文件
 * 关键改进：去掉 unicode-range，每个字体族+字重只保留最大的 CJK 子集文件
 * 避免 SVG foreignObject 沙盒中 unicode-range 匹配失败导致中文回退到其他字体
 */
async function fetchFontCSS(settings: Settings): Promise<string> {
  const currentFont = settings.fontFamily;
  const familyParam = `family=${GOOGLE_FONT_PARAMS[currentFont]}&family=JetBrains+Mono:wght@400;500`;
  const cssUrl = `https://fonts.googleapis.com/css2?${familyParam}&display=swap`;

  console.log(`[md2post] 请求字体 CSS: ${cssUrl}`);

  const cssResponse = await fetch(cssUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    },
  });
  if (!cssResponse.ok) {
    console.warn(`[md2post] Google Fonts CSS 请求失败: ${cssResponse.status}`);
    return "";
  }
  const cssText = await cssResponse.text();

  // 解析 @font-face 块，提取 family、weight、url、unicode-range
  interface FontFaceInfo {
    family: string;
    weight: string;
    url: string;
    base64: string;
    size: number;
  }

  const fontFaceRegex = /@font-face\s*\{([^}]+)\}/g;
  const urlRegex = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/;
  const familyRegex = /font-family:\s*['"]?([^'";]+)['"]?\s*;/;
  const weightRegex = /font-weight:\s*(\d+)\s*;/;

  const allFonts: FontFaceInfo[] = [];
  const urls = new Set<string>();

  let match;
  while ((match = fontFaceRegex.exec(cssText)) !== null) {
    const block = match[1];
    const urlMatch = urlRegex.exec(block);
    const familyMatch = familyRegex.exec(block);
    const weightMatch = weightRegex.exec(block);
    if (urlMatch && familyMatch) {
      const url = urlMatch[1];
      urls.add(url);
      allFonts.push({
        family: familyMatch[1].trim(),
        weight: weightMatch ? weightMatch[1] : "400",
        url,
        base64: "",
        size: 0,
      });
    }
  }

  console.log(`[md2post] 解析到 ${allFonts.length} 个 @font-face，${urls.size} 个唯一 URL`);

  // 并行下载所有字体文件
  const urlToBuffer = new Map<string, ArrayBuffer>();
  await Promise.all(
    Array.from(urls).map(async (url) => {
      try {
        const resp = await fetch(url);
        if (!resp.ok) return;
        const buffer = await resp.arrayBuffer();
        urlToBuffer.set(url, buffer);
      } catch {
        // 跳过下载失败的字体
      }
    })
  );

  console.log(`[md2post] 成功下载 ${urlToBuffer.size}/${urls.size} 个字体文件`);

  // 填充 base64 和 size
  for (const font of allFonts) {
    const buffer = urlToBuffer.get(font.url);
    if (buffer) {
      font.base64 = arrayBufferToBase64(buffer);
      font.size = buffer.byteLength;
    }
  }

  // 按字体族+字重分组，每组只保留最大的文件（CJK 子集最大）
  const groupKey = (f: FontFaceInfo) => `${f.family}__${f.weight}`;
  const grouped = new Map<string, FontFaceInfo>();
  for (const font of allFonts) {
    if (!font.base64) continue;
    const key = groupKey(font);
    const existing = grouped.get(key);
    if (!existing || font.size > existing.size) {
      grouped.set(key, font);
    }
  }

  console.log(`[md2post] 去重后保留 ${grouped.size} 个字体（每组取最大 CJK 子集）`);

  // 调试：打印每组字体的信息
  for (const font of grouped.values()) {
    console.log(`[md2post] 字体: ${font.family} w${font.weight} (${(font.size / 1024).toFixed(0)}KB)`);
  }

  // 调试：打印页面 computed font-family
  const computed = getComputedStyle(document.querySelector(".page-content") || document.body).fontFamily;
  console.log(`[md2post] 页面 computed font-family: ${computed}`);

  // 构建 @font-face CSS（不带 unicode-range，覆盖所有字符）
  let result = "";
  for (const font of grouped.values()) {
    result += `@font-face{font-family:'${font.family}';font-style:normal;font-weight:${font.weight};src:url("data:font/woff2;base64,${font.base64}") format("woff2");font-display:block;}\n`;
  }

  return result;
}

/**
 * SVG 导出布局修复 CSS
 * 修复 SVG foreignObject 沙盒中与浏览器渲染的微小差异：
 * - .note-text 的 inline-block 导致末尾换行 → 改为 block
 * - inline-block 的 baseline 间隙 → vertical-align: top
 */
const LAYOUT_FIX_CSS = `
.page-content .note-text{display:block;vertical-align:top;}
.page-content blockquote .note-text{display:block;}
`;

/**
 * 预注入字体法（onCreateForeignObjectSvg 版）：
 * 1. domToPng 生成 PNG，通过 onCreateForeignObjectSvg 回调拦截 SVG 创建
 * 2. 在回调中将 @font-face CSS + 布局修复 CSS 注入到 SVG 的 foreignObject 内部
 * 3. modern-screenshot 内部处理 SVG → Canvas 转换（不受 tainted canvas 限制）
 */
async function captureNode(
  node: HTMLElement,
  settings: Settings,
  fontCSS: string
): Promise<string> {
  const dataUrl: string = await domToPng(node, {
    width: settings.width,
    height: settings.height,
    scale: 2,
    backgroundColor: settings.bgColor,
    font: false,
    onCreateForeignObjectSvg: (svg: SVGSVGElement) => {
      // 找到 foreignObject 元素
      const foreignObject = svg.querySelector("foreignObject");
      if (!foreignObject) {
        console.warn("[md2post] SVG 中未找到 foreignObject");
        return;
      }

      // 获取 foreignObject 内的第一个子元素
      const firstChild = foreignObject.firstChild as Element | null;

      // 创建 <style> 元素并注入字体 CSS + 布局修复 CSS
      const styleEl = svg.ownerDocument!.createElementNS(
        "http://www.w3.org/1999/xhtml",
        "style"
      );
      styleEl.textContent = fontCSS + "\n" + LAYOUT_FIX_CSS;

      // 将 <style> 插入到 foreignObject 内部最前面
      if (firstChild) {
        foreignObject.insertBefore(styleEl, firstChild);
      } else {
        foreignObject.appendChild(styleEl);
      }

      console.log(
        `[md2post] 已注入字体+布局修复 CSS (${styleEl.textContent.length} 字符)`
      );
    },
  });

  return dataUrl;
}

/**
 * 导出所有页面为 PNG 并打包为 zip 下载
 */
export async function exportPagesAsZip(
  pageNodes: HTMLElement[],
  settings: Settings,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  // 预先收集字体 CSS（只需一次，所有页面共用）
  let fontCSS = "";
  try {
    fontCSS = await fetchFontCSS(settings);
    console.log(`[md2post] 字体 CSS 长度: ${fontCSS.length}`);
  } catch (e) {
    console.warn("[md2post] 字体 CSS 收集失败:", e);
  }

  const zip = new JSZip();
  const beijingDate = getBeijingDate();

  for (let i = 0; i < pageNodes.length; i++) {
    const dataUrl = await captureNode(pageNodes[i], settings, fontCSS);
    const base64 = dataUrl.split(",")[1];
    zip.file(`md2post-page-${String(i + 1).padStart(2, "0")}.png`, base64, {
      base64: true,
      date: beijingDate,
    });
    onProgress?.(i + 1, pageNodes.length);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `md2post-${formatBeijingTimestamp()}.zip`);
}

/**
 * 导出单个页面为 PNG
 */
export async function exportSinglePage(
  pageNode: HTMLElement,
  settings: Settings,
  pageIndex: number
): Promise<void> {
  // 收集字体 CSS
  let fontCSS = "";
  try {
    fontCSS = await fetchFontCSS(settings);
  } catch (e) {
    console.warn("[md2post] 字体 CSS 收集失败:", e);
  }

  const dataUrl = await captureNode(pageNode, settings, fontCSS);
  const blob = await (await fetch(dataUrl)).blob();
  const fileName = `md2post-page-${String(pageIndex).padStart(2, "0")}.png`;
  const file = new File([blob], fileName, {
    type: "image/png",
    lastModified: Date.now(),
  });
  saveAs(file);
}
