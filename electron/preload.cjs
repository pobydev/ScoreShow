const { contextBridge, ipcRenderer } = require("electron");
const path = require("path");
const fs = require("fs");

// package.json에서 버전 정보 읽기
function getAppVersion() {
  try {
    const packagePath = path.join(__dirname, "../package.json");
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
      return packageJson.version || "1.0.0";
    }
  } catch (error) {
    console.error("[Preload] Failed to read version:", error);
  }
  return "1.0.0";
}

// 템플릿 파일 다운로드를 위한 API 노출
contextBridge.exposeInMainWorld("electronAPI", {
  getTemplateFile: () => ipcRenderer.invoke("get-template-file"),
  downloadTemplate: () => ipcRenderer.invoke("download-template"),
  getVersion: () => getAppVersion(),
});

