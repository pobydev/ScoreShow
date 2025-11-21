const { contextBridge, ipcRenderer } = require("electron");

// 템플릿 파일 다운로드를 위한 API 노출
contextBridge.exposeInMainWorld("electronAPI", {
  getTemplateFile: () => ipcRenderer.invoke("get-template-file"),
  downloadTemplate: () => ipcRenderer.invoke("download-template"),
});

