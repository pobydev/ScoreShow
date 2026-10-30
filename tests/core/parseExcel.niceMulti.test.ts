import { describe, expect, it } from "vitest";
import { NO_STUDENTS_FOUND, parseStudents, runWorker, summarize } from "../helpers/runWorker";
import {
  NICE_MULTI_MERGES,
  NICE_MULTI_ROWS,
  NICE_REAL_AREAS_MERGES,
  NICE_REAL_AREAS_ROWS,
  NICE_REAL_NAMED_MERGES,
  NICE_REAL_NAMED_ROWS,
  NICE_STRUCTURE_MERGES,
  NICE_STRUCTURE_ROWS,
  toWorkbookBytes,
} from "../fixtures/workbooks";
import type { Merge, Rows } from "../fixtures/workbooks";

function parseRows(rows: Rows, merges?: Merge[]) {
  return parseStudents(toWorkbookBytes(rows, { merges }));
}

const HEADER = ["반/번호", "성명", "말하기", "듣기"];
const MAX_ROW = ["", "", "만점 10", "만점 10"];

describe("나이스 다중 영역", () => {
  it("병합 헤더, 만점 행, 빈 점수를 포함한 전형적인 표를 읽는다", async () => {
    const students = await parseRows(NICE_MULTI_ROWS, NICE_MULTI_MERGES);
    expect(summarize(students)).toEqual([
      "2-1-1 김가상 | 쓰기1:8.5/10 말하기:15/20 듣기:4/5",
      "2-1-2 이가상 | 쓰기1:10/10 말하기:20/20 듣기:5/5",
      "2-1-3 박가상 | 쓰기1:null/10 말하기:11/20 듣기:null/5",
    ]);
  });

  it("매핑과 헤더 행을 함께 돌려준다", async () => {
    const result = await runWorker(toWorkbookBytes(NICE_MULTI_ROWS, { merges: NICE_MULTI_MERGES }));
    expect(result).toMatchObject({
      success: true,
      mapping: { class: 0, number: 0, name: 1 },
    });
    if (!result.success) return;
    expect(result.headerRows?.[2].slice(0, 3)).toEqual(["반/번호", "성명", "쓰기1 (서·논술)"]);
  });

  it("같은 셀의 만점 표기를 읽는다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "읽기(만점:30)", "쓰기 (만점 12.5)"],
      ["1/1", "김가상", 30, 12],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 읽기:30/30 쓰기:12/12.5"]);
  });

  it("두 행 아래 만점까지 찾고 그보다 멀면 100을 쓴다", async () => {
    const near = await parseRows([
      ["반/번호", "성명", "말하기"],
      ["", "", ""],
      ["", "", "만점 10"],
      ["1/1", "김가상", 8],
    ]);
    expect(summarize(near)).toEqual(["1-1-1 김가상 | 말하기:8/10"]);
    const far = await parseRows([
      ["반/번호", "성명", "말하기"],
      ["", "", ""],
      ["", "", ""],
      ["", "", "만점 10"],
      ["1/1", "김가상", 8],
    ]);
    expect(summarize(far)).toEqual(["1-1-1 김가상 | 말하기:8/100"]);
  });

  it("쓰기 뒤의 숫자를 영역 이름에 남기고 괄호는 버린다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "쓰기1 (서·논술)", "쓰기2 (서·논술)"],
      ["1/1", "김가상", 1, 2],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 쓰기1:1/100 쓰기2:2/100"]);
  });

  it("0점을 빈칸과 구별한다", async () => {
    const students = await parseRows([HEADER, MAX_ROW, ["1/1", "김가상", 0, ""]]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 말하기:0/10 듣기:null/10"]);
  });

  it("결시 사유는 점수 칸에서만 확인하고 null로 둔다", async () => {
    const students = await parseRows([
      HEADER,
      MAX_ROW,
      ["1/1", "유예가상", 8, "인정결"],
      ["1/2", "이가상", "전출", 3],
    ]);
    expect(summarize(students)).toEqual([
      "1-1-1 유예가상 | 말하기:8/10 듣기:null/10",
      "1-1-2 이가상 | 말하기:null/10 듣기:3/10",
    ]);
  });

  it("반/번호를 읽지 못하는 행을 버리고 이름이 없으면 반/번호를 이름으로 보여 준다", async () => {
    const students = await parseRows([
      HEADER,
      MAX_ROW,
      ["1/1", "김가상", 1, 1],
      ["1/2", "", 1, 1],
      ["가/3", "박가상", 1, 1],
      ["합계", "", 2, 2],
    ]);
    expect(students.map((s) => [s.id, s.name])).toEqual([
      ["1-1-1", "김가상"],
      ["1-1-2", "1/2"],
    ]);
  });

  it("같은 학생이 다시 나오면 첫 이름을 두고 점수를 덮어쓴다", async () => {
    const students = await parseRows([
      HEADER,
      MAX_ROW,
      ["1/1", "김가상", 1, 1],
      ["1/1", "이가상", 2, 2],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 말하기:2/10 듣기:2/10"]);
  });

  it("30명이 넘어도 모두 읽고 정렬한다", async () => {
    const rows: Rows = [HEADER, MAX_ROW];
    for (let i = 35; i >= 1; i--) rows.push([`1/${i}`, "김가상", i % 11, ""]);
    const students = await parseRows(rows);
    expect(students).toHaveLength(35);
    expect(students[0].id).toBe("1-1-1");
    expect(students[34].id).toBe("1-1-35");
  });

  it("반/번호 헤더가 15번째 행까지만 인식된다", async () => {
    const memo = (count: number): Rows => Array.from({ length: count }, () => ["메모"]);
    const table: Rows = [["반/번호", "성명", "말하기"], ["1/1", "김가상", 8]];
    expect(await parseRows([...memo(14), ...table])).toHaveLength(1);
    expect(await runWorker(toWorkbookBytes([...memo(15), ...table]))).toMatchObject(
      NO_STUDENTS_FOUND
    );
  });
});

describe("실제 나이스 파일의 구조", () => {
  it("성명 칸이 빈 전체 영역 파일의 학생을 반/번호로 보여 주고 합계와 통계 줄은 읽지 않는다", async () => {
    const students = await parseRows(NICE_REAL_AREAS_ROWS, NICE_REAL_AREAS_MERGES);
    expect(summarize(students)).toEqual([
      "2-1-1 1/1 | 탐구1:18/20 탐구2:17/20 토론:25/30 실험:4/5",
      "2-1-2 1/2 | 탐구1:20/20 탐구2:null/20 토론:30/30 실험:5/5",
      "2-1-3 1/3 | 탐구1:12/20 탐구2:11/20 토론:15/30 실험:3/5",
    ]);
  });

  it("이름이 있고 제목 다음 줄부터 학생인 전체 영역 파일을 읽는다", async () => {
    const students = await parseRows(NICE_REAL_NAMED_ROWS, NICE_REAL_NAMED_MERGES);
    expect(summarize(students)).toEqual([
      "2-1-1 김가상 | 탐구1:18/20 탐구2:17/20 토론:25/30 실험:4/5",
      "2-1-2 이가상 | 탐구1:20/20 탐구2:19/20 토론:30/30 실험:5/5",
    ]);
  });
});

describe("구조로 영역 찾기", () => {
  it("[Q-05] 영어 낱말이 없는 실제 구조의 표에서 영역 5개와 점수를 읽는다", async () => {
    const students = await parseRows(NICE_STRUCTURE_ROWS, NICE_STRUCTURE_MERGES);
    expect(summarize(students)).toEqual([
      "3-2-1 김가상 | 실험 보고서:18/20 탐구 토론:9/100 관찰 일지:7.5/100 포트폴리오:25/100 발표:10/100",
      "3-2-2 이가상 | 실험 보고서:20/20 탐구 토론:null/100 관찰 일지:8/100 포트폴리오:30/100 발표:null/100",
      "3-2-3 박가상 | 실험 보고서:null/20 탐구 토론:7/100 관찰 일지:6/100 포트폴리오:21/100 발표:8/100",
    ]);
  });

  it("[Q-05] 비고, 합계, 총점처럼 점수가 아닌 칸은 영역으로 보지 않는다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "문법", "합계", "총점", "석차", "비고"],
      ["", "", "만점 10", "", "", "", ""],
      ["1/1", "김가상", 8, 8, 8, 1, "재평가"],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 문법:8/10"]);
  });

  it("[Q-05] 학생 줄에 점수도 결시 값도 없는 칸은 영역으로 보지 않는다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "문법", "담임 확인", "독서"],
      ["1/1", "김가상", 8, "", "인정결"],
      ["1/2", "이가상", 9, "확인함", 7],
    ]);
    expect(summarize(students)).toEqual([
      "1-1-1 김가상 | 문법:8/100 독서:null/100",
      "1-1-2 이가상 | 문법:9/100 독서:7/100",
    ]);
  });

  it("[Q-05] 괄호 안의 설명 낱말 때문에 영역을 빼지 않고 만점 칸은 영역으로 보지 않는다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "문법 (만점 10.00, 반영비율 20%)", "독서 만점", "토론(비고 참조)"],
      ["1/1", "김가상", 8, 10, 7],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 문법:8/10 토론:7/100"]);
  });

  it("아직 점수를 넣지 않은 칸은 영역 낱말이 있을 때만 미입력으로 남긴다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "문법", "듣기", "토론"],
      ["1/1", "김가상", 8, "", ""],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 문법:8/100 듣기:null/100"]);
  });

  it("반/번호 줄에서 영역을 못 찾으면 낱말 목록으로 찾는다", async () => {
    const students = await parseRows([
      ["", "", "듣기"],
      ["반/번호", "성명", ""],
      ["1/1", "김가상", 8],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 듣기:8/100"]);
  });

  it("점수나 평가영역 칸이 있는 표는 일반 표로 읽는다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "평가영역", "점수", "만점"],
      ["1/1", "김가상", "말하기", 8, 10],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 말하기:8/10"]);
  });
});

describe("나이스 다중 영역의 이상 동작", () => {
  it("[Q-02] 헤더 바로 아래가 1/1이고 20행 안에 다음 반이 있어도 앞 반을 읽는다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "말하기"],
      ["1/1", "김가상", 1],
      ["1/2", "이가상", 2],
      ["2/1", "박가상", 3],
      ["2/2", "최가상", 4],
    ]);
    expect(summarize(students)).toEqual([
      "1-1-1 김가상 | 말하기:1/100",
      "1-1-2 이가상 | 말하기:2/100",
      "1-2-1 박가상 | 말하기:3/100",
      "1-2-2 최가상 | 말하기:4/100",
    ]);
  });

  it("[Q-02] 헤더와 첫 학생 사이에 만점 행이 있으면 앞 반이 빠지지 않는다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "말하기"],
      ["", "", "만점 10"],
      ["1/1", "김가상", 1],
      ["2/1", "박가상", 3],
    ]);
    expect(students.map((s) => s.id)).toEqual(["1-1-1", "1-2-1"]);
  });

  it("[Q-02] 헤더 바로 아래가 첫 학생이고 16행을 넘어도 30명을 모두 읽는다", async () => {
    const rows: Rows = [["반/번호", "성명", "말하기"]];
    for (let i = 1; i <= 30; i++) rows.push([`1/${i}`, "김가상", 1]);
    const students = await parseRows(rows);
    expect(students.map((s) => s.number)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it("[Q-03] 뒤에 번호 1인 학생이 있어도 그 앞의 행을 읽는다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "말하기"],
      ["1/2", "김가상", 1],
      ["1/3", "이가상", 2],
      ["2/1", "박가상", 3],
    ]);
    expect(students.map((s) => s.id)).toEqual(["1-1-2", "1-1-3", "1-2-1"]);
  });

  it("[Q-03] 번호 1인 학생이 아예 없으면 첫 행부터 읽는다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "말하기"],
      ["1/2", "김가상", 1],
      ["1/3", "이가상", 2],
    ]);
    expect(students.map((s) => s.id)).toEqual(["1-1-2", "1-1-3"]);
  });

  it("[Q-04] 비고의 영역 이름이 같은 영역의 실제 점수를 지우지 않는다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "듣기", "비고"],
      ["", "", "만점 10", ""],
      ["1/1", "김가상", 8, ""],
      ["1/2", "이가상", 9, "듣기 재평가"],
    ]);
    expect(summarize(students)).toEqual([
      "1-1-1 김가상 | 듣기:8/10",
      "1-1-2 이가상 | 듣기:9/10",
    ]);
  });

  it("[Q-04] 비고의 다른 영역 이름이 없던 영역을 만들지 않는다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "듣기", "비고"],
      ["1/1", "김가상", 8, "말하기 미제출"],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 듣기:8/100"]);
  });

  it("[Q-04] 같은 영역 이름이 두 칸이면 둘 다 번호를 붙여 남긴다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "말하기", "말하기"],
      ["1/1", "김가상", 8, 3],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 말하기:8/100 말하기(2):3/100"]);
  });

  it("[Q-05] 쓰기, 말하기, 듣기, 읽기 외의 영역 열도 읽는다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "쓰기1", "문법"],
      ["1/1", "김가상", 8, 7],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 쓰기1:8/100 문법:7/100"]);
  });

  it("[Q-05] 키워드 영역이 하나도 없어도 점수와 만점을 읽는다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "문법", "발표"],
      ["", "", "만점 10", "만점 10"],
      ["1/1", "김가상", 8, 7],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 문법:8/10 발표:7/10"]);
  });

  it("[Q-19] 학년 컬럼을 읽지 않고 N학년 표기가 없으면 1학년이 된다", async () => {
    const students = await parseRows([
      ["학년", "반/번호", "성명", "말하기"],
      [3, "1/1", "김가상", 8],
    ]);
    expect(students[0].id).toBe("1-1-1");
  });

  it("[Q-21] 제목의 영역 낱말을 영역 열로 오인하지 않고 점수 칸을 읽는다", async () => {
    const students = await parseRows([
      ["말하기 듣기 평가 안내"],
      ["학년", "반/번호", "성명", "점수"],
      [3, "1/1", "김가상", 8],
    ]);
    expect(summarize(students)).toEqual(["3-1-1 김가상 | 평가:8/100"]);
  });

  it("[Q-21] 영역 칸이 있는 표에서도 제목의 낱말을 영역으로 만들지 않는다", async () => {
    const students = await parseRows([
      ["말하기 듣기 평가 안내"],
      ["반/번호", "성명", "문법"],
      ["1/1", "김가상", 8],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 문법:8/100"]);
  });

  it("[Q-25] 8점은 8로 읽고 만점 초과, 음수, 못 읽는 값은 미입력으로 두어 알린다", async () => {
    const result = await runWorker(
      toWorkbookBytes([
        ["반/번호", "성명", "말하기", "듣기"],
        ["", "", "만점 10", "만점 10"],
        ["1/1", "김가상", 12, -1],
        ["1/2", "이가상", "8점", ".5"],
        ["1/3", "박가상", "1,5", "5."],
        ["1/4", "최가상", "", "인정결"],
      ])
    );
    expect(result).toMatchObject({
      success: true,
      scoreIssues: [
        { class: 1, number: 1 },
        { class: 1, number: 1 },
        { class: 1, number: 2 },
      ],
    });
    if (!result.success) return;
    expect(summarize(result.students)).toEqual([
      "1-1-1 김가상 | 말하기:null/10 듣기:null/10",
      "1-1-2 이가상 | 말하기:8/10 듣기:null/10",
      "1-1-3 박가상 | 말하기:1.5/10 듣기:5/10",
      "1-1-4 최가상 | 말하기:null/10 듣기:null/10",
    ]);
  });

  it("[Q-27] 16번째 행 아래의 헤더는 인식하지 못하고 실패로 알린다", async () => {
    const result = await runWorker(
      toWorkbookBytes([
        ...Array.from({ length: 15 }, () => ["메모"]),
        ["반/번호", "성명", "말하기"],
        ["1/1", "김가상", 8],
      ])
    );
    expect(result).toMatchObject(NO_STUDENTS_FOUND);
  });
});
