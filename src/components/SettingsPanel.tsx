import { useState, useRef, useEffect } from "react";
import { useStore } from "@/store";
import {
  SIZE_PRESETS,
  FONT_OPTIONS,
  BUILT_IN_THEMES,
  type SizePreset,
  type FontFamily,
  type Theme,
} from "@/types";
import { exportSettings, importSettingsFromFile } from "@/lib/settingsIO";
import { Settings as SettingsIcon, RotateCcw, Minus, Plus, Pencil, Trash2, Save, Download, Upload } from "lucide-react";

/**
 * 格式化数字显示：整数显示整数，小数去掉尾部 0
 * 26.00 → 26, 26.10 → 26.1, 26.05 → 26.05
 */
function formatNumber(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);
  // 去掉尾部多余的 0 和小数点
  return parseFloat(fixed).toString();
}

/* ── 数值行 ── */
interface NumRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  decimals?: number;
  /** 值为空（用户清空）时的回退值，不传则回退到 0 */
  emptyFallback?: number;
  onChange: (v: number) => void;
}

function NumRow({ label, value, min, max, step, unit = "", decimals = 1, emptyFallback = 0, onChange }: NumRowProps) {
  // 本地文本状态，允许自由编辑（包括清空、输入中间态如 "1." 或 "1.5"）
  const [text, setText] = useState(formatNumber(value, decimals));
  const [focused, setFocused] = useState(false);

  // 外部 value 变化时同步（仅当未聚焦时，避免打断输入）
  useEffect(() => {
    if (!focused) setText(formatNumber(value, decimals));
  }, [value, decimals, focused]);

  const adjust = (d: number) => {
    const n = Number((value + d).toFixed(decimals));
    const clamped = Math.max(min, Math.min(max, n));
    onChange(clamped);
  };

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed === "-" || trimmed === ".") {
      // 空值回退
      onChange(emptyFallback);
      setText(formatNumber(emptyFallback, decimals));
      return;
    }
    const v = parseFloat(trimmed);
    if (isNaN(v)) {
      setText(formatNumber(value, decimals));
      return;
    }
    const rounded = Number(v.toFixed(decimals));
    const clamped = Math.max(min, Math.min(max, rounded));
    onChange(clamped);
    setText(formatNumber(clamped, decimals));
  };

  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] text-muted">{label}</span>
      <button
        onClick={() => adjust(-step)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-card text-muted transition hover:border-coral/40 hover:text-coral"
      >
        <Minus size={10} />
      </button>
      <div className="relative flex-1">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onFocus={() => setFocused(true)}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => {
            setFocused(false);
            commit(e.target.value);
          }}
          className="h-6 w-full rounded border border-border bg-card pr-6 text-center font-mono text-[11px] text-ink outline-none focus:border-coral"
        />
        {unit && (
          <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-muted">
            {unit}
          </span>
        )}
      </div>
      <button
        onClick={() => adjust(step)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-card text-muted transition hover:border-coral/40 hover:text-coral"
      >
        <Plus size={10} />
      </button>
    </div>
  );
}

/* ── 颜色行 ── */
interface ColorRowProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function ColorRow({ label, value, onChange }: ColorRowProps) {
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^0-9a-fA-F#]/g, "");
    if (v && !v.startsWith("#")) v = "#" + v;
    if (v.length <= 7) onChange(v.toUpperCase());
  };
  // 自适应宽度：根据内容长度计算 ch 宽度
  const inputWidth = `${Math.max(value.length, 4) + 15}ch`;
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] text-muted">{label}</span>
      <div
        className="h-6 w-6 shrink-0 rounded border border-border"
        style={{ background: value }}
      />
      <input
        type="text"
        value={value}
        onChange={handleInput}
        style={{ width: inputWidth }}
        className="h-6 rounded border border-border bg-card px-2 font-mono text-[11px] uppercase text-ink outline-none focus:border-coral"
        maxLength={7}
      />
    </div>
  );
}

/* ── 主题编辑弹窗 ── */
function ThemeEditor({
  theme,
  onSave,
  onCancel,
}: {
  theme: Theme;
  onSave: (theme: Theme) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Theme>({ ...theme });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onCancel}>
      <div className="w-72 rounded-lg border border-border bg-card p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 text-xs font-medium text-ink">编辑主题</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[11px] text-muted">名称</span>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="h-6 flex-1 rounded border border-border bg-card px-2 text-[11px] text-ink outline-none focus:border-coral"
            />
          </div>
          <ColorRow label="主文本" value={draft.settings.textColor} onChange={(v) => setDraft({ ...draft, settings: { ...draft.settings, textColor: v } })} />
          <ColorRow label="次要文本" value={draft.settings.secondaryColor} onChange={(v) => setDraft({ ...draft, settings: { ...draft.settings, secondaryColor: v } })} />
          <ColorRow label="标题" value={draft.settings.headingColor} onChange={(v) => setDraft({ ...draft, settings: { ...draft.settings, headingColor: v } })} />
          <ColorRow label="背景" value={draft.settings.bgColor} onChange={(v) => setDraft({ ...draft, settings: { ...draft.settings, bgColor: v } })} />
          <ColorRow label="下划线" value={draft.settings.underlineColor} onChange={(v) => setDraft({ ...draft, settings: { ...draft.settings, underlineColor: v } })} />
          <ColorRow label="高亮" value={draft.settings.highlightColor} onChange={(v) => setDraft({ ...draft, settings: { ...draft.settings, highlightColor: v } })} />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md px-3 py-1 text-xs text-muted hover:bg-cream">取消</button>
          <button onClick={() => onSave(draft)} className="flex items-center gap-1 rounded-md bg-coral px-3 py-1 text-xs text-white hover:bg-coralDark">
            <Save size={10} /> 保存
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 设置面板 ── */
export default function SettingsPanel() {
  const settings = useStore((s) => s.settings);
  const setSizePreset = useStore((s) => s.setSizePreset);
  const setSettings = useStore((s) => s.setSettings);
  const resetSettings = useStore((s) => s.resetSettings);
  const customThemes = useStore((s) => s.customThemes);
  const applyTheme = useStore((s) => s.applyTheme);
  const addCustomTheme = useStore((s) => s.addCustomTheme);
  const updateCustomTheme = useStore((s) => s.updateCustomTheme);
  const deleteCustomTheme = useStore((s) => s.deleteCustomTheme);
  const importConfig = useStore((s) => s.importConfig);
  const cleanupImages = useStore((s) => s.cleanupImages);

  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    exportSettings(settings, customThemes);
  };

  const handleCleanup = async () => {
    const count = await cleanupImages();
    if (count > 0) {
      alert(`已清理 ${count} 张未使用的图片`);
    } else {
      alert("没有需要清理的图片");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const payload = await importSettingsFromFile(file);
      importConfig(payload.settings, payload.customThemes);
    } catch (err) {
      alert("导入失败：" + (err as Error).message);
    }
    e.target.value = "";
  };

  const presets = Object.keys(SIZE_PRESETS) as SizePreset[];
  const fonts = Object.keys(FONT_OPTIONS) as FontFamily[];
  const allThemes = [...BUILT_IN_THEMES, ...customThemes];

  const handleSaveCurrentAsTheme = () => {
    const name = `自定义 ${customThemes.length + 1}`;
    const id = `custom_${Date.now()}`;
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      sizePreset, width, height,
      ...themeSettings
    } = settings;
    addCustomTheme({ id, name, settings: themeSettings });
  };

  const handleThemeEditSave = (theme: Theme) => {
    if (BUILT_IN_THEMES.some((b) => b.id === theme.id)) {
      // 内置主题不允许编辑，忽略
    } else {
      updateCustomTheme(theme.id, { name: theme.name, settings: theme.settings });
    }
    setEditingTheme(null);
  };

  // 判断当前设置是否匹配某主题
  const activeThemeId = allThemes.find((t) => {
    const s = t.settings;
    return (
      s.fontSize === settings.fontSize &&
      s.h1FontSize === settings.h1FontSize &&
      s.h2FontSize === settings.h2FontSize &&
      s.lineHeight === settings.lineHeight &&
      s.paragraphSpacing === settings.paragraphSpacing &&
      s.fontFamily === settings.fontFamily &&
      s.textColor === settings.textColor &&
      s.secondaryColor === settings.secondaryColor &&
      s.headingColor === settings.headingColor &&
      s.bgColor === settings.bgColor &&
      s.underlineColor === settings.underlineColor &&
      s.highlightColor === settings.highlightColor &&
      s.padding === settings.padding
    );
  })?.id;

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-ink">
          <SettingsIcon size={16} className="text-coral" />
          <span className="font-serif text-sm font-semibold">样式</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleImportClick}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-cream hover:text-coral"
            title="导入参数"
          >
            <Upload size={12} />
            导入
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-cream hover:text-coral"
            title="导出参数"
          >
            <Download size={12} />
            导出
          </button>
          <button
            onClick={resetSettings}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-cream hover:text-ink"
            title="恢复默认设置"
          >
            <RotateCcw size={12} />
            重置
          </button>
          <button
            onClick={handleCleanup}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-cream hover:text-coral"
            title="清理未使用的图片缓存"
          >
            <Trash2 size={12} />
            清理
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {/* 图片尺寸 */}
        <div>
          <div className="mb-1.5 text-[11px] font-medium text-ink">图片尺寸</div>
          <div className="grid grid-cols-2 gap-1.5">
            {presets.map((p) => {
              const active = settings.sizePreset === p;
              return (
                <button
                  key={p}
                  onClick={() => setSizePreset(p)}
                  className={
                    "rounded-lg border px-2 py-2 text-center transition-all " +
                    (active ? "border-coral bg-coral/5 text-ink shadow-sm" : "border-border bg-card text-muted hover:border-coral/40 hover:text-ink")
                  }
                >
                  <div className="font-serif text-sm font-semibold">{p}</div>
                  <div className="font-mono text-[10px] text-muted">{SIZE_PRESETS[p].width}×{SIZE_PRESETS[p].height}</div>
                </button>
              );
            })}
          </div>
          {/* 辅助线开关（仅 3:5 尺寸时显示） */}
          {settings.sizePreset === "3:5" && (
            <label className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-[11px] text-muted transition hover:border-coral/40">
              <input
                type="checkbox"
                checked={settings.showGuideLines}
                onChange={(e) => setSettings({ showGuideLines: e.target.checked })}
                className="h-3.5 w-3.5 accent-coral"
              />
              显示辅助线（第一页 73px 处）
            </label>
          )}
        </div>

        <div className="h-px bg-border" />

        {/* 主题 */}
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-medium text-ink">
            主题
            <button
              onClick={handleSaveCurrentAsTheme}
              className="flex h-5 w-5 items-center justify-center rounded border border-border text-muted transition hover:border-coral/40 hover:text-coral"
              title="保存当前设置为新主题"
            >
              <Plus size={10} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allThemes.map((t) => {
              const active = activeThemeId === t.id;
              const isBuiltIn = BUILT_IN_THEMES.some((b) => b.id === t.id);
              return (
                <div key={t.id} className="group relative">
                  <button
                    onClick={() => applyTheme(t)}
                    className={
                      "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-all " +
                      (active ? "border-coral bg-coral/5 shadow-sm" : "border-border bg-card hover:border-coral/40")
                    }
                  >
                    <div className="flex gap-0.5">
                      <div className="h-3 w-3 rounded-sm border border-border/50" style={{ background: t.settings.bgColor }} />
                      <div className="h-3 w-3 rounded-sm border border-border/50" style={{ background: t.settings.textColor }} />
                      <div className="h-3 w-3 rounded-sm border border-border/50" style={{ background: t.settings.headingColor }} />
                    </div>
                    <span className="text-[11px] text-ink">{t.name}</span>
                  </button>
                  {/* 自定义主题：编辑和删除 */}
                  {!isBuiltIn && (
                    <div className="absolute -right-1 -top-1 hidden gap-0.5 group-hover:flex">
                      <button
                        onClick={() => setEditingTheme(t)}
                        className="flex h-4 w-4 items-center justify-center rounded-full border border-border bg-card text-muted hover:text-coral"
                        title="编辑主题"
                      >
                        <Pencil size={8} />
                      </button>
                      <button
                        onClick={() => deleteCustomTheme(t.id)}
                        className="flex h-4 w-4 items-center justify-center rounded-full border border-border bg-card text-muted hover:text-coral"
                        title="删除主题"
                      >
                        <Trash2 size={8} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* 字体选择 */}
        <div>
          <div className="mb-1.5 text-[11px] font-medium text-ink">正文字体</div>
          <div className="grid grid-cols-3 gap-1.5">
            {fonts.map((f) => {
              const active = settings.fontFamily === f;
              return (
                <button
                  key={f}
                  onClick={() => setSettings({ fontFamily: f })}
                  className={
                    "flex h-7 items-center justify-center rounded-lg border px-1.5 text-center transition-all " +
                    (active ? "border-coral bg-coral/5 text-ink shadow-sm" : "border-border bg-card text-muted hover:border-coral/40 hover:text-ink")
                  }
                  style={{ fontFamily: (FONT_OPTIONS[f] ?? FONT_OPTIONS.sans).value }}
                >
                  <span className="text-xs leading-none">{FONT_OPTIONS[f].label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* 排版参数 */}
        <div className="space-y-2">
          <div className="text-[11px] font-medium text-ink">排版参数</div>
          <NumRow label="页边距" value={settings.padding} min={0} max={60} step={1} unit="px" emptyFallback={0} onChange={(v) => setSettings({ padding: v })} />
          <NumRow label="字号" value={settings.fontSize} min={12} max={24} step={0.1} decimals={1} unit="px" emptyFallback={16} onChange={(v) => setSettings({ fontSize: v })} />
          <NumRow label="H1字号" value={settings.h1FontSize} min={14} max={48} step={0.01} decimals={2} unit="px" emptyFallback={26} onChange={(v) => setSettings({ h1FontSize: v })} />
          <NumRow label="H2字号" value={settings.h2FontSize} min={14} max={36} step={0.01} decimals={2} unit="px" emptyFallback={21} onChange={(v) => setSettings({ h2FontSize: v })} />
          <NumRow label="H3字号" value={settings.h3FontSize} min={12} max={28} step={0.01} decimals={2} unit="px" emptyFallback={17} onChange={(v) => setSettings({ h3FontSize: v })} />
          <NumRow label="行距" value={settings.lineHeight} min={1.0} max={2.4} step={0.1} decimals={1} emptyFallback={1.6} onChange={(v) => setSettings({ lineHeight: v })} />
          <NumRow label="段间距" value={settings.paragraphSpacing} min={0} max={32} step={0.1} decimals={1} unit="px" emptyFallback={0} onChange={(v) => setSettings({ paragraphSpacing: v })} />
          <NumRow label="字间距" value={settings.letterSpacing} min={0} max={5} step={0.1} decimals={1} unit="px" emptyFallback={0} onChange={(v) => setSettings({ letterSpacing: v })} />
        </div>

        <div className="h-px bg-border" />

        {/* 颜色 */}
        <div className="space-y-2">
          <div className="text-[11px] font-medium text-ink">颜色</div>
          <ColorRow label="主文本" value={settings.textColor} onChange={(v) => setSettings({ textColor: v })} />
          <ColorRow label="次要文本" value={settings.secondaryColor} onChange={(v) => setSettings({ secondaryColor: v })} />
          <ColorRow label="标题" value={settings.headingColor} onChange={(v) => setSettings({ headingColor: v })} />
          <ColorRow label="背景" value={settings.bgColor} onChange={(v) => setSettings({ bgColor: v })} />
          <ColorRow label="下划线" value={settings.underlineColor} onChange={(v) => setSettings({ underlineColor: v })} />
          <ColorRow label="高亮" value={settings.highlightColor} onChange={(v) => setSettings({ highlightColor: v })} />
          <ColorRow label="代码" value={settings.codeColor} onChange={(v) => setSettings({ codeColor: v })} />
          <ColorRow label="代码背景" value={settings.codeBgColor} onChange={(v) => setSettings({ codeBgColor: v })} />
        </div>

        <div className="h-px bg-border" />

        {/* 特殊语法说明 */}
        <div className="rounded-lg bg-cream p-2.5">
          <div className="mb-1.5 text-[11px] font-medium text-ink">特殊语法说明</div>
          <ul className="space-y-0.5 text-[10px] leading-relaxed text-muted">
            <li><b className="text-ink">空行</b> 双回车</li>
            <li><b className="text-ink">正文块</b> %%正文%%</li>
            <li><b className="text-ink">实线</b> ***</li>
            <li><b className="text-ink">虚线</b> ---</li>
            <li><b className="text-ink">图片</b> ![说明|宽度](URL)</li>
          </ul>
          <div className="mt-2 flex flex-col gap-1">
            <a
              href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-coral hover:underline"
            >
              Markdown 语法参考 →
            </a>
            <a
              href="https://xhslink.com/m/6I6pbFn5aWa"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-coral hover:underline"
            >
              建议与反馈 →
            </a>
          </div>
        </div>
      </div>

      {/* 主题编辑弹窗 */}
      {editingTheme && (
        <ThemeEditor
          theme={editingTheme}
          onSave={handleThemeEditSave}
          onCancel={() => setEditingTheme(null)}
        />
      )}
    </div>
  );
}
