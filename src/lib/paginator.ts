import type { Page, Settings } from "@/types";
import { FONT_OPTIONS } from "@/types";

/**
 * 测量容器：用于在不影响渲染的情况下测量块高度
 */
let measureEl: HTMLDivElement | null = null;

function getMeasureElement(settings: Settings): HTMLDivElement {
  if (!measureEl) {
    measureEl = document.createElement("div");
    measureEl.className = "measure-container page-content";
    document.body.appendChild(measureEl);
  }
  // 应用样式变量与宽度
  const innerWidth = settings.width - settings.padding * 2;
  measureEl.style.setProperty("--font-size", `${settings.fontSize}px`);
  measureEl.style.setProperty("--line-height", String(settings.lineHeight));
  measureEl.style.setProperty("--paragraph-spacing", `${settings.paragraphSpacing}px`);
  measureEl.style.setProperty("--letter-spacing", `${settings.letterSpacing}px`);
  measureEl.style.setProperty("--h1-font-size", `${settings.h1FontSize}px`);
  measureEl.style.setProperty("--h2-font-size", `${settings.h2FontSize}px`);
  measureEl.style.setProperty("--h3-font-size", `${settings.h3FontSize}px`);
  measureEl.style.setProperty("--page-padding", `${settings.padding}px`);
  measureEl.style.setProperty("--font-family", (FONT_OPTIONS[settings.fontFamily] ?? FONT_OPTIONS.sans).value);
  measureEl.style.setProperty("--font-weight", String((FONT_OPTIONS[settings.fontFamily] ?? FONT_OPTIONS.sans).weight));
  measureEl.style.setProperty("--text-color", settings.textColor);
  measureEl.style.setProperty("--secondary-color", settings.secondaryColor ?? "#929292");
  measureEl.style.setProperty("--heading-color", settings.headingColor ?? settings.textColor);
  measureEl.style.setProperty("--underline-color", settings.underlineColor);
  measureEl.style.setProperty("--highlight-color", settings.highlightColor);
  measureEl.style.setProperty("--code-color", settings.codeColor ?? "#C0392B");
  measureEl.style.setProperty("--code-bg-color", settings.codeBgColor ?? "#F0EDE5");
  measureEl.style.width = `${innerWidth}px`;
  measureEl.style.padding = "0";
  return measureEl;
}

/**
 * 等待容器内所有图片加载完成
 * data URL 图片也需要时间解码，否则 naturalWidth/naturalHeight 为 0
 */
function awaitMeasureImages(el: HTMLElement): Promise<void> {
  const imgs = Array.from(el.querySelectorAll("img"));
  if (imgs.length === 0) return Promise.resolve();
  return Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    })
  ).then(() => undefined);
}

/**
 * 测量单个块 HTML 在给定设置下的高度（等待图片加载后）
 */
async function measureBlock(html: string, settings: Settings): Promise<number> {
  const el = getMeasureElement(settings);
  el.innerHTML = html;
  await awaitMeasureImages(el);
  const height = el.scrollHeight;
  el.innerHTML = "";
  return height;
}

/**
 * 尝试将一个过高的块拆分为多个可放入页面的子块
 * 适用于 ul/ol（按 li 拆）、blockquote/table（按行拆）
 * 如果无法拆分，返回原块（即使超出页面高度）
 */
async function splitOversizedBlock(
  html: string,
  settings: Settings,
  availableHeight: number
): Promise<string[]> {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  const root = template.content.firstElementChild as HTMLElement | null;
  if (!root) return [html];

  const tag = root.tagName.toLowerCase();

  // 列表：按 <li> 拆分
  if (tag === "ul" || tag === "ol") {
    const items = Array.from(root.children);
    if (items.length <= 1) return [html];
    const parts: string[] = [];
    let currentItems: Element[] = [];
    const wrapperTag = tag;

    for (const item of items) {
      const testHtml = `<${wrapperTag}>${currentItems
        .concat(item)
        .map((i) => i.outerHTML)
        .join("")}</${wrapperTag}>`;
      const h = await measureBlock(testHtml, settings);
      if (h > availableHeight && currentItems.length > 0) {
        parts.push(
          `<${wrapperTag}>${currentItems
            .map((i) => i.outerHTML)
            .join("")}</${wrapperTag}>`
        );
        currentItems = [item];
      } else {
        currentItems.push(item);
      }
    }
    if (currentItems.length > 0) {
      parts.push(
        `<${wrapperTag}>${currentItems
          .map((i) => i.outerHTML)
          .join("")}</${wrapperTag}>`
      );
    }
    return parts.length > 1 ? parts : [html];
  }

  // 表格：按 <tr> 拆分
  if (tag === "table") {
    const tbody = root.querySelector("tbody") || root;
    const rows = Array.from(tbody.children).filter(
      (r) => r.tagName.toLowerCase() === "tr"
    );
    if (rows.length <= 1) return [html];
    const parts: string[] = [];
    let currentRows: Element[] = [];

    for (const row of rows) {
      const testHtml = `<table><tbody>${currentRows
        .concat(row)
        .map((r) => r.outerHTML)
        .join("")}</tbody></table>`;
      const h = await measureBlock(testHtml, settings);
      if (h > availableHeight && currentRows.length > 0) {
        parts.push(
          `<table><tbody>${currentRows
            .map((r) => r.outerHTML)
            .join("")}</tbody></table>`
        );
        currentRows = [row];
      } else {
        currentRows.push(row);
      }
    }
    if (currentRows.length > 0) {
      parts.push(
        `<table><tbody>${currentRows
          .map((r) => r.outerHTML)
          .join("")}</tbody></table>`
      );
    }
    return parts.length > 1 ? parts : [html];
  }

  // 引用：按内部 <p> 拆分
  if (tag === "blockquote") {
    const paragraphs = Array.from(root.children);
    if (paragraphs.length <= 1) return [html];
    const parts: string[] = [];
    let currentP: Element[] = [];

    for (const p of paragraphs) {
      const testHtml = `<blockquote>${currentP
        .concat(p)
        .map((x) => x.outerHTML)
        .join("")}</blockquote>`;
      const h = await measureBlock(testHtml, settings);
      if (h > availableHeight && currentP.length > 0) {
        parts.push(
          `<blockquote>${currentP
            .map((x) => x.outerHTML)
            .join("")}</blockquote>`
        );
        currentP = [p];
      } else {
        currentP.push(p);
      }
    }
    if (currentP.length > 0) {
      parts.push(
        `<blockquote>${currentP
          .map((x) => x.outerHTML)
          .join("")}</blockquote>`
      );
    }
    return parts.length > 1 ? parts : [html];
  }

  // 其他情况无法拆分
  return [html];
}

/**
 * 将块级 HTML 数组按页面高度切割为多页
 */
export async function paginateBlocks(
  blocks: string[],
  settings: Settings
): Promise<Page[]> {
  const availableHeight = settings.height - settings.padding * 2;
  if (availableHeight <= 0) {
    return [{ index: 1, html: blocks.join("") }];
  }

  const pages: Page[] = [];
  let currentPage: string[] = [];
  let currentHeight = 0;

  const flushPage = () => {
    if (currentPage.length > 0) {
      pages.push({ index: pages.length + 1, html: currentPage.join("") });
      currentPage = [];
      currentHeight = 0;
    }
  };

  for (const block of blocks) {
    const blockHeight = await measureBlock(block, settings);

    // 块本身超出整页可用高度 → 尝试拆分
    if (blockHeight > availableHeight) {
      const parts = await splitOversizedBlock(block, settings, availableHeight);
      for (const part of parts) {
        const partHeight = await measureBlock(part, settings);
        if (currentHeight + partHeight > availableHeight && currentPage.length > 0) {
          flushPage();
        }
        currentPage.push(part);
        currentHeight += partHeight;
      }
      continue;
    }

    // 正常块：判断是否还能放进当前页
    if (currentHeight + blockHeight > availableHeight && currentPage.length > 0) {
      flushPage();
    }
    currentPage.push(block);
    currentHeight += blockHeight;
  }

  // 处理空内容情况
  if (pages.length === 0 && currentPage.length === 0) {
    return [{ index: 1, html: "" }];
  }

  flushPage();
  return pages;
}
