import { describe, expect, it } from "vitest";
import { parseStudents, runWorker, summarize } from "../helpers/runWorker";
import {
  NICE_REAL_SINGLE_MERGES,
  NICE_REAL_SINGLE_ROWS,
  NICE_SINGLE_MERGES,
  NICE_SINGLE_ROWS,
  toWorkbookBytes,
} from "../fixtures/workbooks";
import type { Merge, Rows } from "../fixtures/workbooks";

function parseRows(rows: Rows, merges?: Merge[]) {
  return parseStudents(toWorkbookBytes(rows, { merges }));
}

const META = ["영역 : 듣기", "영역만점 : 10"];
const TABLE_HEADER = ["반/번호", "성명", "점수", "비고"];

describe("나이스 단일 영역", () => {
  it("성명 칸이 빈 실제 구조의 파일에서 학생을 반/번호로 보여 주고 통계 줄은 읽지 않는다", async () => {
    const students = await parseRows(NICE_REAL_SINGLE_ROWS, NICE_REAL_SINGLE_MERGES);
    expect(summarize(students)).toEqual([
      "2-1-1 1/1 | 탐구1:8.5/10",
      "2-1-2 1/2 | 탐구1:null/10",
      "2-1-3 1/3 | 탐구1:6/10",
    ]);
  });

  it("메타데이터의 학년, 영역, 만점과 병합된 점수 헤더를 읽는다", async () => {
    const students = await parseRows(NICE_SINGLE_ROWS, NICE_SINGLE_MERGES);
    expect(summarize(students)).toEqual([
      "2-1-1 김가상 | 쓰기1:8.5/10",
      "2-1-2 이가상 | 쓰기1:10/10",
      "2-1-3 박가상 | 쓰기1:6/10",
    ]);
  });

  it("매핑과 헤더 행을 함께 돌려준다", async () => {
    const result = await runWorker(
      toWorkbookBytes(NICE_SINGLE_ROWS, { merges: NICE_SINGLE_MERGES })
    );
    expect(result).toMatchObject({
      success: true,
      mapping: { class: 0, number: 0, name: 1, score: 2 },
    });
    if (!result.success) return;
    expect(result.headerRows).toHaveLength(6);
  });

  it("병합된 점수 헤더 안에서 숫자가 있는 열을 찾는다", async () => {
    const students = await parseRows(
      [
        META,
        ["반/번호", "성명", "점수", "", ""],
        ["1/1", "김가상", "", 8, ""],
        ["1/2", "이가상", "", 9, ""],
      ],
      ["C2:D2"]
    );
    expect(summarize(students)).toEqual([
      "1-1-1 김가상 | 듣기:8/10",
      "1-1-2 이가상 | 듣기:9/10",
    ]);
  });

  it("점수 헤더가 없으면 데이터에 숫자가 가장 많은 열을 점수로 쓴다", async () => {
    const students = await parseRows([
      META,
      ["반/번호", "성명", "평가결과", "비고"],
      ["1/1", "김가상", 8, ""],
      ["1/2", "이가상", 9, ""],
    ]);
    expect(summarize(students)).toEqual([
      "1-1-1 김가상 | 듣기:8/10",
      "1-1-2 이가상 | 듣기:9/10",
    ]);
  });

  it("영역만점은 한 행 또는 두 행 아래에서도 찾는다", async () => {
    const students = await parseRows([
      ["영역 : 듣기"],
      ["영역만점 : 20"],
      ["반/번호", "성명", "점수"],
      ["1/1", "김가상", 8],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 듣기:8/20"]);
  });

  it("전각 콜론과 만점 표기를 읽는다", async () => {
    const students = await parseRows([
      ["영역：듣기", "만점：15"],
      ["반/번호", "성명", "점수"],
      ["1/1", "김가상", 8],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 듣기:8/15"]);
  });

  it("점수 형식을 normalize 규칙으로 읽는다", async () => {
    const students = await parseRows([
      META,
      TABLE_HEADER,
      ["1/1", "김가상", "8점", ""],
      ["1/2", "이가상", "7/10", ""],
      ["1/3", "박가상", "6,5", ""],
      ["1/4", "최가상", "abc", ""],
      ["1/5", "정가상", -1, ""],
      ["1/6", "강가상", "질병결", ""],
    ]);
    expect(summarize(students)).toEqual([
      "1-1-1 김가상 | 듣기:8/10",
      "1-1-2 이가상 | 듣기:7/10",
      "1-1-3 박가상 | 듣기:6.5/10",
      "1-1-4 최가상 | 듣기:null/10",
      "1-1-5 정가상 | 듣기:null/10",
      "1-1-6 강가상 | 듣기:null/10",
    ]);
  });

  it("비고의 결시 사유가 있으면 점수를 지운다", async () => {
    const students = await parseRows([
      META,
      TABLE_HEADER,
      ["1/1", "김가상", 9, "전출"],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 듣기:null/10"]);
  });

  it("표 아래 바닥글을 버리고 이름이 빈 학생은 반/번호로 보여 준다", async () => {
    const students = await parseRows([
      META,
      TABLE_HEADER,
      ["1/1", "김가상", 8, ""],
      ["1/2", "", 9, ""],
      ["담당교사", "가상선생", "", ""],
      ["합계", "", 17, ""],
    ]);
    expect(students.map((s) => [s.id, s.name])).toEqual([
      ["1-1-1", "김가상"],
      ["1-1-2", "1/2"],
    ]);
  });

  it("2025학년도는 학년으로 읽지 않고 2학년만 읽는다", async () => {
    const students = await parseRows([
      ["2025학년도", "2학년 3강의실"],
      META,
      TABLE_HEADER,
      ["1/1", "김가상", 8, ""],
    ]);
    expect(students[0].grade).toBe(2);
  });
});

describe("나이스 단일 영역의 이상 동작", () => {
  it("[Q-01] 제목 병합이 있어도 빈 점수는 null이다", async () => {
    const students = await parseRows(
      [
        ["제목", "", "", ""],
        META,
        TABLE_HEADER,
        ["1/1", "김가상", 8, ""],
        ["3/7", "이가상", "", ""],
      ],
      ["A1:D1"]
    );
    expect(summarize(students)).toEqual([
      "1-1-1 김가상 | 듣기:8/10",
      "1-3-7 이가상 | 듣기:null/10",
    ]);
  });

  it("[Q-01] 같은 표에서 제목 병합이 없으면 빈 점수는 null이다", async () => {
    const students = await parseRows([
      ["제목", "", "", ""],
      META,
      TABLE_HEADER,
      ["1/1", "김가상", 8, ""],
      ["3/7", "이가상", "", ""],
    ]);
    expect(summarize(students)[1]).toBe("1-3-7 이가상 | 듣기:null/10");
  });

  it("이름이 빈 행은 빼지 않고 반/번호를 이름으로 보여 준다", async () => {
    const students = await parseRows(
      [
        ["제목", "", "", ""],
        META,
        TABLE_HEADER,
        ["1/7", "김가상", 8, ""],
        ["1/8", "", 9, ""],
      ],
      ["A1:D1"]
    );
    expect(summarize(students)).toEqual(["1-1-7 김가상 | 듣기:8/10", "1-1-8 1/8 | 듣기:9/10"]);
  });

  it("[Q-01] 그 학생 줄을 덮는 병합은 지금처럼 첫 칸 값을 읽는다", async () => {
    const students = await parseRows(
      [["제목", "", "", ""], META, TABLE_HEADER, ["1/1", "김가상", "", ""]],
      ["A4:C4"]
    );
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 듣기:1/10"]);
  });

  it("[Q-02] 헤더 바로 아래가 1/1이고 20행 안에 다음 반이 있어도 앞 반을 읽는다", async () => {
    const students = await parseRows([
      META,
      TABLE_HEADER,
      ["1/1", "김가상", 1, ""],
      ["1/2", "이가상", 2, ""],
      ["2/1", "박가상", 3, ""],
    ]);
    expect(students.map((s) => s.id)).toEqual(["1-1-1", "1-1-2", "1-2-1"]);
  });

  it("[Q-02] 헤더 바로 아래가 첫 학생이고 16행을 넘어도 30명을 모두 읽는다", async () => {
    const rows: Rows = [META, TABLE_HEADER];
    for (let i = 1; i <= 30; i++) rows.push([`1/${i}`, "김가상", 1, ""]);
    const students = await parseRows(rows);
    expect(students.map((s) => s.number)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it("[Q-02] 전체가 15행 이하이면 빠지지 않는다", async () => {
    const rows: Rows = [META, TABLE_HEADER];
    for (let i = 1; i <= 13; i++) rows.push([`1/${i}`, "김가상", 1, ""]);
    expect(await parseRows(rows)).toHaveLength(13);
  });

  it("[Q-02] 헤더와 첫 학생 사이에 한 행이 있으면 30명을 모두 읽는다", async () => {
    const rows: Rows = [META, TABLE_HEADER, ["", "", "", ""]];
    for (let i = 1; i <= 30; i++) rows.push([`1/${i}`, "김가상", 1, ""]);
    expect(await parseRows(rows)).toHaveLength(30);
  });

  it("[Q-03] 뒤에 번호 1인 학생이 있어도 그 앞의 행을 읽는다", async () => {
    const students = await parseRows([
      META,
      TABLE_HEADER,
      ["1/2", "김가상", 1, ""],
      ["1/3", "이가상", 2, ""],
      ["2/1", "박가상", 3, ""],
    ]);
    expect(students.map((s) => s.id)).toEqual(["1-1-2", "1-1-3", "1-2-1"]);
  });

  it("[Q-06] 이름에 결시 낱말이 들어 있어도 점수를 지우지 않는다", async () => {
    const students = await parseRows([
      META,
      TABLE_HEADER,
      ["1/1", "유예가상", 8, ""],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 유예가상 | 듣기:8/10"]);
  });

  it("[Q-20] 표 어느 칸의 N학년 표기든 전체 학생의 학년을 덮어쓴다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "평가영역", "점수", "만점"],
      ["1/1", "김가상", "3학년 독서", 8, 10],
    ]);
    expect(summarize(students)).toEqual(["3-1-1 김가상 | 3학년 독서:8/10"]);
  });

  it("[Q-22] 만점 표기가 없으면 100이 만점이 된다", async () => {
    const students = await parseRows([
      ["영역 : 듣기"],
      ["반/번호", "성명", "점수"],
      ["1/1", "김가상", 8],
      ["1/2", "이가상", 9],
    ]);
    expect(summarize(students)).toEqual([
      "1-1-1 김가상 | 듣기:8/100",
      "1-1-2 이가상 | 듣기:9/100",
    ]);
  });

  it("[Q-24] 영역만점이 세 행 이상 떨어지면 A열 값으로 만점을 읽는다", async () => {
    const students = await parseRows([
      ["영역 : 듣기"],
      ["메모"],
      ["메모"],
      ["영역만점 : 20"],
      ["반/번호", "성명", "점수"],
      ["1/1", "김가상", 8],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 듣기:null/1"]);
  });

  it("[Q-25] 만점 초과 점수는 미입력으로 두고 확인할 학생으로 알린다", async () => {
    const result = await runWorker(
      toWorkbookBytes([META, TABLE_HEADER, ["1/1", "김가상", 12, ""], ["1/2", "이가상", 8, ""]])
    );
    expect(result).toMatchObject({ success: true, scoreIssues: [{ class: 1, number: 1 }] });
    if (!result.success) return;
    expect(summarize(result.students)).toEqual([
      "1-1-1 김가상 | 듣기:null/10",
      "1-1-2 이가상 | 듣기:8/10",
    ]);
  });

  it("[Q-26] 영역 이름이 첫 공백에서 잘린다", async () => {
    const students = await parseRows([
      ["영역 : 2차 서술형 평가", "영역만점 : 10"],
      ["반/번호", "성명", "점수"],
      ["1/1", "김가상", 8],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 2차:8/10"]);
  });

  it("[Q-26] 영어 영역 이름은 인식하지 못해 평가가 되고 만점도 100으로 둔다", async () => {
    const students = await parseRows([
      ["영역 : Speaking", "영역만점 : 10"],
      ["반/번호", "성명", "점수"],
      ["1/1", "김가상", 8],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 평가:8/100"]);
  });
});
