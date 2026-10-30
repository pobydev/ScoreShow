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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="rounded-lg p-6 shadow-xl max-w-md w-full mx-4"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderWidth: '1px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>점수 잠금 해제</h3>
        <p className="mb-6 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          점수 수정 모드를 켜면 업로드된 데이터를 직접 수정할 수 있습니다. 변경 사항은 자동 저장됩니다. 잠금을 해제할까요?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            style={{ color: 'var(--muted-foreground)' }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            해제하기
          </button>
        </div>
      </div>
    </div>
  );
}
