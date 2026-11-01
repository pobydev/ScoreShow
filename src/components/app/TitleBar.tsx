/**
 * 창 맨 위 바: 작은 로고, 앱 이름, 지금 연 목록, 창 조절 버튼 (brand/DESIGN.md)
 * 창 조절 버튼은 Electron에서만 나옵니다. 전체화면에서는 바 전체를 숨깁니다.
 */

import { Minus, Square, X } from "@phosphor-icons/react";
import icon from "../../assets/scoreshow-128.png";

const CONTROL =
  "w-[43px] h-full grid place-items-center text-soft transition-colors hover:bg-surface-hover hover:text-ink";

export function TitleBar({ listName }: { listName?: string }) {
  const windowAction = window.electronAPI?.windowAction;

  return (
    <header className="titlebar relative flex-shrink-0 h-[34px] flex items-center justify-between pl-[17px] bg-card border-b border-line text-small">
      <span className="flex items-center gap-2 text-ink">
        <img src={icon} alt="" className="h-[18px] w-[18px]" />
        스코어쇼
      </span>
      {listName && (
        <span className="absolute left-1/2 -translate-x-1/2 max-w-[40%] truncate text-caption text-soft">
          {listName}
        </span>
      )}
      {windowAction && (
        <div className="titlebar-controls flex h-full">
          <button type="button" aria-label="창 최소화" className={CONTROL} onClick={() => windowAction("minimize")}>
            <Minus size={15} />
          </button>
          <button type="button" aria-label="창 최대화" className={CONTROL} onClick={() => windowAction("maximize")}>
            <Square size={13} />
          </button>
          <button
            type="button"
            aria-label="앱 닫기"
            className="w-[43px] h-full grid place-items-center text-soft transition-colors hover:bg-danger hover:text-white"
            onClick={() => windowAction("close")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </header>
  );
}
