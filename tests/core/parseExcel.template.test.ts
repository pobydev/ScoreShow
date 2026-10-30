import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NO_STUDENTS_FOUND, parseStudents, runWorker, summarize } from "../helpers/runWorker";
import { templateRows, toWorkbookBytes } from "../fixtures/workbooks";
import type { Rows } from "../fixtures/workbooks";

const NAMED_HEADER = ["학년", "반", "번호", "이름", "쓰기1", "쓰기1 만점", "말하기", "말하기 만점"];

function parseTemplate(rows: Rows, header?: Rows[number]) {
  return parseStudents(toWorkbookBytes(templateRows(rows, header)));
}

describe("표준 템플릿", () => {
  it("[Q-13] 저장소의 실제 템플릿 파일을 읽으면 예시 두 행이 학생이 된다", async () => {
    const bytes = new Uint8Array(readFileSync("public/ScoreShow_Template.xlsx"));
    const result = await runWorker(bytes);
    expect(result).toMatchObject({ success: true, mapping: null });
    expect(result).not.toHaveProperty("headerRows");
    if (!result.success) return;
    expect(
      result.students.map((s) => [s.id, s.evaluations.map((e) => `${e.area}:${e.score}/${e.maxScore}`)])
    ).toEqual([
      ["2-1-1", ["영역1:9/10", "영역2:8/10", "영역3:18/20", "영역4:19/20", "영역5:19/20"]],
      ["2-1-2", ["영역1:7/10", "영역2:9/10", "영역3:17/20", "영역4:18/20", "영역5:18/20"]],
    ]);
  });

  it("1행의 영역 이름과 2행의 기본 만점을 쓴다", async () => {
    const students = await parseTemplate(
      [
        [2, 1, 1, "김가상", 9, 10, 8, 20],
        [2, 1, 2, "이가상", 7, "", 9, ""],
      ],
      NAMED_HEADER
    );
    expect(summarize(students)).toEqual([
      "2-1-1 김가상 | 쓰기1:9/10 말하기:8/20",
      "2-1-2 이가상 | 쓰기1:7/10 말하기:9/20",
    ]);
  });

  it("행마다 적은 만점이 2행 기본 만점보다 우선한다", async () => {
    const students = await parseTemplate(
      [
        [2, 1, 1, "김가상", 9, 10],
        [2, 1, 2, "이가상", 7, 15],
      ],
      NAMED_HEADER
    );
    expect(summarize(students)).toEqual([
      "2-1-1 김가상 | 쓰기1:9/10",
      "2-1-2 이가상 | 쓰기1:7/15",
    ]);
  });

  it("행의 만점이 0 이하이면 기본 만점을 쓴다", async () => {
    const students = await parseTemplate(
      [
        [2, 1, 1, "김가상", 9, 10, 8, 10],
        [2, 1, 2, "이가상", 3, 0, 4, -3],
      ],
      NAMED_HEADER
    );
    expect(summarize(students)[1]).toBe("2-1-2 이가상 | 쓰기1:3/10 말하기:4/10");
  });

  it("2행에도 만점이 없으면 100이다", async () => {
    const students = await parseTemplate([[2, 1, 1, "김가상", 9, "", 8, ""]], NAMED_HEADER);
    expect(summarize(students)).toEqual(["2-1-1 김가상 | 쓰기1:9/100 말하기:8/100"]);
  });

  it("학년, 반, 번호 순으로 정렬한다", async () => {
    const students = await parseTemplate([
      [2, 1, 2, "다가상", 1, 10],
      [1, 3, 1, "가가상", 1, 10],
      [2, 1, 1, "나가상", 1, 10],
    ]);
    expect(students.map((s) => s.id)).toEqual(["1-3-1", "2-1-1", "2-1-2"]);
  });

  it("학년 칸이 비거나 학년 컬럼이 없으면 1학년이다", async () => {
    expect((await parseTemplate([["", 1, 1, "김가상", 1, 10]]))[0].id).toBe("1-1-1");
    const noGrade = await parseStudents(
      toWorkbookBytes([
        ["안내"],
        ["", "반", "번호", "이름", "쓰기1", "쓰기1 만점"],
        ["", 2, 3, "김가상", 7, 10],
      ])
    );
    expect(summarize(noGrade)).toEqual(["1-2-3 김가상 | 쓰기1:7/10"]);
  });

  it("학년, 반, 번호는 앞쪽 정수만 읽고 숫자가 아니면 행을 버린다", async () => {
    const students = await parseTemplate([
      ["2학년", "1반", "7번", "김가상", 1, 10],
      [2, "가", 8, "이가상", 1, 10],
      [2, 1, "나", "박가상", 1, 10],
    ]);
    expect(students.map((s) => s.id)).toEqual(["2-1-7"]);
  });

  it("이름이 비면 행을 버린다", async () => {
    const students = await parseTemplate([
      [2, 1, 1, "", 1, 10],
      [2, 1, 2, "이가상", 1, 10],
    ]);
    expect(students.map((s) => s.id)).toEqual(["2-1-2"]);
  });

  it("헤더 공백과 대소문자 없이 학년, 반, 번호, 이름을 찾는다", async () => {
    const students = await parseStudents(
      toWorkbookBytes([
        ["안내"],
        [" 학 년 ", " 반", "번 호", "이 름", "쓰기1", "쓰기1 만점"],
        [2, 1, 1, "김가상", 7, 10],
      ])
    );
    expect(students.map((s) => s.id)).toEqual(["2-1-1"]);
  });

  it("점수 칸의 글자는 버리고 숫자만 읽는다", async () => {
    const students = await parseTemplate([
      [2, 1, 1, "김가상", 9, 10],
      [2, 1, 2, "이가상", "8점", ""],
    ]);
    expect(summarize(students)[1]).toBe("2-1-2 이가상 | 영역1:8/10");
  });

  it("마지막 만점 칸까지 있어야 영역으로 인식한다", async () => {
    const students = await parseStudents(
      toWorkbookBytes([
        ["안내"],
        ["학년", "반", "번호", "이름", "국어", "국어만점", "수학"],
        [2, 1, 1, "김가상", 90, 100, 80],
      ])
    );
    expect(summarize(students)).toEqual(["2-1-1 김가상 | 국어:90/100"]);
  });
});

describe("표준 템플릿의 이상 동작", () => {
  it("[Q-11] 점수 8/10은 슬래시를 지워 810이 된다", async () => {
    const students = await parseTemplate([[2, 1, 1, "김가상", "8/10", 10]], NAMED_HEADER);
    expect(summarize(students)).toEqual(["2-1-1 김가상 | 쓰기1:810/10"]);
  });

  it("[Q-11] 점수 6,50은 쉼표를 지워 650이 된다", async () => {
    const students = await parseTemplate([[2, 1, 1, "김가상", "6,50", 10]], NAMED_HEADER);
    expect(summarize(students)).toEqual(["2-1-1 김가상 | 쓰기1:650/10"]);
  });

  it("[Q-25] 음수와 만점 초과 점수를 그대로 받아들인다", async () => {
    const students = await parseTemplate([[2, 1, 1, "김가상", -5, 10, 150, 100]], NAMED_HEADER);
    expect(summarize(students)).toEqual(["2-1-1 김가상 | 쓰기1:-5/10 말하기:150/100"]);
  });

  it("[Q-12] 첫 학생 칸의 글자가 그 영역의 이름이 되고 첫 학생 점수는 빠진다", async () => {
    const students = await parseTemplate([
      [2, 1, 1, "김가상", "결시", 10, 5, 10],
      [2, 1, 2, "이가상", 7, "", 9, ""],
    ]);
    expect(summarize(students)).toEqual([
      "2-1-1 김가상 | 영역2:5/10",
      "2-1-2 이가상 | 결시:7/10 영역2:9/10",
    ]);
  });

  it("[Q-12] 첫 학생 칸이 8/10이면 영역 이름이 8/10이 된다", async () => {
    const students = await parseTemplate([[2, 1, 1, "김가상", "8/10", 10]]);
    expect(summarize(students)).toEqual(["2-1-1 김가상 | 8/10:810/10"]);
  });

  it("[Q-14] 같은 학년, 반, 번호가 두 번 나오면 첫 이름을 쓰고 평가를 이어 붙인다", async () => {
    const students = await parseTemplate(
      [
        [2, 1, 1, "김가상", 9, 10],
        [2, 1, 1, "이가상", 3, ""],
      ],
      NAMED_HEADER
    );
    expect(summarize(students)).toEqual(["2-1-1 김가상 | 쓰기1:9/10 쓰기1:3/10"]);
  });

  it("[Q-15] 빈 점수와 읽지 못한 점수는 평가 자체를 만들지 않는다", async () => {
    const students = await parseTemplate(
      [
        [2, 1, 1, "김가상", 9, 10, 8, 10],
        [2, 1, 2, "이가상", "", "", "미응시", ""],
        [2, 1, 3, "박가상", 7, "", "", ""],
      ],
      NAMED_HEADER
    );
    expect(summarize(students)).toEqual([
      "2-1-1 김가상 | 쓰기1:9/10 말하기:8/10",
      "2-1-3 박가상 | 쓰기1:7/10",
    ]);
  });

  it("[Q-17] 점수가 하나도 없으면 일반 파서로 넘어가 실패로 알린다", async () => {
    const result = await runWorker(
      toWorkbookBytes(templateRows([[2, 1, 1, "김가상", "", "", "", ""]]))
    );
    expect(result).toMatchObject(NO_STUDENTS_FOUND);
  });

  it("[Q-16] 영역 칸이 고정 열이라 학년 컬럼이 없는 표는 인식하지 못하고 실패로 알린다", async () => {
    const result = await runWorker(
      toWorkbookBytes([
        ["안내"],
        ["반", "번호", "이름", "국어", "수학"],
        [1, 1, "김가상", 90, 80],
      ])
    );
    expect(result).toMatchObject(NO_STUDENTS_FOUND);
  });

  it("[Q-16] 헤더가 2행에 있어야만 표준 템플릿으로 인식한다", async () => {
    const result = await runWorker(
      toWorkbookBytes([
        ["학년", "반", "번호", "이름", "쓰기1", "쓰기1 만점"],
        [2, 1, 1, "김가상", 7, 10],
      ])
    );
    expect(result).toMatchObject(NO_STUDENTS_FOUND);
  });
});
