/**
 * 목록을 연 뒤의 화면: 왼쪽 학생 목록, 오른쪽 점수
 * 교사가 보는 화면과 학생에게 보여 주는 화면을 나누지 않습니다. 열면 대기 화면으로 시작하고,
 * 화살표 키로 대기 화면과 학생 점수를 오갑니다.
 */

import { CornersOut, CornersIn, EyeSlash, PencilSimple, Check } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useStore } from "../../store/store";
import { ConfirmDialog } from "../app/ModalDialog";
import { ExternalDisplayNotice } from "../app/ExternalDisplayNotice";
import { useWindowFileDrag } from "../app/useFileDrop";
import type { FileUpload } from "../app/useFileUpload";
import { secondaryButton } from "../buttonStyles";
import { ScoreTable } from "./ScoreTable";
import { StudentScores } from "./StudentScores";
import type { Fullscreen } from "./useFullscreen";
import { useEditMode } from "./useEditMode";
import { useScoreKeyboard } from "./useScoreKeyboard";
import { WaitScreen } from "./WaitScreen";
import { WorkSidebar } from "./WorkSidebar";

// 좁은 창에서는 목록이 학생 화면을 덮으므로 접은 채 시작합니다.
const startsExpanded = () => typeof window === "undefined" || window.innerWidth >= 768;

export function WorkScreen({
  status,
  upload,
  fullscreen,
  updateNotice,
  onOpenGuide,
}: {
  status: ReactNode;
  upload: FileUpload;
  fullscreen: Fullscreen;
  updateNotice: ReactNode;
  onOpenGuide: () => void;
}) {
  const { students, selectedStudentId, isBlackout, isEditMode, waitAfterCurrent } = useStore();
  const [isListExpanded, setIsListExpanded] = useState(startsExpanded);
  // 접어 둔 목록은 파일을 끌고 오는 동안만 펼쳐 놓는 칸을 보여 줍니다.
  const isDraggingFiles = useWindowFileDrag();
  const edit = useEditMode();
  useScoreKeyboard({ onToggleFullscreen: fullscreen.toggleFullscreen });

  // 전체화면에서 Esc를 누르면 전체화면만 풀리고 키가 오지 않을 수 있어, 풀린 것을 보고 대기 화면으로 갑니다.
  const { isExitingByApp } = fullscreen;
  useEffect(() => {
    const handleChange = () => {
      if (document.fullscreenElement) return;
      if (isExitingByApp.current) {
        isExitingByApp.current = false;
      } else {
        waitAfterCurrent();
      }
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, [isExitingByApp, waitAfterCurrent]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  let stage;
  if (edit.isEditMode) {
    stage = <ScoreTable onClose={waitAfterCurrent} />;
  } else if (isBlackout || !selectedStudent) {
    stage = <WaitScreen />;
  } else if (selectedStudent.evaluations.length === 0) {
    stage = <p className="m-auto text-xl text-ink">표시할 데이터가 없습니다.</p>;
  } else {
    stage = (
      <div className="m-auto w-full flex justify-center">
        <StudentScores student={selectedStudent} />
      </div>
    );
  }

  return (
    <div className="relative h-full flex">
      <WorkSidebar
        isExpanded={isListExpanded || (isDraggingFiles && !isEditMode)}
        onExpandedChange={setIsListExpanded}
        upload={upload}
        isDraggingFiles={isDraggingFiles}
        updateNotice={updateNotice}
        onOpenGuide={onOpenGuide}
      />

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="flex-shrink-0 flex flex-col gap-3 p-4 empty:hidden">
          {status}
          <ExternalDisplayNotice />
          <div className="flex flex-wrap justify-end gap-2">
            {!isBlackout && !edit.isEditMode && (
              <button type="button" className={secondaryButton} onClick={waitAfterCurrent}>
                <EyeSlash size={16} aria-hidden="true" />
                대기 화면
              </button>
            )}
            <button
              type="button"
              onClick={edit.toggleEditMode}
              aria-pressed={edit.isEditMode}
              className={
                edit.isEditMode
                  ? `${secondaryButton} !border-brand !bg-wash !text-accent-ink`
                  : secondaryButton
              }
            >
              {edit.isEditMode ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                <PencilSimple size={16} aria-hidden="true" />
              )}
              {edit.isEditMode ? "수정 마침" : "점수 수정"}
            </button>
            <button type="button" className={secondaryButton} onClick={fullscreen.toggleFullscreen}>
              {fullscreen.isFullscreen ? (
                <CornersIn size={16} aria-hidden="true" />
              ) : (
                <CornersOut size={16} aria-hidden="true" />
              )}
              {fullscreen.isFullscreen ? "전체화면 해제" : "전체화면"}
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex">{stage}</div>

        {!edit.isEditMode && (
          <div className="flex-shrink-0 py-3 px-4 text-small text-soft flex justify-center gap-x-4 flex-wrap">
            <span>화살표 키 : 이동</span>
            <span>F : {fullscreen.isFullscreen ? "전체화면 해제" : "전체화면"}</span>
            <span>Esc : 대기 화면</span>
          </div>
        )}
      </main>

      {edit.showConfirmDialog && (
        <ConfirmDialog
          title="점수 잠금 해제"
          confirmLabel="해제하기"
          onConfirm={edit.confirmEditMode}
          onCancel={edit.cancelEditMode}
        >
          반 전체 점수가 표로 나옵니다. 학생이 앞에 없을 때 열어 주세요. 고친 내용은 자동으로 저장됩니다.
        </ConfirmDialog>
      )}
    </div>
  );
}
