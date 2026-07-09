import { create } from "zustand";
import {
  DEFAULT_CONTENT,
  DEFAULT_SETTINGS,
  BUILT_IN_THEMES,
  migrateSettings,
  type Settings,
  type SizePreset,
  type Theme,
  SIZE_PRESETS,
} from "@/types";
import { persist } from "zustand/middleware";
import { saveImageToStore, loadImageStore, cleanupUnusedImages, deleteImageFromStore } from "@/lib/imageStore";

interface StoreState {
  content: string;
  settings: Settings;
  isExporting: boolean;
  exportRequest: number; // 递增触发导出全部
  images: Record<string, string>;
  customThemes: Theme[];
  // undo/redo
  undoStack: string[];
  redoStack: string[];
  // 动作
  setContent: (content: string) => void;
  setSettings: (partial: Partial<Settings>) => void;
  setSizePreset: (preset: SizePreset) => void;
  setIsExporting: (v: boolean) => void;
  requestExport: () => void;
  resetSettings: () => void;
  addImage: (ref: string, dataUrl: string) => void;
  applyTheme: (theme: Theme) => void;
  addCustomTheme: (theme: Theme) => void;
  updateCustomTheme: (id: string, updates: Partial<Theme>) => void;
  deleteCustomTheme: (id: string) => void;
  importConfig: (settings: Settings, themes: Theme[]) => void;
  undo: () => void;
  redo: () => void;
  loadImages: () => Promise<void>;
  cleanupImages: () => Promise<number>;
  deleteImages: (refs: string[]) => Promise<void>;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      content: DEFAULT_CONTENT,
      settings: DEFAULT_SETTINGS,
      isExporting: false,
      exportRequest: 0,
      images: {},
      customThemes: [],
      undoStack: [],
      redoStack: [],

      setContent: (content) =>
        set((state) => ({
          content,
          undoStack: [...state.undoStack.slice(-50), state.content],
          redoStack: [],
        })),

      setSettings: (partial) =>
        set((state) => ({ settings: { ...state.settings, ...partial } })),

      setSizePreset: (preset) =>
        set((state) => ({
          settings: {
            ...state.settings,
            sizePreset: preset,
            width: SIZE_PRESETS[preset].width,
            height: SIZE_PRESETS[preset].height,
          },
        })),

      setIsExporting: (v) => set({ isExporting: v }),
      requestExport: () => set((state) => ({ exportRequest: state.exportRequest + 1 })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),

      addImage: (ref, dataUrl) => {
        // 同步更新 Zustand 状态
        set((state) => ({ images: { ...state.images, [ref]: dataUrl } }));
        // 异步保存到 IndexedDB（不阻塞 UI）
        saveImageToStore(ref, dataUrl).catch((err) => {
          console.error("保存图片到 IndexedDB 失败:", err);
        });
      },

      applyTheme: (theme) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...theme.settings,
          },
        })),

      addCustomTheme: (theme) =>
        set((state) => ({ customThemes: [...state.customThemes, theme] })),

      updateCustomTheme: (id, updates) =>
        set((state) => ({
          customThemes: state.customThemes.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),

      deleteCustomTheme: (id) =>
        set((state) => ({
          customThemes: state.customThemes.filter((t) => t.id !== id),
        })),

      importConfig: (settings, themes) =>
        set({
          settings,
          customThemes: themes,
        }),

      undo: () => {
        const { undoStack, content } = get();
        if (undoStack.length === 0) return;
        const prev = undoStack[undoStack.length - 1];
        set({
          content: prev,
          undoStack: undoStack.slice(0, -1),
          redoStack: [...get().redoStack, content],
        });
      },

      redo: () => {
        const { redoStack, content } = get();
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        set({
          content: next,
          redoStack: redoStack.slice(0, -1),
          undoStack: [...get().undoStack, content],
        });
      },

      // 从 IndexedDB 加载图片到内存
      loadImages: async () => {
        try {
          const images = await loadImageStore();
          set({ images });
        } catch (err) {
          console.error("从 IndexedDB 加载图片失败:", err);
        }
      },

      // 清理未被 markdown 引用的图片
      cleanupImages: async () => {
        try {
          // 从当前 content 中提取所有 @ref 引用
          const refRegex = /!\[[^\]]*\]\(@([^)]+)\)/g;
          const usedRefs = new Set<string>();
          let match;
          while ((match = refRegex.exec(get().content)) !== null) {
            usedRefs.add(match[1]);
          }
          const deleted = await cleanupUnusedImages(usedRefs);
          // 同步更新内存中的 images
          if (deleted.length > 0) {
            set((state) => {
              const newImages = { ...state.images };
              for (const ref of deleted) {
                delete newImages[ref];
              }
              return { images: newImages };
            });
          }
          return deleted.length;
        } catch (err) {
          console.error("清理图片失败:", err);
          return 0;
        }
      },

      // 删除指定图片（从 IndexedDB 和内存）
      deleteImages: async (refs) => {
        for (const ref of refs) {
          try {
            await deleteImageFromStore(ref);
          } catch (err) {
            console.error("删除图片失败:", err);
          }
        }
        set((state) => {
          const newImages = { ...state.images };
          for (const ref of refs) delete newImages[ref];
          return { images: newImages };
        });
      },
    }),
    {
      name: "md2post-store",
      // images 不再存入 localStorage，改用 IndexedDB
      // isExporting/exportRequest 也不持久化
      partialize: (state) => ({
        content: state.content,
        settings: state.settings,
        customThemes: state.customThemes,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<StoreState>;
        return {
          ...current,
          ...p,
          settings: migrateSettings({ ...(p.settings ?? {}) }),
          images: current.images ?? {},
          customThemes: p.customThemes ?? [],
        };
      },
    }
  )
);
