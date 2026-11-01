/**
 * 나이스 파일 읽기
 *
 * 나이스 파일은 과목과 저장 형식(XLS, XLS data)이 달라도 칸의 종류와 순서가 같습니다.
 * 줄과 열 번호는 파일마다 다르므로 "반/번호" 제목 줄을 찾아 그 줄의 칸 제목으로 열을 정합니다.
 * 제목 줄 아래에서 칸이 "1/12" 꼴인 줄만 학생이고, 합계와 비고 칸, 아래쪽 통계 줄은 읽지 않습니다.
 */

import type * as XLSX from "xlsx";
import { ABSENCE_KEYWORDS, readScore } from "../normalize";
import type { ScoreIssue } from "../normalize";
import {
  MAX_HEADER_ROWS,
  createStudentBook,
  findGradeInText,
  normalizeLabel,
  parseClassNumber,
} from "./shared";
import type { Grid, ParsedFile } from "./shared";
import { findNameHint } from "./listName";

/** 한 줄에 한 영역씩 점수가 있음을 나타내는 칸 제목 */
const SCORE_LABEL = /^(점수|득점|원점수|성취점)$/;

/** 일반 표(세로형)임을 나타내는 칸 제목 */
const FLAT_TABLE_LABEL = /^(평가영역|영역|과제명|항목|만점|배점)$/;

/** 숫자가 들어 있어도 평가 영역이 아닌 칸 */
const NON_AREA_LABEL =
  /비고|합계|총점|총계|소계|평균|석차|등수|순위|등급|성취도|백분위|표준편차|환산|반영|학번|번호|성별|생년월일|결시|사유|^학년$|^반$|(?:만점|배점)$/;

export interface NiceHeader {
  row: number;
  labels: string[];
  classCol: number;
  nameCol: number;
  gradeCol: number;
  /** 위쪽 제목의 "N학년" */
  titleGrade: number | null;
  /** 제목 줄 아래에서 칸이 "1/12" 꼴인 줄 */
  studentRows: number[];
}

/** "반/번호"와 "성명" 칸이 함께 있는 줄을 찾습니다. */
export function findNiceHeader(grid: Grid): NiceHeader | null {
  const lastRow = Math.min(MAX_HEADER_ROWS, grid.length);
  for (let row = 0; row < lastRow; row++) {
    const labels = grid[row];
    const normalized = labels.map(normalizeLabel);
    const classCol = normalized.findIndex((label) => label === "반/번호" || label === "반번호");
    const nameCol = normalized.findIndex((label) => label === "성명" || label === "이름");
    if (classCol === -1 || nameCol === -1) continue;

    const studentRows: number[] = [];
    for (let r = row + 1; r < grid.length; r++) {
      if (parseClassNumber(grid[r][classCol])) studentRows.push(r);
    }
    return {
      row,
      labels,
      classCol,
      nameCol,
      gradeCol: normalized.findIndex((label) => label === "학년"),
      titleGrade:
        grid
          .slice(0, row)
          .flat()
          .map(findGradeInText)
          .find((grade) => grade !== null) ?? null,
      studentRows,
    };
  }
  return null;
}

/** 위쪽 안내 줄의 "영역 : 듣기"를 찾습니다. */
function findAreaInTitle(grid: Grid, headerRow: number): string | null {
  for (let row = 0; row < headerRow; row++) {
    for (const cell of grid[row]) {
      // 이름 안의 공백은 살리되 두 칸 이상의 공백이나 만점 표기에서 끊습니다.
      const match = cell.match(/영역\s*[:：]\s*(\S.*?)(?:\s{2,}|\s*(?:영역)?만점\s*[:：]|$)/s);
      if (match) {
        const name = match[1].replace(/[(（][^)）]*[)）]/g, " ").trim();
        if (name) return name;
      }
    }
  }
  return null;
}

/** 위쪽 안내 줄의 "영역만점 : 10.00"을 찾습니다. */
function findMaxScoreInTitle(grid: Grid, headerRow: number): number | null {
  for (let row = 0; row < headerRow; row++) {
    for (const cell of grid[row]) {
      const match = cell.match(/만점\s*[:：]\s*(\d+\.?\d*)/);
      if (match) return parseFloat(match[1]) || null;
    }
  }
  return null;
}

function studentIdentity(grid: Grid, header: NiceHeader, row: number) {
  const cells = grid[row];
  const parsed = parseClassNumber(cells[header.classCol]);
  if (!parsed) return null;

  // 학년 칸이 있으면 그 값, 없으면 위쪽 제목의 "N학년"을 씁니다.
  const gradeValue = header.gradeCol >= 0 ? parseInt(cells[header.gradeCol], 10) : NaN;
  const grade = Number.isFinite(gradeValue) ? gradeValue : header.titleGrade ?? 1;

  // 성명 칸이 비어도 학생을 빼지 않고 반/번호로 보여 줍니다.
  const name = cells[header.nameCol] || `${parsed.class}/${parsed.number}`;
  return { grade, classNum: parsed.class, number: parsed.number, name };
}

/** 영역 칸의 만점: 칸 제목 안을 먼저 보고, 없으면 첫 학생 위의 두 줄까지 봅니다. */
function findAreaMaxScore(grid: Grid, header: NiceHeader, col: number): number | null {
  const sameCell = header.labels[col].match(/만점\s*[:：]?\s*(\d+\.?\d*)/);
  if (sameCell) return parseFloat(sameCell[1]) || null;

  const firstStudent = header.studentRows[0] ?? grid.length;
  for (let row = header.row + 1; row <= header.row + 2 && row < firstStudent; row++) {
    const below = grid[row][col].match(/만점\s*[:：]?\s*(\d+\.?\d*)/);
    if (below) return parseFloat(below[1]) || null;
  }
  return null;
}

interface AreaColumn {
  col: number;
  name: string;
  maxScore: number | null;
}

/**
 * 성명 칸 뒤의 이름 있는 칸 가운데 학생 줄에 점수나 결시 값이 있거나 만점 표기가 있는 칸이 영역입니다.
 * 낱말 목록에 기대지 않으므로 과목이 달라도 읽습니다.
 */
function findAreaColumns(grid: Grid, header: NiceHeader): AreaColumn[] {
  const columns: AreaColumn[] = [];
  const nameCounts = new Map<string, number>();

  for (let col = header.nameCol + 1; col < header.labels.length; col++) {
    const label = header.labels[col];
    if (!label || col === header.classCol) continue;

    // 괄호 안의 설명("반영비율 20%" 등)으로 영역을 빼지 않도록 괄호를 지우고 봅니다.
    const withoutNote = label.replace(/[(（][^)）]*[)）]/g, " ").trim();
    if (NON_AREA_LABEL.test(withoutNote)) continue;

    const maxScore = findAreaMaxScore(grid, header, col);
    const hasValue = header.studentRows.some((row) => {
      const value = grid[row][col];
      return /^-?\d+([.,]\d+)?점?$/.test(value) || ABSENCE_KEYWORDS.test(value);
    });
    if (!hasValue && maxScore === null) continue;

    const baseName =
      withoutNote
        .replace(/만점.*$/s, "")
        .replace(/\s+/g, " ")
        .trim() || label;
    // 같은 이름이 두 칸이면 뒤 칸이 앞 칸을 덮어쓰지 않도록 번호를 붙입니다.
    const count = (nameCounts.get(baseName) ?? 0) + 1;
    nameCounts.set(baseName, count);

    columns.push({ col, name: count > 1 ? `${baseName}(${count})` : baseName, maxScore });
  }
  return columns;
}

/**
 * 제목 줄을 보고 나이스 전체 영역, 한 영역, 일반 표 중 어느 쪽인지 정합니다.
 * @returns 나이스 파일이면 읽은 결과, 일반 표로 넘길 것이면 null
 */
export function readNice(grid: Grid, merges: XLSX.Range[]): ParsedFile | null {
  const header = findNiceHeader(grid);
  if (!header) return null;

  const normalized = header.labels.map(normalizeLabel);
  const scoreCol = normalized.findIndex((label) => SCORE_LABEL.test(label));
  const titleArea = findAreaInTitle(grid, header.row);

  if (scoreCol !== -1 && titleArea) {
    return readNiceSingleArea(grid, merges, header, scoreCol, titleArea);
  }
  if (scoreCol !== -1 || normalized.some((label) => FLAT_TABLE_LABEL.test(label))) {
    return null;
  }

  const areas = findAreaColumns(grid, header);
  // 위쪽에 영역 이름이 있고 점수 칸이 하나뿐이면 칸 제목이 달라도 한 영역 형식입니다.
  if (titleArea && areas.length === 1) {
    return readNiceSingleArea(grid, merges, header, areas[0].col, titleArea);
  }
  return areas.length > 0 ? readNiceAllAreas(grid, header, areas) : null;
}

/** 전체 영역: 한 학생이 한 줄이고 영역마다 칸이 있습니다. */
function readNiceAllAreas(grid: Grid, header: NiceHeader, areas: AreaColumn[]): ParsedFile {
  const book = createStudentBook();
  const scoreIssues: ScoreIssue[] = [];

  for (const row of header.studentRows) {
    const identity = studentIdentity(grid, header, row);
    if (!identity) continue;

    const { grade, classNum, number, name } = identity;
    const student = book.add(grade, classNum, number, name);
    for (const area of areas) {
      // 만점은 나이스 파일에 항상 있습니다. 100은 그 밖의 파일을 위한 보조 규칙입니다.
      const maxScore = area.maxScore ?? 100;
      const { score, invalid } = readScore(grid[row][area.col], maxScore);
      if (invalid) scoreIssues.push({ class: classNum, number });
      book.setEvaluation(student, { area: area.name, score, maxScore });
    }
  }

  return {
    students: book.sorted(),
    scoreIssues,
    areasWithoutMax: areas.filter((area) => area.maxScore === null).map((area) => area.name),
    mapping: { class: header.classCol, number: header.classCol, name: header.nameCol },
    nameHint: findNameHint(grid, header.row),
  };
}

/** 점수 제목이 여러 칸에 병합되어 있으면 그 안에서 숫자가 가장 많은 칸을 씁니다. */
function findScoreColumn(
  grid: Grid,
  merges: XLSX.Range[],
  header: NiceHeader,
  labelCol: number
): number {
  const merge = merges.find(
    ({ s, e }) =>
      header.row >= s.r && header.row <= e.r && labelCol >= s.c && labelCol <= e.c
  );
  if (!merge) return labelCol;

  let bestCol = labelCol;
  let bestCount = -1;
  for (let col = merge.s.c; col <= merge.e.c; col++) {
    const count = header.studentRows.filter((row) => /^\d/.test(grid[row][col])).length;
    if (count > bestCount) {
      bestCol = col;
      bestCount = count;
    }
  }
  return bestCol;
}

/** 한 영역: 영역 이름과 만점은 위쪽 안내 줄에 있고 학생 줄에는 점수 칸 하나가 있습니다. */
function readNiceSingleArea(
  grid: Grid,
  merges: XLSX.Range[],
  header: NiceHeader,
  scoreLabelCol: number,
  area: string
): ParsedFile {
  const scoreCol = findScoreColumn(grid, merges, header, scoreLabelCol);
  const titleMaxScore = findMaxScoreInTitle(grid, header.row);
  const maxScore = titleMaxScore ?? 100;
  const book = createStudentBook();
  const scoreIssues: ScoreIssue[] = [];

  for (const row of header.studentRows) {
    const identity = studentIdentity(grid, header, row);
    if (!identity) continue;

    // 결시 사유는 점수 칸 밖(결시 사유, 비고 칸)에 있습니다. 이름은 보지 않습니다.
    const hasAbsenceReason = grid[row].some(
      (cell, col) => col !== scoreCol && col !== header.nameCol && ABSENCE_KEYWORDS.test(cell)
    );
    const { score, invalid } = hasAbsenceReason
      ? { score: null, invalid: false }
      : readScore(grid[row][scoreCol], maxScore);

    const { grade, classNum, number, name } = identity;
    if (invalid) scoreIssues.push({ class: classNum, number });
    book.setEvaluation(book.add(grade, classNum, number, name), { area, score, maxScore });
  }

  return {
    students: book.sorted(),
    scoreIssues,
    areasWithoutMax: titleMaxScore === null ? [area] : [],
    mapping: {
      class: header.classCol,
      number: header.classCol,
      name: header.nameCol,
      score: scoreCol,
    },
    nameHint: findNameHint(grid, header.row, area),
  };
}
