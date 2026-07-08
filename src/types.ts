// 尺寸预设
export type SizePreset = "3:4" | "3:5";

// 字体选项
export type FontFamily = "serif" | "sans" | "kai";

export const FONT_OPTIONS: Record<FontFamily, { label: string; value: string; weight: number }> = {
  serif: { label: "思源宋体", value: '"Noto Serif SC", serif', weight: 500 },
  sans: { label: "思源黑体", value: '"Noto Sans SC", sans-serif', weight: 400 },
  kai: { label: "霞鹜文楷", value: '"LXGW WenKai", serif', weight: 400 },
};

// 样式设置
export interface Settings {
  sizePreset: SizePreset;
  width: number;
  height: number;
  padding: number;
  fontSize: number;
  h1FontSize: number; // H1 字号 px
  h2FontSize: number; // H2 字号 px
  h3FontSize: number; // H3 字号 px
  lineHeight: number;
  paragraphSpacing: number;
  letterSpacing: number; // 字间距 px
  fontFamily: FontFamily;
  textColor: string; // 主文本色
  secondaryColor: string; // 次要文本色（引用、列表数字/圆点、分割线）
  headingColor: string; // 标题颜色
  bgColor: string;
  underlineColor: string;
  highlightColor: string;
  codeColor: string; // 行内代码文字颜色
  codeBgColor: string; // 代码块背景颜色
  showGuideLines: boolean; // 辅助线开关（仅 3:5 尺寸第一页有效）
}

// 主题
export interface Theme {
  id: string;
  name: string;
  settings: Omit<Settings, "sizePreset" | "width" | "height">;
}

// 内置主题
export const BUILT_IN_THEMES: Theme[] = [
  {
    id: "default",
    name: "素雅白",
    settings: {
      padding: 32,
      fontSize: 16.7,
      h1FontSize: 33,
      h2FontSize: 25,
      h3FontSize: 21,
      lineHeight: 1.8,
      paragraphSpacing: 11.6,
      letterSpacing: 0.1,
      fontFamily: "serif",
      textColor: "#1A1A1A",
      secondaryColor: "#929292",
      headingColor: "#1A1A1A",
      bgColor: "#FFFFFF",
      underlineColor: "#ffe697",
      highlightColor: "#fff8df",
      codeColor: "#C0392B",
      codeBgColor: "#F0EDE5",
      showGuideLines: false,
    },
  },
  {
    id: "warm",
    name: "暖阳橙",
    settings: {
      padding: 32,
      fontSize: 16.7,
      h1FontSize: 33,
      h2FontSize: 25,
      h3FontSize: 21,
      lineHeight: 1.8,
      paragraphSpacing: 11.6,
      letterSpacing: 0.1,
      fontFamily: "serif",
      textColor: "#3D2B1F",
      secondaryColor: "#A0887A",
      headingColor: "#C45C26",
      bgColor: "#FDF6EC",
      underlineColor: "#E07B3C",
      highlightColor: "#FFE8C8",
      codeColor: "#A0522D",
      codeBgColor: "#F5EDE0",
      showGuideLines: false,
    },
  },
  {
    id: "dark",
    name: "墨夜蓝",
    settings: {
      padding: 32,
      fontSize: 16.7,
      h1FontSize: 33,
      h2FontSize: 25,
      h3FontSize: 21,
      lineHeight: 1.8,
      paragraphSpacing: 11.6,
      letterSpacing: 0.1,
      fontFamily: "sans",
      textColor: "#E0E0E0",
      secondaryColor: "#787878",
      headingColor: "#8CB4F0",
      bgColor: "#1A1B2E",
      underlineColor: "#5B9BF0",
      highlightColor: "#2A3A5C",
      codeColor: "#8CB4F0",
      codeBgColor: "#252840",
      showGuideLines: false,
    },
  },
];

// 单页数据
export interface Page {
  index: number;
  html: string;
}

// 尺寸预设映射
export const SIZE_PRESETS: Record<SizePreset, { width: number; height: number; label: string }> = {
  "3:4": { width: 440, height: 586, label: "3:4 · 440×586" },
  "3:5": { width: 440, height: 733, label: "3:5 · 440×733" },
};

// 默认设置（使用素雅白主题）
export const DEFAULT_SETTINGS: Settings = {
  sizePreset: "3:4",
  width: 440,
  height: 586,
  ...BUILT_IN_THEMES[0].settings,
};

/**
 * 迁移旧版设置：旧的 h1FontSize/h2FontSize 是倍率值（1.0-3.0），
 * 需要转为 px 值；缺少的新字段补上默认值
 */
export function migrateSettings(stored: Record<string, unknown>): Settings {
  const s = { ...DEFAULT_SETTINGS, ...stored };
  // 旧版倍率值迁移：h1/h2 倍率 <= 3.0 时转为 px
  if (s.h1FontSize <= 3) s.h1FontSize = Math.round(s.fontSize * s.h1FontSize);
  if (s.h2FontSize <= 3) s.h2FontSize = Math.round(s.fontSize * s.h2FontSize);
  // h3FontSize 缺失时补默认值
  if (s.h3FontSize === undefined || s.h3FontSize <= 3) {
    s.h3FontSize = 17;
  }
  // showGuideLines 缺失时补默认值
  if (s.showGuideLines === undefined) {
    s.showGuideLines = false;
  }
  // codeColor/codeBgColor 缺失时补默认值
  if (s.codeColor === undefined) {
    s.codeColor = "#C0392B";
  }
  if (s.codeBgColor === undefined) {
    s.codeBgColor = "#F0EDE5";
  }
  return s as Settings;
}

// 默认 Markdown 内容
export const DEFAULT_CONTENT = `<br>

<br>

![|376|edge](@img_cat_qavr)

# 快速上手Markdown
<br>

%%作者：自变量Amber%%

<br>

***

Markdown 是一种轻量级排版语言。

<br>

## 1. 标题

在文字前面加 \`#\` 即可，数量代表层级（1~3 级）。

\`\`\`markdown
# 一级标题
## 二级标题
### 三级标题
\`\`\`
<br>

效果：
# 一级标题
## 二级标题
### 三级标题

<br>

## 2. 段落、换行与空行

- **段落**：直接输入文字，空一行即开启新段落。
- **换行**：在行尾加两个空格，再回车；或直接空一行。
- **空行**：在文末加\`<br>\`

<br>

## 3. 文字强调

| 效果 | 语法 | 示例 |
|------|------|------|
| 斜体 | \`_文字_\` | _斜体_ |
| 粗体 | \`**文字**\`  | **粗体** |
| 下划线 | \`<u>文字</u>\` | <u>下划线</u> |
| 高亮 | \`==文字==\` | ==高亮== |

<br>

## 4. 列表

### 无序列表
用 \`-\`开头：

\`\`\`markdown
- 苹果
- 香蕉
- 橙子
\`\`\`

效果：
- 苹果
- 香蕉
- 橙子

### 有序列表
用数字加 \`.\` 开头：

\`\`\`markdown
1. 第一点
2. 第二点
3. 第三点
\`\`\`

效果：
1. 第一点
2. 第二点
3. 第三点


<br>

## 5. 链接与图片

### 图片
点击插图按键上传本地图片<br>


![插图.png|196](@img_插图_7j65)


<br>

## 6. 引用与正文块
### 引用
在段落前加 \`>\`：

\`\`\`markdown
> 这是一段引用。
> 可以跨多行。
\`\`\`

效果：
> 这是一段引用。
> 可以跨多行。

### 正文块
\`\`\`markdown
%%这是一段正文块。%%
\`\`\`

效果：
%% 这是一段正文块。%%

<br>

## 7. 代码

### 行内代码
用一对反引号 \` \` \` 包裹：

\`\`\`markdown
输出\`Hello, World!\` 。
\`\`\`

效果：输出\`HelloWorld\` 。

### 代码块
用三个反引号 \` \`\` \` 包裹：

\`\`\`\`markdown
\`\`\`
function hello() {
  console.log("Hello, Markdown!");
}
\`\`\`
\`\`\`\`

效果：
\`\`\`
function hello() {
  console.log("Hello, Markdown!");
}
\`\`\`

<br>

## 8. 分隔线

用三个或以上的 \`-\`或\`*\`  ：

\`\`\`markdown
---虚线
***实线
\`\`\`

效果：

---
***

<br>



## 写在最后
部分为本工具特殊语法，标记在设置栏最下方。
`;
