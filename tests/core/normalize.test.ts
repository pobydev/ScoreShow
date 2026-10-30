import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeRow } from "../../src/core/normalize";
import type { ParsedRow } from "../../src/types";

const BASE: ParsedRow = { grade: "2", class: "1/3", name: "김가상", area: "듣기" };

function evaluationOf(row: Partial<ParsedRow>) {
  return normalizeRow({ ...BASE, ...row })?.evaluation;
}

function scoreOf(score: string | undefined) {
  return evaluationOf({ score, maxScore: "100" })?.score;
}

function maxScoreOf(maxScore: string | undefined, score: string | undefined) {
  return evaluationOf({ score, maxScore })?.maxScore;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("normalizeRow 점수", () => {
  it.each([
    ["10", 10],
    ["7.5", 7.5],
    ["0", 0],
    ["10점", 10],
    [" 10 점 ", 10],
    ["10/10", 10],
    ["10 / 10", 10],
    ["6,50", 6.5],
    ["5.", 5],
  ])("%j → %j", (input, expected) => {
    expect(scoreOf(input)).toBe(expected);
  });

  it.each([
    [undefined],
    [""],
    ["   "],
    ["abc"],
    ["-1"],
    [".5"],
    ["1.2.3"],
    ["/10"],
    ["미응시"],
  ])("%j → null", (input) => {
    expect(scoreOf(input)).toBeNull();
  });

  it.each(["인정결", "질병결", "미인정결", "기타결", "입학", "재입학", "편입학", "전입학", "전출", "면제", "유예", "취학", "재취학"])(
    "결시 사유 %s → null",
    (reason) => {
      expect(scoreOf(reason)).toBeNull();
    }
  );

  it("[Q-29] 쉼표를 소수점으로만 보므로 1,000은 1이 된다", () => {
    expect(scoreOf("1,000")).toBe(1);
  });

  it("[Q-29] 10점/10은 숫자로 읽지 못해 null이 된다", () => {
    expect(scoreOf("10점/10")).toBeNull();
  });
});

describe("normalizeRow 만점", () => {
  it.each([
    ["10", 10],
    ["10점", 10],
    ["8/10", 10],
    ["10/", 10],
    ["만점 20", 20],
    ["12.5", 12.5],
  ])("%j → %j", (input, expected) => {
    expect(maxScoreOf(input, "8")).toBe(expected);
  });

  it("[Q-22] 만점이 없으면 점수를 만점으로 삼는다", () => {
    expect(maxScoreOf(undefined, "8")).toBe(8);
  });

  it("[Q-22] 만점이 없고 0점이면 만점도 0이 된다", () => {
    expect(maxScoreOf(undefined, "0")).toBe(0);
  });

  it("만점도 점수도 없으면 100이다", () => {
    expect(maxScoreOf(undefined, undefined)).toBe(100);
  });

  it("만점을 읽지 못하면 점수를, 점수도 없으면 100을 쓴다", () => {
    expect(maxScoreOf("abc", "8")).toBe(8);
    expect(maxScoreOf("abc", undefined)).toBe(100);
    expect(maxScoreOf("abc", "0")).toBe(100);
  });

  it("[Q-29] 음수 만점은 부호를 버려 양수가 된다", () => {
    expect(maxScoreOf("-5", "1")).toBe(5);
  });

  it("[Q-29] 쉼표가 있는 만점은 앞자리만 읽는다", () => {
    expect(maxScoreOf("1,000", "1")).toBe(1);
  });

  it("만점 0은 그대로 둔다", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(maxScoreOf("0", "8")).toBe(0);
    expect(warn).toHaveBeenCalled();
  });

  it("만점 초과 점수는 경고만 하고 그대로 둔다", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(evaluationOf({ score: "12", maxScore: "10" })).toEqual({
      area: "듣기",
      score: 12,
      maxScore: 10,
    });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("[Q-33] 만점 초과 경고가 학생 이름과 점수를 콘솔에 남긴다", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    evaluationOf({ score: "12", maxScore: "10" });
    expect(warn).toHaveBeenCalledWith("Score exceeds max: 12/10 for 김가상");
  });
});

describe("normalizeRow 학년, 반, 번호, 이름, 영역", () => {
  it("반/번호 한 칸을 나눈다", () => {
    expect(normalizeRow({ ...BASE, class: "3/12", number: "3/12" })).toMatchObject({
      class: 3,
      number: 12,
    });
    expect(normalizeRow({ ...BASE, class: " 3 / 12 " })).toMatchObject({
      class: 3,
      number: 12,
    });
  });

  it("number 칸에만 반/번호가 있어도 나눈다", () => {
    expect(normalizeRow({ ...BASE, class: undefined, number: "3/12" })).toMatchObject({
      class: 3,
      number: 12,
    });
  });

  it("반과 번호가 따로 있으면 각각 정수로 읽는다", () => {
    expect(normalizeRow({ ...BASE, class: "2반", number: "7번" })).toMatchObject({
      class: 2,
      number: 7,
    });
  });

  it("[Q-29] 슬래시가 셋 이상 나뉘어도 앞의 둘만 쓴다", () => {
    expect(normalizeRow({ ...BASE, class: "1/2/3" })).toMatchObject({
      class: 1,
      number: 2,
    });
  });

  it("[Q-29] class가 숫자이고 number가 반/번호면 number의 앞자리를 번호로 읽는다", () => {
    expect(normalizeRow({ ...BASE, class: "2", number: "3/12" })).toMatchObject({
      class: 2,
      number: 3,
    });
  });

  it.each([
    ["반이 없음", { class: undefined }],
    ["번호가 없음", { class: "1", number: undefined }],
    ["반/번호를 읽지 못함", { class: "가/1" }],
    ["이름이 없음", { name: undefined }],
    ["이름이 공백", { name: "   " }],
  ])("%s → null", (_label, row) => {
    expect(normalizeRow({ ...BASE, ...row })).toBeNull();
  });

  it("학년이 없거나 숫자가 아니면 1이다", () => {
    expect(normalizeRow({ ...BASE, grade: undefined })?.grade).toBe(1);
    expect(normalizeRow({ ...BASE, grade: "가" })?.grade).toBe(1);
  });

  it("학년은 앞쪽 정수만 읽는다", () => {
    expect(normalizeRow({ ...BASE, grade: "2학년" })?.grade).toBe(2);
    expect(normalizeRow({ ...BASE, grade: "2.7" })?.grade).toBe(2);
  });

  it("이름의 앞뒤 공백을 지우고 안쪽 공백을 하나로 줄이며 전각을 반각으로 바꾼다", () => {
    expect(normalizeRow({ ...BASE, name: "  김   가상 " })?.name).toBe("김 가상");
    expect(normalizeRow({ ...BASE, name: "ＡＢ１" })?.name).toBe("AB1");
    expect(normalizeRow({ ...BASE, name: "김　가상" })?.name).toBe("김 가상");
  });

  it("영역이 없거나 공백이면 평가, 그 외에는 앞뒤 공백만 지운다", () => {
    expect(evaluationOf({ area: undefined })?.area).toBe("평가");
    expect(evaluationOf({ area: "  " })?.area).toBe("평가");
    expect(evaluationOf({ area: " 듣기 " })?.area).toBe("듣기");
  });

  it("점수가 없어도 행을 버리지 않는다", () => {
    expect(evaluationOf({ score: undefined })).toEqual({
      area: "듣기",
      score: null,
      maxScore: 100,
    });
  });
});
