import { toPng } from "html-to-image";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { Page, Settings } from "@/types";
import { FONT_OPTIONS } from "@/types";

/**
 * 等待页面字体加载完成
 * html-to-image 渲染前需确保字体就绪，否则可能用回退字体
 */
async function waitForFonts(): Promise<void> {
  try {
    await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
  } catch {
    // 忽略，继续导出
  }
}

/**
 * 创建一个离屏渲染容器，用于导出时渲染单页
 */
function createOffscreenPage(page: Page, settings: Settings): HTMLDivElement {
  const innerWidth = settings.width - settings.padding * 2;
  const innerHeight = settings.height - settings.padding * 2;

  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.width = `${settings.width}px`;
  wrapper.style.height = `${settings.height}px`;
  wrapper.style.background = settings.bgColor;
  wrapper.style.boxSizing = "border-box";
  wrapper.style.padding = `${settings.padding}px`;
  wrapper.style.overflow = "hidden";
  wrapper.style.fontFamily = (FONT_OPTIONS[settings.fontFamily] ?? FONT_OPTIONS.sans).value;
  wrapper.style.fontWeight = String((FONT_OPTIONS[settings.fontFamily] ?? FONT_OPTIONS.sans).weight);

  const content = document.createElement("div");
  content.className = "page-content";
  content.style.setProperty("--font-size", `${settings.fontSize}px`);
  content.style.setProperty("--line-height", String(settings.lineHeight));
  content.style.setProperty("--paragraph-spacing", `${settings.paragraphSpacing}px`);
  content.style.setProperty("--h1-font-size", `${settings.h1FontSize}px`);
  content.style.setProperty("--h2-font-size", `${settings.h2FontSize}px`);
  content.style.setProperty("--page-padding", `${settings.padding}px`);
  content.style.setProperty("--font-family", (FONT_OPTIONS[settings.fontFamily] ?? FONT_OPTIONS.sans).value);
  content.style.setProperty("--font-weight", String((FONT_OPTIONS[settings.fontFamily] ?? FONT_OPTIONS.sans).weight));
  content.style.setProperty("--text-color", settings.textColor);
  content.style.setProperty("--secondary-color", settings.secondaryColor ?? "#929292");
  content.style.setProperty("--heading-color", settings.headingColor ?? settings.textColor);
  content.style.setProperty("--bg-color", settings.bgColor);
  content.style.setProperty("--underline-color", settings.underlineColor);
  content.style.setProperty("--highlight-color", settings.highlightColor);
  content.style.width = `${innerWidth}px`;
  content.style.height = `${innerHeight}px`;
  content.style.overflow = "hidden";
  content.innerHTML = page.html;

  wrapper.appendChild(content);
  document.body.appendChild(wrapper);
  return wrapper;
}

/**
 * 带超时的 Promise 包装，防止 html-to-image 永久挂起
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} 超时 (${ms}ms)`));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/**
 * 将单个页面 DOM 节点转为 PNG dataURL
 * skipFonts: 跳过远程字体嵌入（页面已加载的字体仍会被浏览器用于渲染）
 */
async function pageToPng(node: HTMLElement, settings: Settings): Promise<string> {
  return withTimeout(
    toPng(node, {
      width: settings.width,
      height: settings.height,
      pixelRatio: 2, // 2 倍清晰度
      cacheBust: false,
      backgroundColor: settings.bgColor,
      skipFonts: true, // 关键：跳过远程字体嵌入，避免 CORS 卡住
    }),
    15000,
    `页面渲染`
  );
}

/**
 * 导出所有页面为 PNG 并打包为 zip 下载
 */
export async function exportPagesAsZip(
  pages: Page[],
  settings: Settings,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  await waitForFonts();
  const zip = new JSZip();
  const folder = zip.folder("md2post-images");

  for (let i = 0; i < pages.length; i++) {
    const wrapper = createOffscreenPage(pages[i], settings);
    try {
      const dataUrl = await pageToPng(wrapper, settings);
      const base64 = dataUrl.split(",")[1];
      folder?.file(`page-${String(i + 1).padStart(2, "0")}.png`, base64, {
        base64: true,
      });
    } finally {
      document.body.removeChild(wrapper);
    }
    onProgress?.(i + 1, pages.length);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `md2post-${Date.now()}.zip`);
}

/**
 * 导出单个页面为 PNG
 */
export async function exportSinglePage(
  page: Page,
  settings: Settings
): Promise<void> {
  await waitForFonts();
  const wrapper = createOffscreenPage(page, settings);
  try {
    const dataUrl = await pageToPng(wrapper, settings);
    const blob = await (await fetch(dataUrl)).blob();
    saveAs(blob, `md2post-page-${page.index}.png`);
  } finally {
    document.body.removeChild(wrapper);
  }
}
