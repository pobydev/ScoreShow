import { useEffect, useRef } from "react";

/**
 * 지금 보는 학생 줄이 목록 가운데에 오도록 목록을 스크롤합니다.
 * 대기 화면에서는 대기 위치 막대를 가운데에 두어, 방금 본 학생과 다음 학생이 위아래로 함께 보이게 합니다.
 * 목록 처음과 끝에서는 더 갈 곳이 없어 가장자리에 머뭅니다.
 *
 * 목록 스크롤은 여기 한 곳에서만 합니다. 막대와 줄이 저마다 scrollIntoView를 부르면
 * 나중 호출이 앞의 부드러운 스크롤을 끊어 목록이 아예 움직이지 않을 수 있습니다(개발판에서 그랬음).
 * scrollIntoView 대신 목록 상자만 스크롤해서 바깥 화면은 건드리지 않습니다.
 *
 * 돌려주는 studentRefs에 학생 id별로 줄 요소를, listRef에 스크롤되는 목록 상자를 달아야 합니다.
 */
export function useScrollSelectedIntoView(
  activeStudentId: string | null,
  isBlackout: boolean
) {
  const studentRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const target = isBlackout
      ? list.querySelector<HTMLElement>('li[aria-label="대기 위치"]')
      : activeStudentId
        ? studentRefs.current.get(activeStudentId)
        : null;
    if (!target) return;

    const listBox = list.getBoundingClientRect();
    const targetBox = target.getBoundingClientRect();
    const targetTop = list.scrollTop + (targetBox.top - listBox.top);
    const maxTop = list.scrollHeight - list.clientHeight;
    const top = Math.min(maxTop, Math.max(0, targetTop - (list.clientHeight - targetBox.height) / 2));
    list.scrollTo({ top, behavior: "smooth" });
  }, [activeStudentId, isBlackout]);

  return { studentRefs, listRef };
}
