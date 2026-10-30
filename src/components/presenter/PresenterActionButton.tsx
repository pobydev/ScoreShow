/**
 * 발표 화면 우측 상단의 닫기 모양 버튼
 */

import { CloseIcon } from "../icons";

const BASE_CLASS =
  "px-4 py-2 rounded-button bg-card text-ink text-small font-semibold shadow-lift transition-colors hover:bg-surface-hover flex items-center gap-2";

export function PresenterActionButton({
  label,
  ariaLabel,
  floating = false,
  onClick,
}: {
  label: string;
  ariaLabel: string;
  /** 다른 버튼과 묶이지 않을 때 스스로 우측 상단에 고정합니다. */
  floating?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={floating ? `fixed top-4 right-4 z-50 ${BASE_CLASS}` : BASE_CLASS}
      aria-label={ariaLabel}
      type="button"
    >
      <CloseIcon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}
