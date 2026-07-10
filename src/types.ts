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
      underlineColor: "#FBBF24",
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

// 默认设置（使用素雅白主题，首次打开为 3:5 并显示辅助线）
export const DEFAULT_SETTINGS: Settings = {
  sizePreset: "3:5",
  width: 440,
  height: 733,
  ...BUILT_IN_THEMES[0].settings,
  showGuideLines: true,
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
    s.showGuideLines = true;
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

<>作者：自变量Amber

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

## 5. 图片

插入图片前可在文中预留[图片名称]，图片会自动插入到对应位置。
拖拽文件到界面、插图按键、直接粘贴都可以插入图片。
从上到下依次是靠左、居中、平铺

\`\`\`markdown
![insert.png|196](@img_insert_kk8n)
![insert.png|196|center](@img_insert_kk8n)
![insert.png|196|edge](@img_insert_kk8n)
\`\`\`

效果：
![insert.png|196](@img_insert_kk8n)
![insert.png|196|center](@img_insert_kk8n)
![insert.png|196|edge](@img_insert_kk8n)<br>


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
<>这是一段正文块。
\`\`\`

效果：
<> 这是一段正文块。

<br>

## 7. 代码

### 行内代码
用一对反引号 \`\` 包裹：

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
快捷键和本工具特殊语法，可在编辑器右上角问号处查看。
`;

// 模板二：标题框架
export const TEMPLATE_TWO = `<br>

# 不断适应、顺势前行。
<br>

***
<br>


吴晓波在《激荡三十年》最后写到：<br>

## 三十年来，商业界
30年来的中国商业界，已面目全非。

1979年，8家大型国营工厂被选为全国首批企业改革试点，如今6家不复存在，两家难言辉煌，它们都没有成为成功的涉水者。<br>

在20世纪80年代，曾经叱咤一时的改革风云人物，如年广久、步鑫生、张兴让、马胜利等，都成了沉寂的“历史人物”。<br>

而在20世纪90年代涌现的众多商界英豪，如牟其中、褚时健、潘宁、李经纬等，或沉或浮，俱成==过眼云烟==。<br>

## 三十年来，经济 

一些曾经是改革标杆的地方和名词，如“温州模式”、“苏南模式”及“蛇口经验”等，也已失去光彩逼人的先发效应。<br>

30年来，人们曾经激烈争辩的“姓社姓资”问题，如今早已达成共识，很多冒险者为之付出代价甚至失去生命的“禁区”，在今天看来，都已是寻常之事。<br>

历经数轮成长周期的洗礼，经济变革的主题及公司成长的路径，几度==转轨变型==，往往超出人们的预想。<br>

## 不断适应、顺势前行。

中国企业跋涉在一条十分独特的市场化道路上，它们在一系列看似偶发的历史事件和社会变革过程中（譬如“特区”的开设、乡镇企业的意外崛起、亚洲金融风暴的发生、互联网经济的诞生以及十分特殊的资本市场等）不断适应、顺势前行。<br>

在这场精彩而多变的历史进程中，根本观察不到经济学家津津乐道的“客观规律”。”这或许能加深我们对今天股市的理解。<br>

==永远敬畏市场。==
`;
