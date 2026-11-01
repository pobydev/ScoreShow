/**
 * 형식별 읽기 함수가 함께 쓰는 도구
 */

import * as XLSX from "xlsx";
import { normalizeName } from "../normalize";
import type { ScoreIssue } from "../normalize";
import type { ColumnMapping, Evaluation, Student } from "../../types";
import type { NameHint } from "./listName";

/** 시트를 칸 글자의 2차원 배열로 옮긴 것입니다. 열 번호는 시트의 실제 열 번호와 같습니다. */
export type Grid = string[][];

/** 제목을 찾는 범위: 시트의 앞쪽 15행 */
export const MAX_HEADER_ROWS = 15;

export interface ParsedFile {
  students: Student[];
  scoreIssues: ScoreIssue[];
  areasWithoutMax: string[];
  mapping: ColumnMapping | null;
  /** 저장 창의 추천 이름에 쓸 학기, 과목, 영역. 나이스 파일에만 있습니다. */
  nameHint?: NameHint;
}

export function readGrid(worksheet: XLSX.WorkSheet): Grid {
  const ref = worksheet["!ref"];
  if (!ref) return [];

  const range = XLSX.utils.decode_range(ref);
  const grid: Grid = [];
  for (let row = 0; row <= range.e.r; row++) {
    const cells: string[] = [];
    for (let col = 0; col <= range.e.c; col++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
      // 숫자는 표시 형식("8.50")이 아니라 값으로 읽습니다.
      const value = !cell ? "" : typeof cell.v === "number" ? cell.v : cell.w || cell.v || "";
      cells.push(value.toString().trim());
    }
    grid.push(cells);
  }
  return grid;
}

export function normalizeLabel(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

/** "1/12" 꼴 칸을 반과 번호로 읽습니다. */
export function parseClassNumber(value: string): { class: number; number: number } | null {
  const match = value.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return null;
  return { class: parseInt(match[1], 10), number: parseInt(match[2], 10) };
}

/** 제목 글에서 "2학년"을 찾습니다. "2025학년도"는 학년이 아닙니다. */
export function findGradeInText(text: string): number | null {
  const match = text.match(/(?:^|[^0-9])([1-6])학년(?!도)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * 학생을 모읍니다. 같은 학생이 다시 나오면 첫 이름을 두고 같은 영역의 점수를 덮어씁니다.
 */
export function createStudentBook() {
  const students = new Map<string, Student>();

  return {
    has(grade: number, classNum: number, number: number) {
      return students.has(`${grade}-${classNum}-${number}`);
    },
    add(grade: number, classNum: number, number: number, name: string): Student {
      const id = `${grade}-${classNum}-${number}`;
      let student = students.get(id);
      if (!student) {
        student = {
          id,
          grade,
          class: classNum,
          number,
          name: normalizeName(name),
          evaluations: [],
        };
        students.set(id, student);
      }
      return student;
    },
    setEvaluation(student: Student, evaluation: Evaluation) {
      const index = student.evaluations.findIndex((e) => e.area === evaluation.area);
      if (index >= 0) {
        student.evaluations[index] = evaluation;
      } else {
        student.evaluations.push(evaluation);
      }
    },
    /** 학년, 반, 번호 순으로 돌려줍니다. */
    sorted(): Student[] {
      return Array.from(students.values()).sort(
        (a, b) => a.grade - b.grade || a.class - b.class || a.number - b.number
      );
    },
  };
}
