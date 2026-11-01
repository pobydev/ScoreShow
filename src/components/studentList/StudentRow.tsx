/**
 * 학생 목록의 한 줄: 번호 칸, 이름
 * 지금 보는 학생은 색 외에 굵은 글자와 오른쪽 점으로도 구분합니다.
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
      className={`flex items-center scroll-my-2 rounded-button border transition-colors ${
        isSelected ? "bg-wash border-tint" : "border-transparent hover:bg-surface-hover"
      }`}
    >
      <div
        data-student-row="true"
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
        aria-current={isSelected || undefined}
        aria-label={`${student.grade}학년 ${student.class}반 ${student.number}번 ${student.name}`}
        className={`flex-1 min-w-0 flex items-center gap-2.5 py-1.5 pl-2 pr-3 rounded-button text-emph cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2 ${
          isSelected ? "font-semibold text-accent-ink" : "text-ink"
        }`}
      >
        <span
          className={`flex-shrink-0 w-[30px] h-[30px] grid place-items-center rounded-input text-small tabular-nums ${
            isSelected ? "bg-tint text-accent-ink font-semibold" : "bg-surface-hover text-soft"
          }`}
        >
          {student.number}
        </span>
        {showClass && <small className="flex-shrink-0 text-caption text-soft">{student.class}반</small>}
        <span className="min-w-0 truncate">{student.name}</span>
        {isSelected && (
          <i className="ml-auto flex-shrink-0 w-[6px] h-[6px] rounded-full bg-brand" aria-hidden="true" />
        )}
      </div>
    </li>
  );
}
