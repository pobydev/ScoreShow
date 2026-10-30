/**
 * 발표 모드 컴포넌트
 * 학생을 한 명씩 개별적으로 보여주어 비밀을 보호하면서 점수를 확인할 수 있도록 합니다.
 * 큰 폰트를 사용하여 정보를 확실하게 파악할 수 있도록 하며,
 * 출력물을 가려가며 보여주던 번거로운 과정을 해결합니다.
 */

import { useCallback, useState } from "react";
import { useStore } from "../store/store";
import { StudentList } from "./StudentList";
import { PresenterActionButton } from "./presenter/PresenterActionButton";
import { PresenterSidebar } from "./presenter/PresenterSidebar";
import { StudentScores } from "./presenter/StudentScores";
import { useFullscreen } from "./presenter/useFullscreen";
import { usePresenterKeyboard } from "./presenter/usePresenterKeyboard";

const FADE_IN_CSS = `
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `;

export function Presenter() {
  const { students, selectedStudentId, isBlackout, setPresenterMode } = useStore();
  const [isListExpanded, setIsListExpanded] = useState(true);
  const { isFullscreen, toggleFullscreen, exitFullscreen } = useFullscreen();

  const currentIndex = selectedStudentId
    ? students.findIndex((s) => s.id === selectedStudentId)
    : -1; // 화이트아웃 상태에서는 -1
  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const exitPresenter = useCallback(() => {
    setPresenterMode(false);
    exitFullscreen();
  }, [setPresenterMode, exitFullscreen]);

  const pendingDirection = usePresenterKeyboard({
    currentIndex,
    onExit: exitPresenter,
    onToggleFullscreen: toggleFullscreen,
  });

  // 아래 세 화면은 자식 순서를 맞춰 두어야 화면이 바뀌어도 목록과 스크롤 위치가 유지됩니다.
  if (isBlackout) {
    return (
      <div className="fixed inset-0 z-50 flex bg-canvas">
        {/* 우측 상단 종료 버튼 (블랙아웃 상태에서도 표시) */}
        <PresenterActionButton
          floating
          label="발표모드 종료"
          ariaLabel="발표 모드 종료"
          onClick={exitPresenter}
        />

        {/* 좌측: 학생 리스트 */}
        <PresenterSidebar isExpanded={isListExpanded} onExpandedChange={setIsListExpanded}>
          <StudentList blackoutBetweenIdx={currentIndex} pendingDirection={pendingDirection ?? undefined} />
        </PresenterSidebar>

        {/* 우측: 화이트아웃 메시지 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xl md:text-2xl text-soft">
            {!selectedStudentId
              ? "화살표 키(←→↑↓)를 누르면 다음 학생으로 이동"
              : "화살표 키(←→↑↓)를 누르면 전후 학생으로 이동"}
          </div>
        </div>
      </div>
    );
  }

  if (!selectedStudent || selectedStudent.evaluations.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex bg-canvas">
        {/* 우측 상단 종료 버튼 */}
        <PresenterActionButton
          floating
          label="발표모드 종료"
          ariaLabel="발표 모드 종료"
          onClick={exitPresenter}
        />

        {/* 좌측: 학생 리스트 */}
        <PresenterSidebar isExpanded={isListExpanded} onExpandedChange={setIsListExpanded}>
          <StudentList />
        </PresenterSidebar>

        {/* 우측: 안내 메시지 */}
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xl text-ink">표시할 데이터가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-canvas">
      {/* 우측 상단 버튼들 */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        {/* 전체화면 해제 버튼 (전체화면일 때만 표시) */}
        {isFullscreen && (
          <PresenterActionButton
            label="전체화면 해제"
            ariaLabel="전체화면 해제"
            onClick={toggleFullscreen}
          />
        )}
        {/* 발표 모드 종료 버튼 */}
        <PresenterActionButton
          label="발표모드 종료"
          ariaLabel="발표 모드 종료"
          onClick={exitPresenter}
        />
      </div>

      {/* 좌측: 학생 리스트 */}
      <PresenterSidebar isExpanded={isListExpanded} onExpandedChange={setIsListExpanded}>
        <StudentList />
      </PresenterSidebar>

      {/* 우측: 학생 정보 */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <StudentScores student={selectedStudent} />
        </div>

        {/* 하단 단축키 안내 - 고정 위치 */}
        <div
          className={`absolute bottom-8 right-0 text-small text-soft flex justify-center gap-4 flex-wrap pointer-events-none transition-all duration-300 ${
            isListExpanded ? "left-64" : "left-0"
          }`}
        >
          <span>← → ↑ ↓ : 이동</span>
          <span>F : {isFullscreen ? "전체화면 해제" : "전체화면"}</span>
          <span>Esc : 종료</span>
        </div>
      </div>

      <style>{FADE_IN_CSS}</style>
    </div>
  );
}
