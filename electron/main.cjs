const { app, BrowserWindow, ipcMain, Menu, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

let win = null;

// 단일 인스턴스 보호
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 이미 실행 중인 인스턴스가 있으면 종료
  app.quit();
} else {
  // 두 번째 인스턴스가 시도될 때 기존 창을 포커스
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  function createWindow() {
    // 개발 모드 확인
    const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
    
    win = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        sandbox: false,
        preload: path.join(__dirname, "preload.cjs"),
        // Electron에서 input 필드의 키보드 입력이 정상 작동하도록 설정
        spellcheck: false,
      },
      icon: path.join(__dirname, "../public/pwa-192x192.png"),
      show: false, // 창이 준비될 때까지 숨김
    });

    if (isDev) {
      // 개발 모드: Vite 개발 서버
      // 포트는 자동으로 할당되므로 여러 포트 시도
      const ports = [5173, 5174, 5175];
      let portIndex = 0;

      const tryLoad = () => {
        win.loadURL(`http://localhost:${ports[portIndex]}`).catch(() => {
          if (portIndex < ports.length - 1) {
            portIndex++;
            tryLoad();
          } else {
            win.loadURL("http://localhost:5173");
          }
        });
      };
      tryLoad();

      win.webContents.openDevTools(); // 개발자 도구 열기 (선택사항)
    } else {
      // 프로덕션 모드: 빌드된 파일
      win.loadFile(path.join(__dirname, "../dist/index.html"));
    }

    // before-input-event 핸들러 제거
    // 이 핸들러가 모든 키보드 입력을 가로채서 input 필드의 정상 작동을 방해함
    // 개발자 도구는 F12 키를 누르면 기본적으로 열리므로 별도 핸들러 불필요
    // 또는 메뉴에서 "도움말" > "개발자 도구"로 열 수 있음

    // 창이 준비되면 표시
    win.once("ready-to-show", () => {
      win.show();

      // 개발 모드가 아니면 포커스
      if (!isDev) {
        win.focus();
      }
    });

    // 창이 닫힐 때
    win.on("closed", () => {
      win = null;
    });
  }

  // 템플릿 파일 경로 찾기 헬퍼 함수
  function findTemplatePath() {
    const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
    let templatePath;
    
    if (isDev) {
      // 개발 모드: public 폴더에서 읽기
      templatePath = path.join(__dirname, "../public/ScoreShow_Template.xlsx");
    } else {
      // 프로덕션 모드: extraResources로 배치된 파일은 process.resourcesPath에서 찾기
      const resourcesPath = process.resourcesPath;
      console.log("[Electron] Resources path:", resourcesPath);
      
      // extraResources로 배치된 파일 경로
      templatePath = path.join(resourcesPath, "ScoreShow_Template.xlsx");
      
      // 파일이 없으면 app.asar 내부에서 찾기 시도
      if (!fs.existsSync(templatePath)) {
        const appPath = app.getAppPath();
        console.log("[Electron] App path:", appPath);
        
        const possiblePaths = [
          path.join(appPath, "ScoreShow_Template.xlsx"), // 루트
          path.join(appPath, "dist", "ScoreShow_Template.xlsx"), // dist 폴더
        ];
        
        for (const testPath of possiblePaths) {
          console.log("[Electron] Trying path:", testPath);
          if (fs.existsSync(testPath)) {
            templatePath = testPath;
            console.log("[Electron] Found template at:", testPath);
            break;
          }
        }
      } else {
        console.log("[Electron] Found template in resources:", templatePath);
      }
    }
    
    if (!templatePath || !fs.existsSync(templatePath)) {
      throw new Error(`템플릿 파일을 찾을 수 없습니다.`);
    }
    
    return templatePath;
  }

  // IPC 핸들러: 템플릿 파일 읽기
  ipcMain.handle("get-template-file", async () => {
    try {
      const templatePath = findTemplatePath();
      const fileBuffer = fs.readFileSync(templatePath);
      console.log("[Electron] Template file read successfully, size:", fileBuffer.length);
      return {
        success: true,
        data: fileBuffer.toString("base64"),
      };
    } catch (error) {
      console.error("[Electron] 템플릿 파일 읽기 실패:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // IPC 핸들러: 템플릿 파일을 다운로드 폴더에 저장
  ipcMain.handle("download-template", async () => {
    try {
      const templatePath = findTemplatePath();
      const downloadsPath = app.getPath("downloads");
      const destPath = path.join(downloadsPath, "ScoreShow_Template.xlsx");
      
      // 파일 복사
      fs.copyFileSync(templatePath, destPath);
      
      console.log("[Electron] Template file saved to:", destPath);
      return {
        success: true,
        path: destPath,
      };
    } catch (error) {
      console.error("[Electron] 템플릿 파일 다운로드 실패:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // IPC 핸들러: Electron 창에 포커스 주기
  ipcMain.handle("focus-window", async () => {
    try {
      if (win) {
        if (win.isMinimized()) {
          win.restore();
        }
        win.focus();
        // webContents에도 포커스 주기
        win.webContents.focus();
        return { success: true };
      }
      return { success: false, error: "Window not found" };
    } catch (error) {
      console.error("[Electron] Focus window failed:", error);
      return { success: false, error: error.message };
    }
  });

  // 메뉴 생성 함수
  function createMenu() {
    const template = [
      {
        label: "도움말",
        submenu: [
          {
            label: "ScoreShow 정보",
            click: () => {
              const version = app.getVersion();
              dialog.showMessageBox(win, {
                type: "info",
                title: "ScoreShow 정보",
                message: "ScoreShow",
                detail: `버전: ${version}\n\n교사용 수행평가 점수 발표 도구\n\nMade with ❤️ by a teacher, for teachers`,
                buttons: ["확인"],
              });
            },
          },
          { type: "separator" },
          {
            label: "개발자 도구",
            accelerator: "F12",
            click: () => {
              if (win.webContents.isDevToolsOpened()) {
                win.webContents.closeDevTools();
              } else {
                win.webContents.openDevTools();
              }
            },
          },
          { type: "separator" },
          {
            label: "GitHub 저장소",
            click: () => {
              require("electron").shell.openExternal("https://github.com/pobydev/ScoreShow");
            },
          },
        ],
      },
    ];

    // macOS에서는 첫 번째 메뉴가 앱 이름으로 표시됨
    if (process.platform === "darwin") {
      template.unshift({
        label: app.getName(),
        submenu: [
          {
            label: `${app.getName()} 정보`,
            click: () => {
              const version = app.getVersion();
              dialog.showMessageBox(win, {
                type: "info",
                title: `${app.getName()} 정보`,
                message: app.getName(),
                detail: `버전: ${version}\n\n교사용 수행평가 점수 발표 도구\n\nMade with ❤️ by a teacher, for teachers`,
                buttons: ["확인"],
              });
            },
          },
          { type: "separator" },
          { role: "quit" },
        ],
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  // 앱이 준비되면 창 생성
  app.whenReady().then(() => {
    createMenu();
    createWindow();

    // macOS: 모든 창이 닫혀도 앱이 계속 실행
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else if (win) {
        // 이미 창이 있으면 포커스
        win.focus();
      }
    });
  });

  // Windows/Linux: 모든 창이 닫히면 앱 종료
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  // 앱 종료 전 정리
  app.on("before-quit", () => {
    if (win) {
      win.removeAllListeners("close");
    }
  });
}
