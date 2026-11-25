import { useEffect, useRef } from "react";

/**
 * 지금 보는 학생이나 다음 학생이 바뀌면 그 줄이 목록 가운데에 오도록 스크롤합니다.
 * 방향키로 넘길 때 앞뒤 학생이 넉넉히 보이게 하려는 것입니다. 목록 처음과 끝에서는 더 갈 곳이 없어 가장자리에 머뭅니다.
 * 돌려주는 Map에 학생 id별로 줄 요소를 등록해 두어야 합니다.
 */
export function useScrollSelectedIntoView(
  activeStudentId: string | null
) {
  const studentRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  useEffect(() => {
    if (activeStudentId) {
      const studentElement = studentRefs.current.get(activeStudentId);
      if (studentElement) {
        studentElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [activeStudentId]);

  return studentRefs;
}
