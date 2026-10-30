/**
 * 상단 헤더: 앱 아이콘, 이름, 설명, 버전, 파일 선택
 */

import icon from "../../assets/scoreshow-128.png";
import { FilePicker } from "../FilePicker";

export function AppHeader({ appVersion }: { appVersion: string | null }) {
  return (
    <header className="mb-4 flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-3">
        <img
          src={icon}
          alt=""
          className="h-14 w-14 flex-shrink-0"
        />
        <div className="flex flex-col">
          <h1 className="text-title font-bold text-ink">ScoreShow</h1>
          <p className="text-small text-soft">
            교사용 수행평가 발표도구
            {appVersion && (
              <span className="ml-2 text-caption">v{appVersion}</span>
            )}
          </p>
        </div>
      </div>
      {/* 파일 업로드 - 헤더에 통합 */}
      <div className="flex-shrink-0">
        <FilePicker />
      </div>
    </header>
  );
}
