import { describe, expect, it } from "vitest";
import { parseStudents, runWorker, summarize } from "../helpers/runWorker";
import {
  NICE_MULTI_MERGES,
  NICE_MULTI_ROWS,
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

  it("이름이 없거나 반/번호를 읽지 못하는 행을 버린다", async () => {
    const students = await parseRows([
      HEADER,
      MAX_ROW,
      ["1/1", "김가상", 1, 1],
      ["1/2", "", 1, 1],
      ["가/3", "박가상", 1, 1],
      ["합계", "", 2, 2],
    ]);
    expect(students.map((s) => s.id)).toEqual(["1-1-1"]);
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
    expect(await parseRows([...memo(15), ...table])).toEqual([]);
  });
});

describe("나이스 다중 영역의 이상 동작", () => {
  it("[Q-02] 헤더 바로 아래가 1/1이고 20행 안에 다음 반이 있으면 앞 반이 통째로 빠진다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "말하기"],
      ["1/1", "김가상", 1],
      ["1/2", "이가상", 2],
      ["2/1", "박가상", 3],
      ["2/2", "최가상", 4],
    ]);
    expect(summarize(students)).toEqual([
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

  it("[Q-02] 헤더 바로 아래가 첫 학생이고 16행을 넘으면 15번째 행까지의 학생이 빠진다", async () => {
    const rows: Rows = [["반/번호", "성명", "말하기"]];
    for (let i = 1; i <= 30; i++) rows.push([`1/${i}`, "김가상", 1]);
    const students = await parseRows(rows);
    expect(students.map((s) => s.number)).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 15)
    );
  });

  it("[Q-03] 뒤에 번호 1인 학생이 있으면 그 앞의 행을 버린다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "말하기"],
      ["1/2", "김가상", 1],
      ["1/3", "이가상", 2],
      ["2/1", "박가상", 3],
    ]);
    expect(students.map((s) => s.id)).toEqual(["1-2-1"]);
  });

  it("[Q-03] 번호 1인 학생이 아예 없으면 첫 행부터 읽는다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "말하기"],
      ["1/2", "김가상", 1],
      ["1/3", "이가상", 2],
    ]);
    expect(students.map((s) => s.id)).toEqual(["1-1-2", "1-1-3"]);
  });

  it("[Q-04] 비고의 영역 이름이 같은 영역의 실제 점수를 모두 지운다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "듣기", "비고"],
      ["", "", "만점 10", ""],
      ["1/1", "김가상", 8, ""],
      ["1/2", "이가상", 9, "듣기 재평가"],
    ]);
    expect(summarize(students)).toEqual([
      "1-1-1 김가상 | 듣기:null/100",
      "1-1-2 이가상 | 듣기:null/100",
    ]);
  });

  it("[Q-04] 비고의 다른 영역 이름이 없던 영역을 만든다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "듣기", "비고"],
      ["1/1", "김가상", 8, "말하기 미제출"],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 듣기:8/100 말하기:null/100"]);
  });

  it("[Q-04] 같은 영역 이름이 두 칸이면 뒤 칸이 앞 칸을 덮어쓴다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "말하기", "말하기"],
      ["1/1", "김가상", 8, 3],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 말하기:3/100"]);
  });

  it("[Q-05] 쓰기, 말하기, 듣기, 읽기 외의 영역 열은 조용히 빠진다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "쓰기1", "문법"],
      ["1/1", "김가상", 8, 7],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 쓰기1:8/100"]);
  });

  it("[Q-05] 키워드 영역이 하나도 없으면 점수를 잃고 첫 영역 점수가 만점이 된다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "문법", "발표"],
      ["", "", "만점 10", "만점 10"],
      ["1/1", "김가상", 8, 7],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 평가:null/8"]);
  });

  it("[Q-19] 학년 컬럼을 읽지 않고 N학년 표기가 없으면 1학년이 된다", async () => {
    const students = await parseRows([
      ["학년", "반/번호", "성명", "말하기"],
      [3, "1/1", "김가상", 8],
    ]);
    expect(students[0].id).toBe("1-1-1");
  });

  it("[Q-21] 제목의 영역 낱말을 영역 열로 오인해 엉뚱한 열을 점수로 읽는다", async () => {
    const students = await parseRows([
      ["말하기 듣기 평가 안내"],
      ["학년", "반/번호", "성명", "점수"],
      [3, "1/1", "김가상", 8],
    ]);
    expect(summarize(students)).toEqual(["1-1-1 김가상 | 말하기:3/100"]);
  });

  it("[Q-25] 만점 초과, 음수, 단위, 소수점 변형 점수는 조용히 null이 된다", async () => {
    const students = await parseRows([
      ["반/번호", "성명", "말하기", "듣기"],
      ["", "", "만점 10", "만점 10"],
      ["1/1", "김가상", 12, -1],
      ["1/2", "이가상", "8점", ".5"],
      ["1/3", "박가상", "1,5", "5."],
    ]);
    expect(summarize(students)).toEqual([
      "1-1-1 김가상 | 말하기:null/10 듣기:null/10",
      "1-1-2 이가상 | 말하기:null/10 듣기:null/10",
      "1-1-3 박가상 | 말하기:null/10 듣기:5/10",
    ]);
  });

  it("[Q-27] 16번째 행 아래의 헤더는 인식하지 못하고 성공과 0명을 돌려준다", async () => {
    const result = await runWorker(
      toWorkbookBytes([
        ...Array.from({ length: 15 }, () => ["메모"]),
        ["반/번호", "성명", "말하기"],
        ["1/1", "김가상", 8],
      ])
    );
    expect(result).toMatchObject({ success: true, students: [], mapping: {} });
  });
});
