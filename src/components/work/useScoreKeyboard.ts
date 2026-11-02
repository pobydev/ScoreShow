import { useEffect } from "react";
import { useStore } from "../../store/store";

/** 입력칸에서 친 글자와 화살표는 칸의 것이고, 창이 열려 있으면 창의 것입니다. */
function isTypingOrInDialog(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return (
    element?.tagName === "INPUT" ||
    element?.tagName === "TEXTAREA" ||
    document.querySelector("dialog[open]") !== null
  );
}

/**
 * 점수 화면 키보드 조작
 * 학생을 보다가 화살표를 누르면 그쪽 사이의 대기 화면으로 갑니다.
 * 대기 화면에서는 왼쪽 키가 막대 위 학생, 오른쪽 키가 막대 아래 학생입니다.
 * Esc는 어느 때든 바로 대기 화면으로 갑니다. 표가 열려 있으면 먼저 닫습니다.
 * 표가 열려 있을 때 위아래 키는 표를 스크롤합니다. 왼쪽 오른쪽 키는 표를 닫습니다.
 * 학생을 보여 주려고 누른 키에 표가 그대로 남아 있으면 안 되기 때문입니다.
 * F는 글자가 아니라 키 위치로 봅니다. 글자로 보면 한글 입력 상태에서 동작하지 않습니다.
 */
export function useScoreKeyboard({
  onToggleFullscreen,
}: {
  onToggleFullscreen: () => void;
}) {
  useEffect(() => {
    const press = (forward: boolean) => {
      const state = useStore.getState();

      // 표가 열린 채 학생에게 넘어가지 않도록 먼저 닫습니다.
      if (state.isEditMode) {
        state.waitAfterCurrent();
      } else if (state.isBlackout) {
        if (forward) state.showBelow();
        else state.showAbove();
      } else if (forward) {
        state.waitAfterCurrent();
      } else {
        state.waitBeforeCurrent();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingOrInDialog(e.target)) return;

      if (e.key === "Escape") {
        useStore.getState().waitAfterCurrent();
        return;
      }
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.code === "KeyF") {
        onToggleFullscreen();
        return;
      }
      const isForward = ["ArrowRight", "ArrowDown"].includes(e.key);
      const isBackward = ["ArrowLeft", "ArrowUp"].includes(e.key);
      if (!isForward && !isBackward) return;
      if (useStore.getState().isEditMode && ["ArrowUp", "ArrowDown"].includes(e.key)) return;

      e.preventDefault();
      press(isForward);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggleFullscreen]);
}
