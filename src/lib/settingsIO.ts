import type { Settings, Theme } from "@/types";
import { migrateSettings } from "@/types";

/**
 * 导出参数数据结构
 */
export interface ExportPayload {
  version: 1;
  exportedAt: string;
  settings: Settings;
  customThemes: Theme[];
}

/**
 * 将设置和自定义主题导出为 JSON 文件
 */
export function exportSettings(settings: Settings, customThemes: Theme[]): void {
  const payload: ExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    customThemes,
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `md2post-config-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 从 JSON 文件导入参数
 */
export function importSettingsFromFile(file: File): Promise<ExportPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!data.settings) {
          reject(new Error("文件格式不正确：缺少 settings 字段"));
          return;
        }
        resolve({
          version: data.version ?? 1,
          exportedAt: data.exportedAt ?? "",
          settings: migrateSettings({ ...data.settings }),
          customThemes: Array.isArray(data.customThemes) ? data.customThemes : [],
        });
      } catch (err) {
        reject(new Error("无法解析文件：" + (err as Error).message));
      }
    };
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsText(file);
  });
}
