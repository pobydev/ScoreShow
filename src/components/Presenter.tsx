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

// 좁은 창에서는 목록이 학생 화면을 덮으므로 접은 채 시작합니다.
const startsExpanded = () => typeof window === "undefined" || window.innerWidth >= 768;

export function Presenter() {
  const { students, selectedStudentId, isBlackout, setPresenterMode } = useStore();
  const [isListExpanded, setIsListExpanded] = useState(startsExpanded);
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

  let stage;
  if (isBlackout) {
    stage = (
      <div className="text-xl md:text-2xl text-soft text-center px-8">
        {!selectedStudentId
          ? "화살표 키(←→↑↓)를 누르면 다음 학생으로 이동"
          : "화살표 키(←→↑↓)를 누르면 전후 학생으로 이동"}
      </div>
    );
  } else if (!selectedStudent || selectedStudent.evaluations.length === 0) {
    stage = <p className="text-xl text-ink">표시할 데이터가 없습니다.</p>;
  } else {
    stage = <StudentScores student={selectedStudent} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-canvas">
      {/* 좌측: 학생 리스트. 화면이 바뀌어도 같은 자리에 남아 스크롤 위치가 유지됩니다. */}
      <PresenterSidebar isExpanded={isListExpanded} onExpandedChange={setIsListExpanded}>
        <StudentList
          blackoutBetweenIdx={isBlackout ? currentIndex : undefined}
          pendingDirection={isBlackout ? pendingDirection ?? undefined : undefined}
        />
      </PresenterSidebar>

      {/* 우측: 학생 화면 */}
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="flex-shrink-0 flex flex-wrap justify-end gap-2 p-4">
          {/* 전체화면 해제 버튼 (전체화면일 때만 표시) */}
          {isFullscreen && (
            <PresenterActionButton label="전체화면 해제" onClick={toggleFullscreen} />
          )}
          {/* 발표 모드 종료 버튼 */}
          <PresenterActionButton label="발표 종료" onClick={exitPresenter} />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex">
          <div className="m-auto w-full flex justify-center">{stage}</div>
        </div>

        {/* 하단 단축키 안내 */}
        {!isBlackout && (
          <div className="flex-shrink-0 py-3 px-4 text-small text-soft flex justify-center gap-x-4 flex-wrap">
            <span>← → ↑ ↓ : 이동</span>
            <span>F : {isFullscreen ? "전체화면 해제" : "전체화면"}</span>
            <span>Esc : 종료</span>
          </div>
        )}
      </main>
    </div>
  );
}
