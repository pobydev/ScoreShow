import { describe, expect, it } from "vitest";
import { NO_STUDENTS_FOUND, parseStudents, runWorker, summarize } from "../helpers/runWorker";
import { FLAT_HEADER, toWorkbookBytes } from "../fixtures/workbooks";
import type { Rows } from "../fixtures/workbooks";

const SEPARATE_HEADER = ["학년", "반", "번호", "이름", "평가영역", "점수", "만점"];

function parseRows(rows: Rows, mapping?: Parameters<typeof parseStudents>[1]) {
  return parseStudents(toWorkbookBytes(rows), mapping);
}

describe("일반 표와 컬럼 자동 매핑", () => {
  it("반/번호 한 칸과 영역, 점수, 만점 컬럼을 읽는다", async () => {
    const result = await runWorker(
      toWorkbookBytes([
        FLAT_HEADER,
        [2, "1/1", "김가상", "독서", 8, 10],
        [2, "1/2", "이가상", "독서", 9, 10],
      ])
    );
    expect(result).toMatchObject({
      success: true,
      mapping: { grade: 0, class: 1, number: 1, name: 2, area: 3, score: 4, maxScore: 5 },
    });
    if (!result.success) return;
    expect(summarize(result.students)).toEqual([
      "2-1-1 김가상 | 독서:8/10",
      "2-1-2 이가상 | 독서:9/10",
    ]);
  });

  it("영역 컬럼이 없으면 평가라는 이름을 쓴다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "점수", "만점"],
      ["1/1", "김가상", 8, 10],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 평가:8/10"]);
  });

  it("빈 점수는 null이고 표 아래 바닥글은 버린다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "평가영역", "점수", "만점"],
      ["1/1", "김가상", "독서", "", 10],
      ["담당교사", "가상선생", "", "", ""],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 독서:null/10"]);
  });

  it("이름의 공백과 전각 문자를 정리한다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "평가영역", "점수", "만점"],
      ["1/1", "  ＡＢ  가상 ", "독서", 8, 10],
    ]);
    expect(students[0].name).toBe("AB 가상");
  });

  it("[Q-29] 반/번호 칸이 숫자뿐이면 반과 번호가 같은 값이 된다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "평가영역", "점수", "만점"],
      [3, "김가상", "독서", 8, 10],
    ]);
    expect(summarize(students)).toEqual(["1-3-3 김가상 | 독서:8/10"]);
  });
});

describe("호출자가 준 매핑", () => {
  it("자동 매핑 대신 준 매핑을 쓴다", async () => {
    const students = await parseRows(
      [
        ["반/번호", "성명", "가", "나"],
        ["1/1", "김가상", 8, 3],
      ],
      { class: 0, number: 0, name: 1, score: 3 }
    );
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 평가:3/3"]);
  });

  it("빈 매핑은 자동 매핑으로 처리한다", async () => {
    const result = await runWorker(
      toWorkbookBytes([FLAT_HEADER, [2, "1/1", "김가상", "독서", 8, 10]]),
      {}
    );
    expect(result).toMatchObject({ success: true, mapping: { name: 2, score: 4 } });
  });

  it("[Q-09] 반과 번호 컬럼을 직접 지정해도 앞쪽 15행은 헤더로 취급해 읽지 않는다", async () => {
    const rows: Rows = [["학년", "반", "번호", "이름", "점수"]];
    for (let i = 1; i <= 20; i++) rows.push([2, 1, i, "김가상", 8]);
    const students = await parseRows(rows, { grade: 0, class: 1, number: 2, name: 3, score: 4 });
    expect(students.map((s) => s.number)).toEqual([15, 16, 17, 18, 19, 20]);
  });
});

describe("일반 표의 이상 동작", () => {
  it("[Q-07] 행마다 다른 영역이 있어도 영역 하나로 합쳐져 나머지 점수를 잃는다", async () => {
    const students = await parseRows([
      FLAT_HEADER,
      [2, "1/1", "김가상", "독서", 8, 10],
      [2, "1/1", "김가상", "토론", 9, 10],
      [2, "1/2", "이가상", "독서", 7, 10],
      [2, "1/2", "이가상", "토론", 6, 10],
    ]);
    expect(summarize(students)).toEqual([
      "2-1-1 김가상 | 토론:9/10",
      "2-1-2 이가상 | 토론:6/10",
    ]);
  });

  it("[Q-07] 영역 값이 듣기, 말하기여도 점수와 학년을 읽지만 영역은 하나로 합쳐진다", async () => {
    const students = await parseRows([
      FLAT_HEADER,
      [2, "1/1", "김가상", "듣기", 8, 10],
      [2, "1/1", "김가상", "말하기", 9, 10],
      [2, "1/2", "이가상", "듣기", 7, 10],
    ]);
    expect(summarize(students)).toEqual([
      "2-1-1 김가상 | 듣기:9/10",
      "2-1-2 이가상 | 듣기:7/10",
    ]);
  });

  it("[Q-08] 반과 번호가 따로 있는 표는 학생을 찾지 못해 실패로 알린다", async () => {
    const rows: Rows = [SEPARATE_HEADER];
    for (let i = 1; i <= 20; i++) rows.push([2, 1, i, "김가상", "독서", 8, 10]);
    const result = await runWorker(toWorkbookBytes(rows));
    expect(result).toMatchObject(NO_STUDENTS_FOUND);
  });

  it("[Q-09] 반/번호 헤더가 없어도 1/1 꼴 칸이 처음 나오는 행부터 읽는다", async () => {
    const rows: Rows = [["학년", "학급번호", "이름", "평가영역", "점수", "만점"]];
    for (let i = 1; i <= 20; i++) rows.push([2, `1/${i}`, "김가상", "독서", 8, 10]);
    const students = await parseRows(rows);
    expect(students.map((s) => s.number)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("[Q-18] 2025학년도 제목만 있으면 반을 학년으로 읽지 않고 1학년으로 둔다", async () => {
    const students = await parseRows([
      ["2025학년도"],
      ["반/번호", "성명", "평가영역", "점수", "만점"],
      ["3/1", "김가상", "독서", 8, 10],
    ]);
    expect(students[0].id).toBe("1-3-1");
  });

  it("[Q-18] 7학년 표기가 반/번호 칸 위에 있어도 반을 학년으로 읽지 않는다", async () => {
    const students = await parseRows([
      ["7학년"],
      ["반/번호", "성명", "평가영역", "점수", "만점"],
      ["3/1", "김가상", "독서", 8, 10],
    ]);
    expect(students[0].id).toBe("1-3-1");
  });

  it("[Q-22] 만점 컬럼이 없으면 점수, 0점이면 0, 빈칸이면 100이 만점이 된다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "평가영역", "점수"],
      ["1/1", "김가상", "독서", 8],
      ["1/2", "이가상", "독서", 0],
      ["1/3", "박가상", "독서", ""],
    ]);
    expect(summarize(students)).toEqual([
      "1-1-1 김가상 | 독서:8/8",
      "1-1-2 이가상 | 독서:0/0",
      "1-1-3 박가상 | 독서:null/100",
    ]);
  });

  it("[Q-23] 총점 컬럼의 학생별 합계를 만점으로 읽는다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "점수", "총점"],
      ["1/1", "김가상", 8, 88],
      ["1/2", "이가상", 9, 99],
    ]);
    expect(summarize(students)).toEqual([
      "1-1-1 김가상 | 평가:8/88",
      "1-1-2 이가상 | 평가:9/99",
    ]);
  });

  it("[Q-28] 영어 헤더 표는 학생은 읽지만 score 칸을 찾지 못해 점수가 null이다", async () => {
    const students = await parseRows([
      ["grade", "class", "name", "score"],
      [2, "1/1", "김가상", 8],
    ]);
    expect(summarize(students)).toEqual(["2-1-1 김가상 | 평가:null/100"]);
  });
});
