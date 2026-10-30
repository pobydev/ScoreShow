/**
 * 학생 정보 미리보기 패널
 */

import { useStore } from "../store/store";
import { DeleteDataButton, StartPresenterButton } from "./preview/ActionButtons";
import { EditModeConfirmDialog } from "./preview/EditModeConfirmDialog";
import { NoEvaluations, NoStudentSelected } from "./preview/EmptyStates";
import { EvaluationEditor } from "./preview/EvaluationEditor";
import { EvaluationSummary } from "./preview/EvaluationSummary";
import { useEditMode } from "./preview/useEditMode";

export function PreviewPanel() {
  const { students, selectedStudentId, updateEvaluation } = useStore();

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const {
    isEditMode,
    firstInputRef,
    showConfirmDialog,
    toggleEditMode,
    confirmEditMode,
    cancelEditMode,
  } = useEditMode(selectedStudent);

  if (!selectedStudent) {
    return (
      <div className="rounded-lg shadow p-8 h-full flex flex-col" style={{ backgroundColor: 'var(--card)' }}>
        {/* 버튼 영역 - 학생이 없을 때도 표시 */}
        {students.length > 0 && (
          <div className="mb-4 pb-4 border-b flex justify-end gap-2" style={{ borderColor: 'var(--border)' }}>
            <StartPresenterButton />
            <DeleteDataButton />
          </div>
        )}
        <NoStudentSelected />
      </div>
    );
  }

  return (
    <div className="rounded-lg shadow p-4 h-full flex flex-col" style={{ backgroundColor: 'var(--card)' }}>
      {/* 버튼 영역 */}
      {students.length > 0 && (
        <div className="mb-4 pb-4 border-b flex flex-wrap justify-end gap-2" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={toggleEditMode}
            className="px-4 py-2 text-sm font-semibold rounded-lg border flex items-center gap-2 transition-colors"
            style={{
              borderColor: isEditMode ? 'var(--primary)' : 'var(--border)',
              color: isEditMode ? 'var(--primary)' : 'var(--foreground)',
            }}
            aria-label="점수 편집 모드 전환"
          >
            {isEditMode ? "🔓 편집 중 (잠그기)" : "🔒 점수 잠금 해제"}
          </button>
          <StartPresenterButton />
          <DeleteDataButton />
        </div>
      )}

      {/* 학생 정보 */}
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-1">
          {selectedStudent.grade}학년 {selectedStudent.class}반{" "}
          {selectedStudent.number}번
        </h2>
        <p className="text-lg" style={{ color: 'var(--foreground)' }}>{selectedStudent.name}</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <h3 className="text-base font-semibold mb-2">평가 결과</h3>
        {isEditMode && (
          <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>
            편집 모드에서는 영역 이름, 점수, 만점을 직접 수정할 수 있습니다. 변경 사항은 자동 저장되며, 다시 잠그면 실수 입력을 방지할 수 있습니다.
          </p>
        )}
        {selectedStudent.evaluations.length === 0 ? (
          <NoEvaluations />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedStudent.evaluations.map((evaluation, index) => (
              <div
                key={index}
                className="border rounded-lg p-3 hover:shadow-md transition-shadow"
                style={{ borderColor: 'var(--border)' }}
              >
                {isEditMode ? (
                  <EvaluationEditor
                    evaluation={evaluation}
                    areaInputRef={index === 0 ? firstInputRef : undefined}
                    onUpdate={(updates) => updateEvaluation(selectedStudent.id, index, updates)}
                  />
                ) : (
                  <EvaluationSummary evaluation={evaluation} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showConfirmDialog && (
        <EditModeConfirmDialog onConfirm={confirmEditMode} onCancel={cancelEditMode} />
      )}
    </div>
  );
}
