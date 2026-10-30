import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { NO_STUDENTS_FOUND, parseStudents, runWorker, summarize } from "../helpers/runWorker";
import {
  FLAT_HEADER,
  NICE_MULTI_MERGES,
  NICE_MULTI_ROWS,
  NICE_SINGLE_MERGES,
  NICE_SINGLE_ROWS,
  templateRows,
  toCsvBytes,
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

describe("csv", () => {
  it("BOM이 있는 UTF-8 표준 템플릿을 읽는다", async () => {
    const students = await parseStudents(toCsvBytes(TEMPLATE, { bom: true }));
    expect(summarize(students)).toEqual(TEMPLATE_RESULT);
  });

  it("[Q-10] BOM이 없는 UTF-8은 한글이 깨져 실패로 알린다", async () => {
    expect(await runWorker(toCsvBytes(TEMPLATE))).toMatchObject(NO_STUDENTS_FOUND);
  });

  it("[Q-10] 엑셀 기본 CSV 인코딩(EUC-KR)도 한글이 깨져 실패로 알린다", async () => {
    // "반/번호,이름\n1/1,가\n"의 EUC-KR 바이트
    const bytes = new Uint8Array([
      0xb9, 0xdd, 0x2f, 0xb9, 0xf8, 0xc8, 0xa3, 0x2c, 0xc0, 0xcc, 0xb8, 0xa7, 0x0a,
      0x31, 0x2f, 0x31, 0x2c, 0xb0, 0xa1, 0x0a,
    ]);
    expect(await runWorker(bytes)).toMatchObject(NO_STUDENTS_FOUND);
  });

  it("[Q-10] BOM이 있어도 반/번호 1/1이 날짜로 바뀌어 다중 영역은 실패로 알린다", async () => {
    const result = await runWorker(toCsvBytes(NICE_MULTI_ROWS, { bom: true }));
    expect(result).toMatchObject(NO_STUDENTS_FOUND);
  });

  it("[Q-10] BOM이 있어도 단일 영역은 반과 번호가 날짜 일련번호로 바뀐다", async () => {
    const students = await parseStudents(toCsvBytes(NICE_SINGLE_ROWS, { bom: true }));
    expect(students).toHaveLength(3);
    expect(students[0]).toMatchObject({ grade: 2, name: "김가상" });
    expect(students[0].class).toBeGreaterThan(30000);
    expect(students[0].number).toBe(students[0].class);
  });

  it("[Q-10] 일반 표도 같은 이유로 반과 번호가 날짜 일련번호로 바뀐다", async () => {
    const students = await parseStudents(
      toCsvBytes([FLAT_HEADER, [2, "1/1", "김가상", "독서", 8, 10]], { bom: true })
    );
    expect(students[0].class).toBeGreaterThan(30000);
    expect(students[0].evaluations).toEqual([{ area: "독서", score: 8, maxScore: 10 }]);
  });
});

describe("파일 공통", () => {
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
