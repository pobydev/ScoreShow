/**
 * 메인 앱 컴포넌트
 * 자료가 없으면 시작 화면, 있으면 사이드바와 작업 영역, 발표 중이면 발표 화면을 보입니다.
 */

import { useEffect, useState } from "react";
import { GuideDialog } from "./components/app/GuideDialog";
import { StatusMessage } from "./components/app/StatusMessage";
import { useBlockStrayFileDrop, useAppVersion, useOfflineLog } from "./components/app/useAppEnvironment";
import { useFileUpload } from "./components/app/useFileUpload";
import { PreviewPanel } from "./components/PreviewPanel";
import { Presenter } from "./components/Presenter";
import { Sidebar } from "./components/Sidebar";
import { StartScreen } from "./components/StartScreen";
import { useStore } from "./store/store";
import "./core/no-network";

function App() {
  const { error, isPresenterMode, isLoading, loadFromStorage } = useStore();
  const hasStudents = useStore((state) => state.students.length > 0);
  const appVersion = useAppVersion();
  const upload = useFileUpload();
  // 저장된 자료를 다 읽기 전에 시작 화면이 잠깐 비치지 않게 합니다.
  const [isRestoring, setIsRestoring] = useState(true);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  useOfflineLog();
  useBlockStrayFileDrop();

  // 앱 시작 시 저장된 데이터 불러오기
  useEffect(() => {
    loadFromStorage().finally(() => setIsRestoring(false));
  }, [loadFromStorage]);

  const statusMessage = error ? <StatusMessage message={error} /> : null;
  const openGuide = () => setIsGuideOpen(true);

  return (
    <div className="h-screen overflow-hidden bg-canvas">
      <input
        ref={upload.inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={upload.handleInputChange}
        disabled={upload.isProcessing}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* 발표 모드 */}
      {isPresenterMode && <Presenter />}

      {/* 메인 UI */}
      {!isPresenterMode && (
        <>
          {/* 로딩 중 */}
          {isLoading && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                <p className="mt-2 text-body text-soft">
                  데이터를 처리하고 있습니다...
                </p>
              </div>
            </div>
          )}

          {!isLoading && !isRestoring && !hasStudents && (
            <StartScreen
              appVersion={appVersion}
              status={isGuideOpen ? null : statusMessage}
              upload={upload}
              onOpenGuide={openGuide}
            />
          )}

          {!isLoading && !isRestoring && hasStudents && (
            <div className="h-full flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
              <Sidebar appVersion={appVersion} upload={upload} onOpenGuide={openGuide} />
              <PreviewPanel status={isGuideOpen ? null : statusMessage} />
            </div>
          )}

          {isGuideOpen && (
            <GuideDialog
              status={statusMessage}
              onDownloadTemplate={upload.downloadTemplate}
              onClose={() => setIsGuideOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
