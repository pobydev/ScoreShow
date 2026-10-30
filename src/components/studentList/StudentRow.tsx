/**
 * 학생 목록의 한 줄
 */

import type { CSSProperties, Ref } from "react";
import type { Student } from "../../types";

function rowStyle(
  isSelected: boolean,
  isPresenterMode: boolean
): CSSProperties | undefined {
  if (isSelected) {
    return isPresenterMode
      ? {
          backgroundColor: 'var(--sidebar-primary)',
          color: 'var(--sidebar-primary-foreground)'
        }
      : {
          backgroundColor: 'var(--accent)',
          color: 'var(--accent-foreground)'
        };
  }
  return isPresenterMode ? { color: 'var(--sidebar-foreground)' } : undefined;
}

export function StudentRow({
  student,
  isSelected,
  isPresenterMode,
  rowRef,
  onSelect,
}: {
  student: Student;
  isSelected: boolean;
  isPresenterMode: boolean;
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
      className={`p-3 cursor-pointer transition-colors py-2 my-0 outline-none focus:outline-none ${
        isSelected ? "font-semibold" : ""
      }`}
      style={rowStyle(isSelected, isPresenterMode)}
      onMouseEnter={!isSelected ? (e) => {
        e.currentTarget.style.backgroundColor = isPresenterMode
          ? 'var(--sidebar-accent)'
          : 'var(--accent)';
      } : undefined}
      onMouseLeave={!isSelected ? (e) => {
        e.currentTarget.style.backgroundColor = '';
      } : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">
          {student.grade}학년 {student.class}반 {student.number}번
        </span>
        <span className="text-sm">{student.name}</span>
      </div>
      {student.evaluations.length > 0 && (
        <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
          평가 영역: {student.evaluations.length}개
        </div>
      )}
    </li>
  );
}
