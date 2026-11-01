import { describe, expect, it } from "vitest";
import { findNameHint, suggestListName } from "../../src/core/parser/listName";
import type { Student } from "../../src/types";

function student(grade: number, classNumber: number, number: number): Student {
  return { id: `${grade}-${classNumber}-${number}`, grade, class: classNumber, number, name: "가상", evaluations: [] };
}

const ONE_CLASS = [student(2, 1, 1), student(2, 1, 2)];

describe("제목 줄에서 학기와 과목 찾기", () => {
  it("나이스 전체 영역 제목", () => {
    const grid = [
      ["", "", "수행평가 일람표"],
      ["", "2025학년도   1학기   중학교   2학년   1 과학"],
      ["", "과목 : 과학", "", "담당 (수행) 가상선생"],
    ];
    expect(findNameHint(grid, 3)).toEqual({ term: "1학기", subject: "과학", area: undefined });
  });

  it("나이스 한 영역 제목", () => {
    const grid = [
      ["수행평가 일람표"],
      ["2025학년도   2학기   중학교   2학년   1 과학"],
      ["교과목 :   생활 과학    영역 :  탐구1 (서·논술)"],
    ];
    expect(findNameHint(grid, 3, "탐구1")).toEqual({ term: "2학기", subject: "생활 과학", area: "탐구1" });
  });

  it("과목 칸이 없으면 학년 뒤에서 찾는다", () => {
    expect(findNameHint([["2025학년도   1학기   중학교   2학년   1 과학"]], 1).subject).toBe("과학");
    expect(findNameHint([["2025학년도 1학기 과학 수행평가 일람표"]], 1).subject).toBe("과학");
  });

  it("없으면 비워 둔다", () => {
    expect(findNameHint([["2025학년도 1학기 수행평가 일람표"]], 1)).toEqual({
      term: "1학기",
      subject: undefined,
      area: undefined,
    });
    expect(findNameHint([["일람표"]], 1).term).toBeUndefined();
  });

  it("제목 줄 아래는 보지 않는다", () => {
    const grid = [["일람표"], ["과목 : 과학"]];
    expect(findNameHint(grid, 1).subject).toBeUndefined();
  });
});

describe("추천 이름", () => {
  it("전체 영역", () => {
    expect(suggestListName(ONE_CLASS, { term: "1학기", subject: "과학" })).toBe("2학년 1반 1학기 과학");
  });

  it("한 영역은 뒤에 영역 이름이 붙는다", () => {
    expect(suggestListName(ONE_CLASS, { term: "1학기", subject: "과학", area: "탐구1" })).toBe(
      "2학년 1반 1학기 과학 탐구1"
    );
  });

  it("표준 서식처럼 정보가 없으면 학년과 반만", () => {
    expect(suggestListName(ONE_CLASS)).toBe("2학년 1반");
  });

  it("반이 섞이면 학년만, 학년도 섞이면 뺀다", () => {
    expect(suggestListName([student(2, 1, 1), student(2, 2, 1)], { term: "1학기" })).toBe("2학년 1학기");
    expect(suggestListName([student(1, 1, 1), student(2, 1, 1)], { term: "1학기" })).toBe("1학기");
  });
});
