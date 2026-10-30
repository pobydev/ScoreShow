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

/**
 * 나이스 다중 영역의 구조만 본뜬 표입니다. 쓰기, 말하기, 듣기, 읽기 낱말이 없습니다.
 * 실제 형식 파일 1개를 내용 없이 구조만 본 설명을 따랐습니다. 6행이 헤더이고 7행부터 바로 학생이며
 * 점수는 이름 있는 칸과 같은 열에 있습니다. 이름과 점수는 모두 지어낸 값입니다.
 */
export const NICE_STRUCTURE_ROWS: Rows = [
  ["2025학년도 1학기 과학 수행평가 일람표"],
  ["3학년 2강의실"],
  ["담당: 가상선생"],
  [""],
  [""],
  ["반/번호", "", "성명", "실험 보고서 (만점 20.00)", "", "탐구 토론", "관찰 일지", "", "", "포트폴리오", "", "", "", "발표"],
  ["2/1", "", "김가상", 18, "", 9, 7.5, "", "", 25, "", "", "", 10],
  ["2/2", "", "이가상", 20, "", "", 8, "", "", 30, "", "", "", "인정결"],
  ["2/3", "", "박가상", "전출", "", 7, 6, "", "", 21, "", "", "", 8],
];
export const NICE_STRUCTURE_MERGES: Merge[] = [
  "A1:N1",
  "A2:N2",
  "A6:B6",
  "D6:E6",
  "G6:I6",
  "J6:M6",
  ...[7, 8, 9].flatMap((row) => [`A${row}:B${row}`, `D${row}:E${row}`, `G${row}:I${row}`, `J${row}:M${row}`]),
];

/** { B: "1/1", F: 8 }처럼 열 글자로 쓴 행을 배열로 바꿉니다. 없는 칸은 비워 둡니다. */
function cellsAt(cells: Record<string, Cell> = {}): Cell[] {
  const row: Cell[] = [];
  for (const [col, value] of Object.entries(cells)) {
    row[XLSX.utils.decode_col(col)] = value;
  }
  return Array.from(row, (value) => value ?? null);
}

type SparseRow = Record<string, Cell> | undefined;

function realRows(rows: SparseRow[]): Rows {
  return rows.map(cellsAt);
}

const FOOTER: SparseRow = { I: 1, L: "/", N: 1, O: "page" };

/**
 * 실제 나이스 파일 3개에서 값 없이 본 구조를 지어낸 값으로 옮겼습니다.
 * 시트가 B열부터 시작하고 C열에 숫자가 있으며, 표 아래에 통계 줄이 있습니다.
 * 성명 칸은 파일에 따라 비어 있습니다.
 */
export const NICE_REAL_SINGLE_ROWS: Rows = realRows([
  undefined,
  { J: "2025.03.02." },
  undefined,
  { E: "수행평가 일람표" },
  undefined,
  { B: "2025학년도   1학기   중학교   2학년   1 과학" },
  { B: "평가 :   수행    영역 :  탐구1 (서·논술)" },
  { B: "영역만점 : 10.00", L: "담당 : 가상선생" },
  undefined,
  { B: "반/번호", D: "성명", F: "점수", I: "결시사유", O: "비고" },
  { B: "1/1", C: 1000000001, F: 8.5 },
  { B: "1/2", C: 1000000002, I: "인정결" },
  { B: "1/3", C: 1000000003, F: 6 },
  { B: "응시 인원", F: "2 명" },
  { B: "총      점", F: 14.5 },
  { B: "평      균", F: 7.25 },
  undefined,
  { B: "비고 :" },
  undefined,
  { G: 1, H: "/", K: 1, N: "page" },
]);
export const NICE_REAL_SINGLE_MERGES: Merge[] = [
  "J2:P2", "E4:O4", "B6:P6", "B7:P7", "B8:K8", "L8:P8", "B10:C10", "D10:E10", "F10:H10", "I10:N10", "O10:P10",
  ...[11, 12, 13].flatMap((row) => [`D${row}:E${row}`, `F${row}:H${row}`, `I${row}:N${row}`, `O${row}:P${row}`]),
];

const REAL_AREA_HEADER: SparseRow = {
  B: "반/번호",
  D: "성명",
  E: "탐구1 (서·논술)\n(만점 20.00,\n20.00%)",
  G: "탐구2 (서·논술)\n(만점 20.00,\n20.00%)",
  H: "토론\n(만점 30.00,\n30.00%)",
  K: "실험\n(만점 5.00,\n5.00%)",
  O: "합계",
  P: " 비고",
};
const REAL_AREA_TOP: SparseRow[] = [
  { M: "2025.03.02." },
  { F: "수행평가 일람표" },
  { B: "2025학년도   1학기   중학교   2학년   1 과학" },
  { B: "과목 : 과학", J: "담당 (수행) 가상선생" },
  undefined,
];
const REAL_AREA_STATS: SparseRow[] = [
  { B: "응시자", E: "3 명", G: "3 명", H: "3 명", K: "3 명" },
  { B: "총 점", E: 50, G: 40, H: 70, K: 12, O: 172 },
  { B: "평 균", E: 16.7, G: 13.3, H: 23.3, K: 4, O: 57.3 },
  { B: "학년 응시자", E: "90 명", G: "90 명", H: "90 명", K: "90 명" },
  { B: "학년 총점", E: 1500, G: 1200, H: 2100, K: 360 },
  { B: "학년 평균", E: 16.7, G: 13.3, H: 23.3, K: 4 },
  undefined,
  FOOTER,
];

/** 전체 영역 파일: 제목 줄이 두 행에 병합되고 아래 줄이 비며 성명 칸이 비어 있습니다. */
export const NICE_REAL_AREAS_ROWS: Rows = realRows([
  ...REAL_AREA_TOP,
  REAL_AREA_HEADER,
  undefined,
  { B: "1/1", C: 1000000001, E: 18, G: 17, H: 25, K: 4, O: 64 },
  { B: "1/2", C: 1000000002, E: 20, H: 30, K: 5, O: 55 },
  { B: "1/3", C: 1000000003, E: 12, G: 11, H: 15, K: 3, O: 41 },
  ...REAL_AREA_STATS,
]);
export const NICE_REAL_AREAS_MERGES: Merge[] = [
  "M1:R1", "F2:Q2", "B3:R3", "B4:I4", "B6:C7", "D6:D7", "E6:F7", "G6:G7", "H6:J7", "K6:N7", "O6:O7", "P6:P7",
  ...[8, 9, 10].flatMap((row) => [`E${row}:F${row}`, `H${row}:J${row}`, `K${row}:N${row}`]),
];

/** 이름이 있는 전체 영역 파일: 제목 줄 다음 줄부터 바로 학생입니다. */
export const NICE_REAL_NAMED_ROWS: Rows = realRows([
  ...REAL_AREA_TOP,
  REAL_AREA_HEADER,
  { B: "1/1", C: 1000000001, D: "김가상", E: 18, G: 17, H: 25, K: 4, O: 64 },
  { B: "1/2", C: 1000000002, D: "이가상", E: 20, G: 19, H: 30, K: 5, O: 74 },
  ...REAL_AREA_STATS,
]);
export const NICE_REAL_NAMED_MERGES: Merge[] = [
  "M1:R1", "F2:Q2", "B3:R3", "B4:I4", "B6:C6", "E6:F6", "H6:J6", "K6:N6",
  ...[7, 8].flatMap((row) => [`E${row}:F${row}`, `H${row}:J${row}`, `K${row}:N${row}`]),
];

/**
 * 나이스 XLS data 형식: 병합이 없고 시트가 A열부터 시작합니다. 칸의 종류와 순서는 XLS와 같습니다.
 * 한 영역은 6행, 전체 영역은 5행이 제목 줄이고 그 다음 줄부터 학생입니다.
 */
export const NICE_DATA_SINGLE_ROWS: Rows = realRows([
  { I: "2025.03.02." },
  { D: "수행평가 일람표" },
  { A: "2025학년도   1학기   중학교   2학년   1 과학" },
  { A: "교과목 :   과학    영역 :  탐구1 (서·논술)" },
  { A: "영역만점 : 10.00", B: "담당 (수행) 가상선생" },
  { A: "반/번호", C: "성명", D: "점수", E: "결시사유", F: "비고" },
  { A: "1/1", B: 1000000001, D: 8.5 },
  { A: "1/2", B: 1000000002, E: "인정결" },
  { A: "1/3", B: 1000000003, D: 6 },
  { A: "응시 인원", D: "2 명" },
  { A: "총      점", D: 14.5 },
  { A: "평      균", D: 7.25 },
  { F: 1, G: "/", J: 1, L: "page" },
]);

export const NICE_DATA_AREAS_ROWS: Rows = realRows([
  { K: "2025.03.02." },
  { E: "수행평가 일람표" },
  { A: "2025학년도   1학기   중학교   2학년   1 과학" },
  { A: "과목 : 과학", I: "담당 (수행) 가상선생" },
  {
    A: "반/번호",
    C: "성명",
    D: "탐구1 (서·논술)(만점 20.00,20.00%)",
    E: "탐구2 (서·논술)(만점 20.00,20.00%)",
    F: "토론(만점 30.00,30.00%)",
    G: "실험(만점 5.00,5.00%)",
    H: "합계",
    I: " 비고",
  },
  { A: "1/1", B: 1000000001, D: 18, E: 17, F: 25, G: 4, H: 64 },
  { A: "1/2", B: 1000000002, D: 20, F: 30, G: 5, H: 55 },
  { A: "응시자", D: "2 명", E: "1 명", F: "2 명", G: "2 명" },
  { A: "총 점", D: 38, E: 17, F: 55, G: 9, H: 119 },
  { A: "평 균", D: 19, E: 17, F: 27.5, G: 4.5, H: 59.5 },
  { H: 1, J: "/", L: 1, M: "page" },
]);

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
