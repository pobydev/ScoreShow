import { useEffect, useState } from "react";
import { useStore } from "../../store/store";

export type PendingDirection = "next" | "prev";

/**
 * 발표 모드 키보드 조작
 * 화살표를 한 번 누르면 화면을 비우고(화이트아웃) 같은 방향을 다시 누르면 학생을 옮깁니다.
 * 돌려주는 pendingDirection은 화이트아웃 중 진행 방향입니다.
 */
export function usePresenterKeyboard({
  currentIndex,
  onExit,
  onToggleFullscreen,
}: {
  currentIndex: number;
  onExit: () => void;
  onToggleFullscreen: () => void;
}) {
  const {
    students,
    selectedStudentId,
    isBlackout,
    nextStudent,
    prevStudent,
    setBlackout,
  } = useStore();
  const [pendingDirection, setPendingDirection] = useState<null | PendingDirection>(null);
  const studentCount = students.length;

  // 학생이 선택되고 화이트아웃이 해제되면 pendingDirection 초기화
  useEffect(() => {
    if (selectedStudentId && !isBlackout && pendingDirection !== null) {
      setPendingDirection(null);
    }
  }, [selectedStudentId, isBlackout, pendingDirection]);

  useEffect(() => {
    const isLastStudent = currentIndex >= studentCount - 1 && currentIndex >= 0;

    const leaveBlackout = (move?: () => void) => {
      move?.();
      setBlackout(false);
      setPendingDirection(null);
    };

    const handleForward = () => {
      // 첫 번째 학생 전 화이트아웃 상태에서 오른쪽 키를 누르면 첫 번째 학생으로 이동
      if (isBlackout && !selectedStudentId) {
        leaveBlackout(nextStudent);
        return;
      }
      if (isBlackout) {
        // 반대 방향 화이트아웃: 마지막 학생이면 그 학생으로 돌아가고, 아니면 다음 학생으로
        if (pendingDirection !== "next" && isLastStudent) {
          leaveBlackout();
        } else {
          leaveBlackout(nextStudent);
        }
        return;
      }
      // 마지막 학생에서 오른쪽 키는 무시 (순환 방지, 화이트아웃 상태로도 들어가지 않음)
      if (isLastStudent) {
        return;
      }
      setBlackout(true);
      setPendingDirection("next");
    };

    const handleBackward = () => {
      // 첫 번째 학생 전 화이트아웃 상태에서는 왼쪽 화살표 무시 (순환 방지)
      if (isBlackout && !selectedStudentId) {
        return;
      }
      // 첫 번째 학생에서 왼쪽 화살표는 무시 (순환 방지)
      if (!isBlackout && currentIndex === 0) {
        return;
      }
      if (!isBlackout) {
        setBlackout(true);
        setPendingDirection("prev");
      } else if (pendingDirection === "prev") {
        leaveBlackout(prevStudent);
      } else {
        leaveBlackout();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        onToggleFullscreen();
        return;
      }
      if (["ArrowRight", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        handleForward();
        return;
      }
      if (["ArrowLeft", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        handleBackward();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBlackout, nextStudent, prevStudent, setBlackout, onExit, onToggleFullscreen, pendingDirection, selectedStudentId, currentIndex, studentCount]);

  return pendingDirection;
}
