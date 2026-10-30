/**
 * 오른쪽 작업 영역: 학생 제목, 점수 수정, 발표 시작, 점수 카드
 */

import type { ReactNode } from "react";
import { useStore } from "../store/store";
import { primaryButton, secondaryButton } from "./buttonStyles";
import { VideoIcon } from "./icons";
import { EditModeConfirmDialog } from "./preview/EditModeConfirmDialog";
import { NoEvaluations, NoStudentSelected } from "./preview/EmptyStates";
import { EvaluationEditor } from "./preview/EvaluationEditor";
import { EvaluationSummary } from "./preview/EvaluationSummary";
import { useEditMode } from "./preview/useEditMode";

function StartPresenterButton() {
  return (
    <button
      type="button"
      onClick={() => useStore.getState().setPresenterMode(true)}
      className={primaryButton}
    >
      <VideoIcon className="w-4 h-4" aria-hidden="true" />
      발표 시작
    </button>
  );
}

export function PreviewPanel({ status }: { status: ReactNode }) {
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

  return (
    <main className="min-w-0 flex flex-col gap-5 p-4 md:flex-1 md:min-h-0 md:p-7">
      {status}

      <div className="flex-shrink-0 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {selectedStudent && (
            <>
              <h2 className="text-title font-bold text-ink">
                {selectedStudent.grade}학년 {selectedStudent.class}반{" "}
                {selectedStudent.number}번
              </h2>
              <p className="text-emph text-soft mt-1">{selectedStudent.name}</p>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedStudent && (
            <button
              type="button"
              onClick={toggleEditMode}
              aria-pressed={isEditMode}
              className={
                isEditMode
                  ? `${secondaryButton} !border-brand !bg-wash !text-accent-ink`
                  : secondaryButton
              }
            >
              {isEditMode ? "수정 마침" : "점수 수정"}
            </button>
          )}
          <StartPresenterButton />
        </div>
      </div>

      {selectedStudent ? (
        <div className="md:flex-1 md:min-h-0 md:overflow-y-auto custom-scrollbar">
          <h3 className="sr-only">평가 결과</h3>
          {isEditMode && (
            <p className="text-caption text-soft mb-3">
              영역 이름, 점수, 만점을 직접 수정할 수 있습니다. 변경 사항은 자동 저장되며, 수정 마침을 누르면 다시 잠겨 실수 입력을 막습니다.
            </p>
          )}
          {selectedStudent.evaluations.length === 0 ? (
            <NoEvaluations />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5 p-px">
              {selectedStudent.evaluations.map((evaluation, index) => (
                <div key={index} className="rounded-card bg-card shadow-card p-[18px]">
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
      ) : (
        <NoStudentSelected />
      )}

      <p className="flex-shrink-0 text-caption text-soft">데이터는 이 컴퓨터에만 저장됩니다.</p>

      {showConfirmDialog && (
        <EditModeConfirmDialog onConfirm={confirmEditMode} onCancel={cancelEditMode} />
      )}
    </main>
  );
}
