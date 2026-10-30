/**
 * 앱 아이콘, 이름, 소개, 버전. 시작 화면과 사이드바 위쪽에 놓입니다.
 */

import icon from "../../assets/scoreshow-128.png";

export function AppBrand({ appVersion }: { appVersion: string | null }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <img src={icon} alt="" className="h-8 w-8 flex-shrink-0" />
      <div className="min-w-0">
        <h1 className="text-emph font-bold text-ink">ScoreShow</h1>
        <p className="text-caption text-soft">
          교사용 수행평가 발표도구
          {appVersion && <span className="ml-1.5">v{appVersion}</span>}
        </p>
      </div>
    </div>
  );
}
