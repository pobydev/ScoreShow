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
}

interface Window {
  electronAPI?: ElectronAPI;
}


