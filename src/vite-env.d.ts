/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface TemplateFileResult {
  success: boolean;
  data?: string;
  error?: string;
}

interface DownloadTemplateResult {
  success: boolean;
  path?: string;
  error?: string;
}

interface ElectronAPI {
  getTemplateFile: () => Promise<TemplateFileResult>;
  downloadTemplate: () => Promise<DownloadTemplateResult>;
  getVersion: () => string;
  focusWindow: () => Promise<{ success: boolean; error?: string }>;
  windowAction?: (action: "minimize" | "maximize" | "close") => void;
  getDisplayCount?: () => Promise<number>;
  onDisplayCountChange?: (listener: (count: number) => void) => () => void;
  getUpdateInfo?: () => Promise<{ updates: "on" | "off"; status: import("./core/updates").UpdateStatus }>;
  checkForUpdates?: () => Promise<void>;
  downloadUpdate?: () => Promise<void>;
  installUpdate?: () => Promise<void>;
  onUpdateStatus?: (listener: (status: import("./core/updates").UpdateStatus) => void) => () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}


