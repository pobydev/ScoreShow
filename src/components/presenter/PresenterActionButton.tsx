/**
 * 발표 화면 오른쪽 위의 닫기 모양 버튼
 */

import { secondaryButton } from "../buttonStyles";
import { CloseIcon } from "../icons";

export function PresenterActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={secondaryButton} type="button">
      <CloseIcon className="w-4 h-4" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
