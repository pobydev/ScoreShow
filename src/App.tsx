/**
 * 메인 앱 컴포넌트
 * 앱을 켜면 저장 목록과 파일 넣는 칸이 보이고, 목록을 고르면 학생 목록과 점수 화면이 보입니다.
 * 목록을 고르기 전에는 점수가 보이지 않습니다.
 */

import { useEffect, useState } from "react";
import { GuideDialog } from "./components/app/GuideDialog";
import { StatusMessage } from "./components/app/StatusMessage";
import { TitleBar } from "./components/app/TitleBar";
import { useBlockStrayFileDrop, useAppVersion, useOfflineLog } from "./components/app/useAppEnvironment";
import { useFileUpload } from "./components/app/useFileUpload";
import { HomeScreen } from "./components/home/HomeScreen";
import { SaveListDialog } from "./components/home/SaveListDialog";
import { useFullscreen } from "./components/work/useFullscreen";
import { WorkScreen } from "./components/work/WorkScreen";
import { isReadable } from "./core/lists";
import { useStore } from "./store/store";
import "./core/no-network";

function App() {
  const { error, isLoading, loadFromStorage } = useStore();
  const activeListName = useStore(
    (state) => state.lists.filter(isReadable).find((list) => list.id === state.activeListId)?.name
  );
  const appVersion = useAppVersion();
  const upload = useFileUpload();
  const fullscreen = useFullscreen();
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
  const screenStatus = isGuideOpen ? null : statusMessage;
  const openGuide = () => setIsGuideOpen(true);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-canvas">
      <input
        ref={upload.inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={upload.handleInputChange}
        disabled={upload.isProcessing}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />

      {!fullscreen.isFullscreen && <TitleBar listName={activeListName} />}

      <div className="relative flex-1 min-h-0">
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

        {!isLoading && !isRestoring && !activeListName && (
          <HomeScreen status={screenStatus} upload={upload} onOpenGuide={openGuide} />
        )}

        {!isLoading && !isRestoring && activeListName && (
          <WorkScreen
            status={screenStatus}
            upload={upload}
            fullscreen={fullscreen}
            onOpenGuide={openGuide}
          />
        )}
      </div>

      {isGuideOpen && (
        <GuideDialog
          appVersion={appVersion}
          status={statusMessage}
          onDownloadTemplate={upload.downloadTemplate}
          onClose={() => setIsGuideOpen(false)}
        />
      )}

      {upload.pending && (
        <SaveListDialog pending={upload.pending} onClose={upload.clearPending} />
      )}
    </div>
  );
}

export default App;
