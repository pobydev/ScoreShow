/**
 * 대기 화면의 위치
 * 대기 화면은 두 학생 사이입니다. waitGap은 막대 바로 위 학생의 순번이고, 첫 학생 위는 -1입니다.
 */

import type { Student } from "../types";

export function waitNeighbors(students: Student[], waitGap: number) {
  return {
    above: students[waitGap] ?? null,
    below: students[waitGap + 1] ?? null,
  };
}

/** 대기 화면 버튼에 쓰는 이름. 이름은 넣지 않고 번호만 씁니다. 반이 섞여 있으면 반을 붙입니다. */
export function studentNumberText(student: Student, students: Student[]) {
  const hasManyClasses = new Set(students.map((s) => `${s.grade}-${s.class}`)).size > 1;
  return hasManyClasses ? `${student.class}반 ${student.number}번` : `${student.number}번`;
}
