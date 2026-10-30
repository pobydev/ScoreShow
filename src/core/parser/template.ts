/**
 * 표준 서식(public/ScoreShow_Template.xlsx) 읽기
 * 2행이 제목이고 E, G, I, K, M열이 영역 이름과 점수, 바로 다음 열이 만점입니다.
 */

import { readScore } from "../normalize";
import type { ScoreIssue } from "../normalize";
import { createStudentBook, normalizeLabel } from "./shared";
import type { Grid, ParsedFile } from "./shared";

const HEADER_ROW = 1;
const FIRST_STUDENT_ROW = 2;
const AREA_COLUMNS = [4, 6, 8, 10, 12];

/**
 * 서식에 들어 있는 예시 두 줄입니다.
 * 값이 모두 같을 때만 예시로 봅니다.
 */
const SAMPLE_ROWS = [
  ["2", "1", "1", "홍길동", "9", "10", "8", "10", "18", "20", "19", "20", "19", "20"],
  ["2", "1", "2", "김철수", "7", "", "9", "", "17", "", "18", "", "18", ""],
];

function isSampleRow(cells: string[]): boolean {
  return SAMPLE_ROWS.some((sample) => sample.every((value, col) => (cells[col] ?? "") === value));
}

function parsePositiveNumber(value: string): number | null {
  if (!value) return null;
  // 점수와 같은 규칙으로 "8/10"은 앞의 8, "6,50"은 6.50으로 읽습니다.
  const [head] = value.split("/");
  const numeric = parseFloat(head.replace(/,/g, ".").replace(/[^-0-9.]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

/** 표준 서식이 아니면 null을 돌려줍니다. */
export function readTemplate(grid: Grid): ParsedFile | null {
  if (grid.length <= FIRST_STUDENT_ROW) return null;

  const labels = grid[HEADER_ROW].map(normalizeLabel);
  const gradeCol = labels.indexOf("학년");
  const classCol = labels.indexOf("반");
  const numberCol = labels.indexOf("번호");
  const nameCol = labels.indexOf("이름");
  if (classCol === -1 || numberCol === -1 || nameCol === -1) return null;

  const lastCol = grid[HEADER_ROW].length - 1;
  const firstRow = grid[FIRST_STUDENT_ROW];
  const areas = AREA_COLUMNS.filter((col) => col + 1 <= lastCol).map((col, index) => {
    // 영역 이름은 제목 줄에서만 읽습니다. 학생 칸의 글자가 영역 이름이 되면 안 됩니다.
    const label = grid[HEADER_ROW][col];
    const name = !label || /^영역\d+\s*이름?$/.test(label) ? `영역${index + 1}` : label;
    return { col, name, defaultMaxScore: parsePositiveNumber(firstRow[col + 1]) };
  });

  const studentRows = grid
    .slice(FIRST_STUDENT_ROW)
    .filter((cells) => cells[nameCol] && !isSampleRow(cells));

  // 파일 전체에서 점수가 없는 영역 칸(서식의 안 쓴 칸)은 영역으로 만들지 않습니다.
  const usedAreas = areas.filter((area) => studentRows.some((cells) => cells[area.col]));
  if (usedAreas.length === 0) return null;

  const book = createStudentBook();
  const scoreIssues: ScoreIssue[] = [];

  for (const cells of studentRows) {
    const gradeValue = gradeCol !== -1 ? parseInt(cells[gradeCol], 10) : NaN;
    const grade = Number.isFinite(gradeValue) ? gradeValue : 1;
    const classNum = parseInt(cells[classCol], 10);
    const number = parseInt(cells[numberCol], 10);
    if (!Number.isFinite(classNum) || !Number.isFinite(number)) continue;

    // 같은 학생이 다시 나오면 뒤 줄이 덮어쓰고 확인 대상으로 알립니다.
    if (book.has(grade, classNum, number)) {
      scoreIssues.push({ class: classNum, number });
    }

    const student = book.add(grade, classNum, number, cells[nameCol]);
    for (const area of usedAreas) {
      // 만점은 만점 칸에서 읽고, 비어 있으면 첫 줄의 기본 만점, 그것도 없으면 100을 씁니다.
      const maxScore =
        parsePositiveNumber(cells[area.col + 1]) ?? area.defaultMaxScore ?? 100;
      const { score, invalid } = readScore(cells[area.col], maxScore);
      if (invalid) scoreIssues.push({ class: classNum, number });
      book.setEvaluation(student, { area: area.name, score, maxScore });
    }
  }

  const students = book.sorted();
  if (students.length === 0) return null;

  return {
    students,
    scoreIssues,
    areasWithoutMax: usedAreas
      .filter((area) => area.defaultMaxScore === null)
      .map((area) => area.name),
    mapping: null,
  };
}
