/**
 * 학생 목록의 한 줄
 * 선택된 줄은 색 외에 왼쪽 막대와 굵은 글자로도 구분합니다.
 */

import type { Ref } from "react";
import type { Student } from "../../types";

export function StudentRow({
  student,
  isSelected,
  rowRef,
  onSelect,
}: {
  student: Student;
  isSelected: boolean;
  rowRef: Ref<HTMLLIElement>;
  onSelect: () => void;
}) {
  return (
    <li
      ref={rowRef}
      onClick={(e) => {
        onSelect();
        // 클릭 후 포커스 제거 (검은 네모 박스 제거)
        e.currentTarget.blur();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
          // 키보드 선택 후 포커스 제거
          e.currentTarget.blur();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${student.grade}학년 ${student.class}반 ${student.number}번 ${student.name}`}
      className={`px-3 py-2 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset ${
        isSelected
          ? "font-semibold bg-wash text-accent-ink shadow-[inset_3px_0_0_var(--brand)]"
          : "text-ink hover:bg-surface-hover"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-small">
          {student.grade}학년 {student.class}반 {student.number}번
        </span>
        <span className="text-small">{student.name}</span>
      </div>
      {student.evaluations.length > 0 && (
        <div className="text-caption font-normal mt-0.5 text-soft">
          평가 영역: {student.evaluations.length}개
        </div>
      )}
    </li>
  );
}
