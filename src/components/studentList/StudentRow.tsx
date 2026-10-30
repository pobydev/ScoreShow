/**
 * 학생 목록의 한 줄
 * 선택된 줄은 색 외에 왼쪽 막대와 굵은 글자로도 구분합니다.
 */

import type { Ref } from "react";
import type { Student } from "../../types";

export function StudentRow({
  student,
  showClass,
  isSelected,
  rowRef,
  onSelect,
}: {
  student: Student;
  showClass: boolean;
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
      className={`flex items-baseline gap-2 px-2.5 py-2 rounded-input text-body cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset ${
        isSelected
          ? "font-semibold bg-wash text-accent-ink shadow-[inset_3px_0_0_var(--brand)]"
          : "text-ink hover:bg-surface-hover"
      }`}
    >
      <span className={`flex-shrink-0 ${isSelected ? "" : "text-soft"}`}>
        {showClass && `${student.grade}학년 ${student.class}반 `}
        {student.number}번
      </span>
      <span className="min-w-0 truncate">{student.name}</span>
      {student.evaluations.length > 0 && (
        <span className="ml-auto flex-shrink-0 text-caption font-normal text-soft">
          영역 {student.evaluations.length}개
        </span>
      )}
    </li>
  );
}
