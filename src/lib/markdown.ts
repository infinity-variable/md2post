import MarkdownIt from "markdown-it";

// 创建 markdown-it 实例
const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: false,
});

// 高亮语法 ==text== → <mark>text</mark>
md.inline.ruler.before("emphasis", "highlight", (state, silent) => {
  const src = state.src.slice(state.pos);
  const match = /^==([\s\S]+?)==/.exec(src);
  if (!match) return false;
  if (silent) return true;
  const token = state.push("highlight_open", "mark", 1);
  token.markup = "==";
  const content = state.push("text", "", 0);
  content.content = match[1];
  const close = state.push("highlight_close", "mark", -1);
  close.markup = "==";
  state.pos += match[0].length;
  return true;
});

// <>正文 语法：行首 <> 开头，渲染为竖线前缀的正文块（样式同引用但颜色为主文本色）
md.inline.ruler.before("emphasis", "note", (state, silent) => {
  const src = state.src.slice(state.pos);
  const match = /^<>([^\n]+)/.exec(src);
  if (!match) return false;
  if (silent) return true;
  const token = state.push("note_open", "span", 1);
  token.markup = "<>";
  token.attrSet("class", "note-text");
  const content = state.push("text", "", 0);
  content.content = match[1];
  const close = state.push("note_close", "span", -1);
  close.markup = "<>";
  state.pos += match[0].length;
  return true;
});

// 自定义图片渲染：支持 ![alt|width](url)、![alt|width|edge](url)、![alt|width|center](url) 语法
// |width 为像素值，|edge 表示突破页边距铺满，|center 表示保留页边距水平居中
// data-src 保存原始 URL（@ref 或 base64 前缀），用于后续匹配更新
// data-ref 保存原始 ref 名称（如果是 @ref 引用）
md.renderer.rules.image = (tokens, idx, options, env: { images?: Record<string, string> }) => {
  const token = tokens[idx];
  const src = token.attrGet("src") || "";
  let alt = token.content || "";

  // 解析 alt 中的 |width、|width|edge、|width|center 后缀
  let width = "";
  let edge = false;
  let center = false;
  const pipeMatch = alt.match(/^(.*?)\|(\d+)(?:\|(edge|center))?$/);
  if (pipeMatch) {
    alt = pipeMatch[1];
    width = pipeMatch[2];
    edge = pipeMatch[3] === "edge";
    center = pipeMatch[3] === "center";
  }
  // 也支持只写 |edge 或 |center
  const modOnly = alt.match(/^(.*?)\|(edge|center)$/);
  if (modOnly) {
    alt = modOnly[1];
    if (modOnly[2] === "edge") edge = true;
    else center = true;
  }

  // 处理 @ref 引用：从 images 映射获取实际 URL，同时保存 ref
  // markdown-it 会自动对 src 中的非 ASCII 字符做 URL 编码，需要先解码
  let actualSrc = src;
  let refName = "";
  if (src.startsWith("@") && env.images) {
    const decodedSrc = decodeURIComponent(src);
    refName = decodedSrc.slice(1);
    actualSrc = env.images[refName] || src;
  }

  const altAttr = md.utils.escapeHtml(alt);
  const srcAttr = md.utils.escapeHtml(actualSrc);
  const widthStyle = width ? ` style="width:${width}px"` : "";
  const imgClass = edge ? "img-edge" : center ? "img-center" : "";
  // data-src 保存原始引用（@ref 解码后的值或 URL），用于后续图片调整时的匹配
  const dataSrcAttr = md.utils.escapeHtml(refName ? `@${refName}` : src);
  const dataRefAttr = refName ? ` data-ref="${md.utils.escapeHtml(refName)}"` : "";
  return `<img src="${srcAttr}" alt="${altAttr}"${widthStyle} class="${imgClass}" data-width="${width}" data-edge="${edge ? "1" : "0"}" data-center="${center ? "1" : "0"}" data-src="${dataSrcAttr}"${dataRefAttr} />`;
};

// 自定义分割线渲染：区分 ***（实线，正文色）和 ---（虚线，次要文本色）
// 使用完整的 hr 规则，而非 hr_open/hr_close
md.renderer.rules.hr = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const markup = token.markup || "---";
  // *** 或 ___ 为实线，--- 为虚线
  const isSolid = markup.includes("*") || markup.includes("_");
  const hrClass = isSolid ? "hr-solid" : "hr-dashed";
  // 添加 class 属性到 token
  token.attrSet("class", hrClass);
  // 使用默认渲染逻辑
  return self.renderToken(tokens, idx, options);
};

/**
 * 将 Markdown 解析为 HTML
 * images 参数通过 env 传递给渲染规则，用于 @ref 引用的解析
 */
export function renderMarkdown(content: string, images?: Record<string, string>): string {
  // 不再预替换 @ref，通过 env 传递给图片渲染规则处理
  const env = { images };
  return md.render(content, env);
}

/**
 * 将 Markdown 解析为顶层块级元素数组
 */
export function renderBlocks(content: string, images?: Record<string, string>): string[] {
  const fullHtml = renderMarkdown(content, images);
  const template = document.createElement("template");
  template.innerHTML = fullHtml.trim();

  const blocks: string[] = [];
  const container = document.createElement("div");
  while (template.content.firstChild) {
    container.appendChild(template.content.firstChild);
  }

  for (let i = 0; i < container.childNodes.length; i++) {
    const node = container.childNodes[i];
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim() ?? "";
      if (text) blocks.push(text);
      continue;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      blocks.push(el.outerHTML);
    }
  }
  return blocks;
}

export default md;
