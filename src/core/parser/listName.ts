/**
 * 저장 창에 미리 채울 추천 이름
 * 전체 영역은 "2학년 1반 1학기 과학", 한 영역은 뒤에 영역 이름이 붙습니다.
 * 찾지 못한 부분은 빼고 만듭니다. 교사가 고칠 수 있는 추천이라 틀려도 점수에는 영향이 없습니다.
 */

import type { Student } from "../../types";
import type { Grid } from "./shared";

export interface NameHint {
  term?: string;
  subject?: string;
  area?: string;
}

/** 제목 줄의 "1학기" */
function findTerm(cells: string[]): string | undefined {
  for (const cell of cells) {
    const match = cell.match(/([1-2])\s*학기/);
    if (match) return `${match[1]}학기`;
  }
  return undefined;
}

/** "과목 : 과학", 없으면 "2학년   1 과학"이나 "1학기 과학 수행평가"에서 과목을 찾습니다. */
function findSubject(cells: string[]): string | undefined {
  for (const cell of cells) {
    const labeled = cell.match(/(?:교과목|과목)\s*[:：]\s*(\S.*?)(?:\s{2,}|$)/s);
    if (labeled) return labeled[1];
  }
  for (const cell of cells) {
    const afterClass = cell.match(/[1-6]\s*학년\s+\d+\s+(\S.*?)\s*$/s);
    if (afterClass) return afterClass[1];
    const inTitle = cell.match(/학기\s+(\S+)\s+수행평가/);
    if (inTitle) return inTitle[1];
  }
  return undefined;
}

export function findNameHint(grid: Grid, headerRow: number, area?: string): NameHint {
  const cells = grid.slice(0, headerRow).flat().filter(Boolean);
  return { term: findTerm(cells), subject: findSubject(cells), area };
}

/** 학생 모두 같은 반이면 "2학년 1반", 반이 섞여 있으면 "2학년", 학년도 섞이면 뺍니다. */
function classText(students: Student[]): string | undefined {
  const grades = new Set(students.map((student) => student.grade));
  if (grades.size !== 1) return undefined;
  const classes = new Set(students.map((student) => student.class));
  const grade = `${students[0].grade}학년`;
  return classes.size === 1 ? `${grade} ${students[0].class}반` : grade;
}

export function suggestListName(students: Student[], hint: NameHint = {}): string {
  return [classText(students), hint.term, hint.subject, hint.area].filter(Boolean).join(" ");
}
