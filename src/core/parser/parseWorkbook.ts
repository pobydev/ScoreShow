/**
 * 파일을 읽어 워커 메시지를 만듭니다.
 * 파일 종류를 판별해 형식별 읽기 함수로 넘깁니다: 표준 서식, 나이스, 그 밖의 일반 표 순서입니다.
 * 학생이나 점수를 찾지 못하면 성공으로 알리지 않아 저장된 데이터를 지킵니다.
 */

import * as XLSX from "xlsx";
import type { ScoreIssue } from "../normalize";
import type { ColumnMapping, Student } from "../../types";
import { readNice } from "./nice";
import { MAX_HEADER_ROWS, readGrid } from "./shared";
import { readTable } from "./table";
import { readTemplate } from "./template";

export type WorkerMessage =
  | {
      success: true;
      students: Student[];
      scoreIssues: ScoreIssue[];
      areasWithoutMax: string[];
      mapping: ColumnMapping | null;
      headerRows?: string[][];
    }
  | { success: false; error: string };

const KEEPS_DATA = "기존 데이터는 그대로 유지됩니다.";
const NOT_NICE_HINT = "나이스 파일이 아니면 표준 서식에 붙여 넣어 주세요.";

export function parseWorkbook(
  bytes: ArrayBuffer,
  providedMapping?: ColumnMapping
): WorkerMessage {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, {
      type: "array",
      cellFormula: false, // 수식은 값으로 변환
      cellHTML: false,
      cellStyles: false,
    });
  } catch {
    return {
      success: false,
      error: `파일을 읽지 못했습니다. 손상되었거나 암호가 걸린 파일일 수 있습니다. ${KEEPS_DATA}`,
    };
  }

  // 첫 번째 시트만 읽습니다.
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const grid = readGrid(worksheet);
  const merges = worksheet["!merges"] ?? [];
  const mapping =
    providedMapping && Object.keys(providedMapping).length > 0 ? providedMapping : undefined;

  const template = readTemplate(grid);
  if (template) {
    return toMessage(template);
  }

  const nice = mapping ? null : readNice(grid, merges);
  const parsed = nice ?? readTable(grid, mapping);
  return toMessage(parsed, grid.slice(0, MAX_HEADER_ROWS));
}

function toMessage(
  parsed: {
    students: Student[];
    scoreIssues: ScoreIssue[];
    areasWithoutMax: string[];
    mapping: ColumnMapping | null;
  },
  headerRows?: string[][]
): WorkerMessage {
  const { students, scoreIssues, areasWithoutMax, mapping } = parsed;

  if (students.length === 0) {
    return {
      success: false,
      error: `파일에서 학생을 찾지 못했습니다. ${NOT_NICE_HINT} ${KEEPS_DATA}`,
    };
  }

  // 학생은 찾았는데 점수가 하나도 없으면 양식을 잘못 이해했을 수 있으므로 실패로 알립니다.
  const hasAnyScore = students.some((student) =>
    student.evaluations.some((evaluation) => evaluation.score !== null)
  );
  if (!hasAnyScore && scoreIssues.length === 0) {
    return {
      success: false,
      error: `파일에서 점수를 찾지 못했습니다. ${NOT_NICE_HINT} ${KEEPS_DATA}`,
    };
  }

  return {
    success: true,
    students,
    scoreIssues,
    areasWithoutMax,
    mapping,
    ...(headerRows ? { headerRows } : {}),
  };
}
