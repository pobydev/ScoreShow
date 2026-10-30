/**
 * 점수 잠금 해제 확인 대화상자
 */

import { primaryButton } from "../buttonStyles";

export function EditModeConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-confirm-title"
        className="rounded-window bg-card shadow-lift p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="edit-confirm-title" className="text-title-sm font-semibold text-ink mb-3">
          점수 잠금 해제
        </h3>
        <p className="mb-6 text-body text-soft">
          점수 수정 모드를 켜면 업로드된 데이터를 직접 수정할 수 있습니다. 변경 사항은 자동 저장됩니다. 잠금을 해제할까요?
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[38px] px-4 text-body font-semibold rounded-button text-soft transition-colors hover:bg-surface-hover"
          >
            취소
          </button>
          <button type="button" onClick={onConfirm} className={primaryButton}>
            해제하기
          </button>
        </div>
      </div>
    </div>
  );
}
