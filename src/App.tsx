/**
 * 메인 앱 컴포넌트
 */

import { useEffect, useState } from "react";
import { FilePicker } from "./components/FilePicker";
import { StudentList } from "./components/StudentList";
import { PreviewPanel } from "./components/PreviewPanel";
import { Presenter } from "./components/Presenter";
import { useStore } from "./store/store";
import "./core/no-network";
import logo from "./assets/logo.svg";

function App() {
  const { error, isPresenterMode, isLoading, loadFromStorage } = useStore();
  const [appVersion, setAppVersion] = useState<string | null>(null);

  // 앱 시작 시 저장된 데이터 불러오기
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Electron 환경에서 버전 정보 가져오기
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).electronAPI?.getVersion) {
      const version = (window as any).electronAPI.getVersion();
      setAppVersion(version);
    }
  }, []);

  // 오프라인 상태 표시
  useEffect(() => {
    const updateOnlineStatus = () => {
      if (!navigator.onLine && import.meta.env.DEV) {
        console.log("[App] Running in offline mode");
      }
    };
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      {/* 발표 모드 */}
      {isPresenterMode && <Presenter />}

      {/* 메인 UI */}
      {!isPresenterMode && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 헤더 */}
          <div className="flex-shrink-0 container mx-auto p-4 max-w-7xl">
            <header className="mb-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {/* 로고 */}
                <img 
                  src={logo} 
                  alt="ScoreShow 로고" 
                  className="h-16 flex-shrink-0"
                  style={{ marginLeft: '10px' }}
                />
                {/* 설명 텍스트 */}
                <div className="flex flex-col">
                  <p className="text-lg font-medium text-ocean-700">
                    교사용 수행평가 발표도구
                  </p>
                  {appVersion && (
                    <p className="text-xs text-ocean-500 mt-0.5">
                      v{appVersion}
                    </p>
                  )}
                </div>
              </div>
              {/* 파일 업로드 - 헤더에 통합 */}
              <div className="flex-shrink-0">
                <FilePicker />
              </div>
            </header>

            {/* 데이터 안전성 및 사용 안내 */}
            <div className="mb-4 p-4 bg-ocean-50 border border-ocean-200 rounded-lg">
              <div>
                  <h3 className="text-sm font-semibold text-ocean-900 mb-2">
                    🔒 데이터 안전성
                  </h3>
                  <p className="text-sm text-ocean-700 mb-2">
                    업로드한 엑셀 파일의 모든 데이터는{" "}
                    <strong className="font-semibold">
                      이 컴퓨터에만 저장
                    </strong>
                    되며, 인터넷으로 전송되지 않습니다. 서버나 클라우드에
                    저장되지 않아{" "}
                    <strong className="font-semibold">
                      개인정보가 안전하게 보호
                    </strong>
                    됩니다.
                  </p>
                  <p className="text-sm text-ocean-700 mb-3">
                    사용을 완료한 후에는{" "}
                    <strong className="font-semibold">데이터 삭제 버튼</strong>
                    을 눌러 모든 데이터를 삭제하세요.
                  </p>
                  <h3 className="text-sm font-semibold text-ocean-900 mb-2">
                    📊 엑셀 파일 다운로드 방법
                  </h3>
                  <p className="text-sm text-ocean-700 mb-2">
                    나이스(neis)에서 다음 경로로 이동한 후, 조회 버튼을 누르고
                    디스켓(💾) 모양 아이콘을 눌러{" "}
                    <strong className="font-semibold">xls 방식</strong>으로
                    다운로드한 엑셀 파일을 업로드하세요:
                  </p>
                  <ul className="text-sm text-ocean-700 mb-2 space-y-1 ml-4 list-disc">
                    <li>
                      교과담임 → 수행평가조회/통계 → 수행평가조회 →
                      교과목별일람표조회-강의실별
                    </li>
                    <li>
                      교과담임 → 수행평가조회/통계 → 수행평가조회 →
                      강의실별일람표조회-전체영역
                    </li>
                  </ul>
                  <p className="text-sm mt-3 p-3 rounded-lg border-2" style={{ 
                    backgroundColor: '#fef3c7', 
                    borderColor: '#f59e0b',
                    color: '#92400e',
                    fontWeight: '600'
                  }}>
                    💡 나이스 엑셀을 업로드했을때 여러 평가 영역이 하나만 인식될 때는 상단의 표준 엑셀서식을 다운받아 점수를 붙여넣어 업로드하면 모든 영역이 안정적으로 인식됩니다.
                  </p>
                  <p className="text-sm text-ocean-700 mt-3">
                    ✏️ 업로드한 점수를 직접 수정하고 싶으시면 우측 패널의 <strong>"🔒 점수 잠금 해제"</strong> 버튼을 클릭하세요.
                  </p>
              </div>
            </div>

            {/* 오류/성공 메시지 표시 */}
            {error && (
              <div
                className={`mb-4 p-4 border rounded-lg ${
                  error.startsWith("✅")
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
                role="alert"
                aria-live="polite"
              >
                {error}
              </div>
            )}
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
