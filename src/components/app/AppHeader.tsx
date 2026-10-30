/**
 * 상단 헤더: 로고, 설명, 버전, 파일 선택
 */

import logo from "../../assets/logo.svg";
import { FilePicker } from "../FilePicker";

export function AppHeader({ appVersion }: { appVersion: string | null }) {
  return (
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
  );
}
