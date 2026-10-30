import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { NO_STUDENTS_FOUND, parseStudents, runWorker, summarize } from "../helpers/runWorker";
import {
  NICE_DATA_AREAS_ROWS,
  NICE_DATA_SINGLE_ROWS,
  NICE_MULTI_MERGES,
  NICE_MULTI_ROWS,
  NICE_SINGLE_MERGES,
  NICE_SINGLE_ROWS,
  templateRows,
  toWorkbookBytes,
} from "../fixtures/workbooks";

const TEMPLATE = templateRows([
  [2, 1, 1, "김가상", 9, 10, 8, 10],
  [2, 1, 2, "이가상", 7, "", 9, ""],
]);
const TEMPLATE_RESULT = [
  "2-1-1 김가상 | 영역1:9/10 영역2:8/10",
  "2-1-2 이가상 | 영역1:7/10 영역2:9/10",
];
const NICE_MULTI_RESULT = [
  "2-1-1 김가상 | 쓰기1:8.5/10 말하기:15/20 듣기:4/5",
  "2-1-2 이가상 | 쓰기1:10/10 말하기:20/20 듣기:5/5",
  "2-1-3 박가상 | 쓰기1:null/10 말하기:11/20 듣기:null/5",
];
const NICE_SINGLE_RESULT = [
  "2-1-1 김가상 | 쓰기1:8.5/10",
  "2-1-2 이가상 | 쓰기1:10/10",
  "2-1-3 박가상 | 쓰기1:6/10",
];

describe.each(["xlsx", "xls"] as const)("%s", (format) => {
  it("표준 템플릿을 읽는다", async () => {
    const students = await parseStudents(toWorkbookBytes(TEMPLATE, { format }));
    expect(summarize(students)).toEqual(TEMPLATE_RESULT);
  });

  it("나이스 다중 영역을 읽는다", async () => {
    const students = await parseStudents(
      toWorkbookBytes(NICE_MULTI_ROWS, { merges: NICE_MULTI_MERGES, format })
    );
    expect(summarize(students)).toEqual(NICE_MULTI_RESULT);
  });

  it("나이스 단일 영역을 읽는다", async () => {
    const students = await parseStudents(
      toWorkbookBytes(NICE_SINGLE_ROWS, { merges: NICE_SINGLE_MERGES, format })
    );
    expect(summarize(students)).toEqual(NICE_SINGLE_RESULT);
  });
});

describe("파일 공통", () => {
  it("XLS data 형식(병합 없음, A열 시작)의 한 영역 파일을 XLS와 같은 경로로 읽는다", async () => {
    const students = await parseStudents(toWorkbookBytes(NICE_DATA_SINGLE_ROWS));
    expect(summarize(students)).toEqual([
      "2-1-1 1/1 | 탐구1:8.5/10",
      "2-1-2 1/2 | 탐구1:null/10",
      "2-1-3 1/3 | 탐구1:6/10",
    ]);
  });

  it("XLS data 형식의 전체 영역 파일을 읽고 합계와 통계 줄은 읽지 않는다", async () => {
    const students = await parseStudents(toWorkbookBytes(NICE_DATA_AREAS_ROWS));
    expect(summarize(students)).toEqual([
      "2-1-1 1/1 | 탐구1:18/20 탐구2:17/20 토론:25/30 실험:4/5",
      "2-1-2 1/2 | 탐구1:20/20 탐구2:null/20 토론:30/30 실험:5/5",
    ]);
  });


  it("첫 번째 시트만 읽는다", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(templateRows([[2, 1, 1, "김가상", 9, 10]])),
      "첫째"
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(templateRows([[2, 1, 2, "이가상", 7, 10]])),
      "둘째"
    );
    const bytes = new Uint8Array(XLSX.write(workbook, { type: "array", bookType: "xlsx" }));
    expect(summarize(await parseStudents(bytes))).toEqual(["2-1-1 김가상 | 영역1:9/10"]);
  });

  it("손상된 zip과 OLE 파일은 실패로 알린다", async () => {
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 1, 2, 3, 4]);
    for (const bytes of [zip, ole]) {
      const result = await runWorker(bytes);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toEqual(expect.any(String));
    }
  });

  it.each([
    ["빈 시트", () => toWorkbookBytes([])],
    ["빈 파일", () => new Uint8Array(0)],
    ["일반 글자", () => new TextEncoder().encode("hello world")],
    ["알 수 없는 바이너리", () => new Uint8Array(Array.from({ length: 600 }, (_, i) => (i * 37) % 256))],
  ])("[Q-17] 학생을 찾지 못한 실패로 알린다: %s", async (_label, makeBytes) => {
    expect(await runWorker(makeBytes())).toMatchObject(NO_STUDENTS_FOUND);
  });
});
