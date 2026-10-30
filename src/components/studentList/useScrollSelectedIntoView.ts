import { useEffect, useRef } from "react";

/**
 * 발표 모드에서 선택된 학생이 바뀌면 그 줄을 목록 가운데로 스크롤합니다.
 * 돌려주는 Map에 학생 id별로 줄 요소를 등록해 두어야 합니다.
 */
export function useScrollSelectedIntoView(
  selectedStudentId: string | null,
  isPresenterMode: boolean,
  isBlackout: boolean
) {
  const studentRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  useEffect(() => {
    if (isPresenterMode && selectedStudentId && !isBlackout) {
      const studentElement = studentRefs.current.get(selectedStudentId);
      if (studentElement) {
        // 부드러운 스크롤로 선택된 학생을 화면 중앙에 표시
        studentElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [selectedStudentId, isPresenterMode, isBlackout]);

  return studentRefs;
}
