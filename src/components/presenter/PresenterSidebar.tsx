/**
 * 발표 화면 왼쪽의 접을 수 있는 학생 목록 틀
 * 넓은 창에서는 작업 화면 사이드바와 같은 자리를 차지하고, 좁은 창에서는 학생 화면 위에 펼쳐집니다.
 */

import type { ReactNode } from "react";
import icon from "../../assets/scoreshow-128.png";
import { ChevronLeftIcon, ChevronRightIcon } from "../icons";

export function PresenterSidebar({
  isExpanded,
  onExpandedChange,
  children,
}: {
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  children: ReactNode;
}) {
  if (!isExpanded) {
    return (
      <button
        onClick={() => onExpandedChange(true)}
        className="flex-shrink-0 w-8 border-r border-line bg-card text-soft flex items-center justify-center transition-colors hover:bg-surface-hover hover:text-ink"
        aria-label="목록 펼치기"
        type="button"
      >
        <ChevronRightIcon className="w-5 h-5" />
      </button>
    );
  }

  return (
    <aside className="absolute md:static z-10 inset-y-0 left-0 flex-shrink-0 w-64 border-r border-line bg-card flex flex-col">
      <div className="p-4 flex items-center gap-2 flex-shrink-0">
        <img src={icon} alt="" className="h-6 w-6 flex-shrink-0" />
        <h2 className="flex-1 text-body font-bold text-ink">학생 목록</h2>
        <button
          onClick={() => onExpandedChange(false)}
          className="text-soft transition-colors flex-shrink-0 hover:text-ink"
          aria-label="목록 접기"
          type="button"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 pb-2">
        {children}
      </div>
    </aside>
  );
}
