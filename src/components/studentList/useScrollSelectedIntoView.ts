import { useEffect, useRef } from "react";

/**
 * 지금 보는 학생이나 다음 학생이 바뀌면 그 줄이 보이도록 스크롤합니다.
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
          block: 'nearest',
        });
      }
    }
  }, [activeStudentId]);

  return studentRefs;
}
