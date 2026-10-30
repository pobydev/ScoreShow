/**
 * 점수 잠금 해제 확인 대화상자
 */

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
        className="rounded-window bg-card shadow-lift p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-title-sm font-semibold text-ink mb-3">점수 잠금 해제</h3>
        <p className="mb-6 text-body text-soft">
          점수 수정 모드를 켜면 업로드된 데이터를 직접 수정할 수 있습니다. 변경 사항은 자동 저장됩니다. 잠금을 해제할까요?
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-small font-semibold rounded-button text-soft transition-colors hover:bg-surface-hover"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-small font-semibold rounded-button bg-accent text-white transition-colors hover:bg-accent-hover"
          >
            해제하기
          </button>
        </div>
      </div>
    </div>
  );
}
