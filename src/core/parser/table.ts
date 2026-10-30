/**
 * 그 밖의 일반 표 읽기
 * "1/12" 꼴 반/번호 칸이 있는 표를 칸 제목으로 매핑해 한 줄씩 읽습니다.
 * 반과 번호가 따로 있는 표는 지원하지 않습니다. 표준 서식에 붙여 넣도록 안내합니다.
 */

import { autoDetectMapping } from "../mapping";
import { ABSENCE_KEYWORDS, normalizeRow } from "../normalize";
import type { ScoreIssue } from "../normalize";
import type { ColumnMapping, ParsedRow } from "../../types";
import {
  MAX_HEADER_ROWS,
  createStudentBook,
  findGradeInText,
  normalizeLabel,
  parseClassNumber,
} from "./shared";
import type { Grid, ParsedFile } from "./shared";

/** 행마다 영역이 있는 표(세로형)의 영역 칸 제목 */
const AREA_PER_ROW_LABEL = /^(평가영역|영역|과제명|항목|area)$/;

/** 학생이 시작되는 줄을 찾습니다. 못 찾으면 -1입니다. */
function findFirstStudentRow(grid: Grid, mapping: ColumnMapping, isProvided: boolean): number {
  const classCol = mapping.class ?? mapping.number;
  if (classCol === undefined) return -1;

  const headerArea = grid.slice(0, MAX_HEADER_ROWS);
  const classHeaderRow = headerArea.findIndex((cells) =>
    cells.some((cell) => /반.*번호/.test(cell))
  );
  const searchFrom = classHeaderRow + 1;

  for (let row = searchFrom; row < grid.length; row++) {
    if (parseClassNumber(grid[row][classCol])) return row;
  }

  // 반/번호 제목 아래가 숫자뿐인 표와, 호출자가 반과 번호 칸을 직접 지정한 표
  for (let row = searchFrom; row < grid.length; row++) {
    if (!/^\d+$/.test(grid[row][classCol])) continue;
    if (isProvided || classHeaderRow >= 0) return row;
  }
  return -1;
}

export function readTable(grid: Grid, providedMapping?: ColumnMapping): ParsedFile {
  const headerArea = grid.slice(0, MAX_HEADER_ROWS);
  const mapping = providedMapping ?? autoDetectMapping(headerArea);
  // 표 위 제목이 같은 열에 있어 학년 칸으로 잡혔을 뿐 반/번호 칸을 학년으로 읽으면 안 됩니다.
  if (!providedMapping && mapping.grade !== undefined && mapping.grade === mapping.class) {
    delete mapping.grade;
  }

  const empty: ParsedFile = {
    students: [],
    scoreIssues: [],
    areasWithoutMax: [],
    mapping,
  };
  const firstRow = findFirstStudentRow(grid, mapping, Boolean(providedMapping));
  if (firstRow === -1) return empty;

  const titleGrade = headerArea
    .flat()
    .map(findGradeInText)
    .find((grade) => grade !== null);
  const hasAreaPerRow =
    mapping.area !== undefined &&
    headerArea.some((cells) => AREA_PER_ROW_LABEL.test(normalizeLabel(cells[mapping.area!])));

  const cellAt = (cells: string[], col: number | undefined) =>
    col === undefined ? undefined : cells[col];

  const book = createStudentBook();
  const scoreIssues: ScoreIssue[] = [];

  for (let row = firstRow; row < grid.length; row++) {
    const cells = grid[row];
    // 결시 사유는 점수 칸 밖에 있습니다. 이름은 보지 않습니다.
    const hasAbsenceReason = cells.some(
      (cell, col) => col !== mapping.score && col !== mapping.name && ABSENCE_KEYWORDS.test(cell)
    );

    const parsed: ParsedRow = {
      grade: titleGrade?.toString() ?? cellAt(cells, mapping.grade) ?? "1",
      class: cellAt(cells, mapping.class),
      number: cellAt(cells, mapping.number),
      name: cellAt(cells, mapping.name),
      area: hasAreaPerRow ? cellAt(cells, mapping.area) : undefined,
      score: hasAbsenceReason ? "" : cellAt(cells, mapping.score),
      maxScore: cellAt(cells, mapping.maxScore),
    };

    const normalized = normalizeRow(parsed);
    if (!normalized) continue;
    if (normalized.scoreInvalid) {
      scoreIssues.push({ class: normalized.class, number: normalized.number });
    }
    const student = book.add(
      normalized.grade,
      normalized.class,
      normalized.number,
      normalized.name
    );
    book.setEvaluation(student, normalized.evaluation);
  }

  const students = book.sorted();
  return {
    students,
    scoreIssues,
    // 만점 칸이 없어 100으로 둔 영역을 알립니다.
    areasWithoutMax:
      mapping.maxScore === undefined
        ? [...new Set(students.flatMap((s) => s.evaluations.map((e) => e.area)))]
        : [],
    mapping,
  };
}
