/**
 * 시험용 엑셀 픽스처를 코드로 만듭니다. 이름과 점수는 모두 지어낸 값입니다.
 * 나이스 양식의 모양은 parseExcel.worker.ts의 주석과 정규식에서 읽어 재현했습니다.
 * 실제 나이스 내보내기 파일과 대조한 것은 아닙니다.
 */

import * as XLSX from "xlsx";

export type Cell = string | number | null;
export type Rows = Cell[][];
export type Merge = string; // "A1:H1" 형식

export type BinaryFormat = "xlsx" | "xls";

export function toWorkbookBytes(
  rows: Rows,
  options: { merges?: Merge[]; format?: BinaryFormat } = {}
): Uint8Array {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  if (options.merges) {
    sheet["!merges"] = options.merges.map((range) =>
      XLSX.utils.decode_range(range)
    );
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  const data = XLSX.write(workbook, {
    type: "array",
    bookType: options.format === "xls" ? "biff8" : "xlsx",
  }) as ArrayBuffer;
  return new Uint8Array(data);
}

export function toCsvBytes(
  rows: Rows,
  options: { bom?: boolean } = {}
): Uint8Array {
  const text = rows
    .map((row) => row.map((cell) => cell ?? "").join(","))
    .join("\n");
  return new TextEncoder().encode((options.bom ? "﻿" : "") + text);
}

/** 나이스 다중 영역 형식: 표 헤더에 영역이 나열되고 바로 아래 행에 만점이 있습니다. */
export const NICE_MULTI_ROWS: Rows = [
  ["2025학년도 1학기 수행평가 일람표", "", "", "", "", "", ""],
  ["2학년 1강의실", "", "", "", "", "", ""],
  ["반/번호", "성명", "쓰기1 (서·논술)", "", "말하기", "듣기", "비고"],
  ["", "", "만점 10.00", "", "만점 20.00", "만점 5", ""],
  ["1/1", "김가상", 8.5, "", 15, 4, ""],
  ["1/2", "이가상", 10, "", 20, 5, ""],
  ["1/3", "박가상", "", "", 11, "", ""],
];
export const NICE_MULTI_MERGES: Merge[] = ["A1:G1", "A2:G2", "C3:D3", "C4:D4"];

/** 나이스 단일 영역 형식: 표 위 메타데이터에 "영역 : ...", "영역만점 : ..."이 있습니다. */
export const NICE_SINGLE_ROWS: Rows = [
  ["2025학년도 1학기 수행평가 일람표", "", "", "", ""],
  ["2학년 1강의실", "영역 : 쓰기1 (서·논술형)", "", "영역만점 : 10.00", ""],
  ["반/번호", "성명", "점수", "", "비고"],
  ["1/1", "김가상", 8.5, "", ""],
  ["1/2", "이가상", 10, "", ""],
  ["1/3", "박가상", 6, "", ""],
];
export const NICE_SINGLE_MERGES: Merge[] = ["A1:E1", "C3:D3"];

/** 표준 템플릿: public/ScoreShow_Template.xlsx와 같은 모양을 값만 바꿔 만듭니다. */
export const TEMPLATE_HEADER: Cell[] = [
  "학년",
  "반",
  "번호",
  "이름",
  "영역1 이름",
  "영역1 만점",
  "영역2 이름",
  "영역2 만점",
  "영역3 이름",
  "영역3 만점",
  "영역4 이름",
  "영역4 만점",
  "영역5 이름",
  "영역5 만점",
];

export function templateRows(
  rows: Rows,
  header: Cell[] = TEMPLATE_HEADER
): Rows {
  return [["※ 사용 방법 안내"], header, ...rows];
}

/** 각 행에 평가 영역이 하나씩 있는 일반 표(세로형) 헤더입니다. */
export const FLAT_HEADER: Cell[] = [
  "학년",
  "반/번호",
  "이름",
  "평가영역",
  "점수",
  "만점",
];
