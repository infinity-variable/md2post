# 版本说明

## v1.1.0

### 新增
- 编辑器字数统计（行数 · 字数）改为悬浮显示，定位在文本输入框右下角，透明底色，不再占用顶部工具栏空间
- 快捷键提示条新增向下收起箭头，点击可折叠/展开快捷键列表
- 设置面板「特殊语法说明」新增向下收起箭头，点击可折叠/展开语法说明内容

### UI 优化
- 工具栏左上角 Logo 由 Layers 图标替换为内联 favicon.svg（无穷符号 ∞），描边颜色继承父级白色

### Bug 修复
- 修复导出图片为空白的问题：离屏容器由 `position: fixed; left: -99999px` 改为 `left: 0px; z-index: -9999; pointer-events: none`，确保 `html-to-image` 正常渲染
- 修复导出图片时间戳显示 UTC 时间的问题：JSZip 的 `date` 选项偏移为北京时间（UTC+8）
- 修复分页不准确导致内容截断的问题：`measureBlock` 改为异步，等待图片解码后再测量高度
- 修复 `skipFonts: true` 导致字体变细的问题：思源宋体字重提升至 600
- 修复首次登录默认图片不显示的问题：预加载路径改用 `import.meta.env.BASE_URL` 构建，兼容 GitHub Pages 子路径部署
- 修复首次加载默认图片 404 的竞态条件问题
- 修复空白页「No routes matched location "/md2post/"」错误
- 修复 trae solo 弹窗残留问题

### 导出图片质量修复
- 导出引擎切换为 html2canvas，通过 `onclone` 回调进行 DOM 修正
- 修复文本位置垂直偏移（4-5px 位移）
- 修复带前导竖线文本框中文字对齐问题
- 修复无序列表圆点过细问题：用自定义 span 替换 `list-style`
- 修复列表项圆点/序号垂直对齐
- 修复标题、代码块向下偏移
- 修复表格边框过粗
- 修复有序列表序号颜色错误
- 修复引用框竖线对齐
- 导出前增加 `waitForImages()` 和 `nextFrame()` 等待渲染完成

### 部署与构建
- 设置 `base: '/md2post/'` 适配 GitHub Pages 子路径部署
- React Router 添加 `basename="/md2post"` 配置
- 构建输出目录由 `dist` 改为 `docs`
- 移除 `vite-plugin-trae-solo-badge` 插件（去除广告注入）
- 清理 `dist/` 目录陈旧构建产物
- 删除冲突的 `.github/workflows/deploy.yml`，改用分支部署方式
- ESLint 忽略列表由 `['dist']` 更新为 `['docs']`

### 清理
- 移除未使用的 `src/lib/utils.ts` 及其依赖（clsx、tailwind-merge）

---

## v1.0.0

### 初始发布
- Markdown 转小红书图文工具
- 支持实时预览、自定义排版参数（字号、行距、段间距、字间距、颜色等）
- 支持图片插入与管理（IndexedDB 存储）
- 支持多页分页导出 PNG 及 ZIP 打包
- 内置主题系统（素雅白、护眼绿、夜间模式等）
- 支持 Markdown 快捷键输入
- 支持拖拽导入文本与图片
- 支持设置导入/导出（JSON 格式）
- 提供快速上手模板与标题框架模板
