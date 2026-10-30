/**
 * 메인 앱 컴포넌트
 */

import { useEffect } from "react";
import { AppHeader } from "./components/app/AppHeader";
import { DataSafetyNotice } from "./components/app/DataSafetyNotice";
import { StatusMessage } from "./components/app/StatusMessage";
import { useAppVersion, useOfflineLog } from "./components/app/useAppEnvironment";
import { StudentList } from "./components/StudentList";
import { PreviewPanel } from "./components/PreviewPanel";
import { Presenter } from "./components/Presenter";
import { useStore } from "./store/store";
import "./core/no-network";

function App() {
  const { error, isPresenterMode, isLoading, loadFromStorage } = useStore();
  const appVersion = useAppVersion();
  useOfflineLog();

  // 앱 시작 시 저장된 데이터 불러오기
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      {/* 발표 모드 */}
      {isPresenterMode && <Presenter />}

      {/* 메인 UI */}
      {!isPresenterMode && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="flex-shrink-0 container mx-auto p-4 max-w-7xl">
            <AppHeader appVersion={appVersion} />
            <DataSafetyNotice />
            {error && <StatusMessage message={error} />}
          </div>

          {/* 로딩 중 */}
          {isLoading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
                <p className="mt-2 text-ocean-700">
                  데이터를 처리하고 있습니다...
                </p>
              </div>
            </div>
          )}

          {/* 메인 컨텐츠 - 항상 표시 */}
          {!isLoading && (
            <div className="flex-1 container mx-auto px-4 max-w-7xl pb-4 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                {/* 좌측: 학생 목록 (1/3 폭) */}
                <div className="lg:col-span-1 h-full flex flex-col min-h-0">
                  <StudentList />
                </div>

                {/* 우측: 미리보기 (2/3 폭) */}
                <div className="lg:col-span-2 h-full flex flex-col min-h-0">
                  <PreviewPanel />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
