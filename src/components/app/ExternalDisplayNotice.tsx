/**
 * 다른 화면이 연결되어 있을 때의 안내
 * 확장 연결만 알 수 있습니다. 화면 복제는 한 화면으로 보일 수 있어 사용 가이드에도 적어 둡니다.
 */

import { Monitor } from "@phosphor-icons/react";
import { useDisplayCount } from "./useAppEnvironment";

export function ExternalDisplayNotice() {
  const displayCount = useDisplayCount();
  if (displayCount < 2) return null;

  return (
    <p className="flex items-center gap-2 rounded-card bg-card shadow-card px-4 py-3 text-body text-ink" role="status">
      <Monitor size={18} className="flex-shrink-0 text-accent" aria-hidden="true" />
      다른 화면이 연결되어 있습니다. 학생 점수가 TV나 프로젝터에 보일 수 있습니다.
    </p>
  );
}
