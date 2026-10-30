import { describe, expect, it } from "vitest";
import { autoDetectMapping, isMappingComplete } from "../../src/core/mapping";

describe("autoDetectMapping", () => {
  it("한 줄 헤더의 모든 컬럼을 찾는다", () => {
    expect(
      autoDetectMapping([["학년", "반/번호", "이름", "평가영역", "점수", "만점"]])
    ).toEqual({ grade: 0, class: 1, number: 1, name: 2, area: 3, score: 4, maxScore: 5 });
  });

  it.each([
    ["성명", "name"],
    ["name", "name"],
    ["득점", "score"],
    ["원점수", "score"],
    ["성취점", "score"],
    ["배점", "maxScore"],
    ["grade", "grade"],
    ["과제명", "area"],
    ["항목", "area"],
    ["평가 영역", "area"],
    ["영역 : 듣기", "area"],
    ["말하기 (서·논술)", "area"],
    ["듣기", "area"],
  ])("%s 헤더는 %s로 잡힌다", (header, key) => {
    expect(autoDetectMapping([["", header]])).toMatchObject({ [key]: 1 });
  });

  it("class 헤더는 번호까지 같은 컬럼으로 잡는다", () => {
    expect(autoDetectMapping([["class"]])).toEqual({ class: 0, number: 0 });
  });

  it("반/번호 표기 변형도 한 컬럼으로 잡는다", () => {
    expect(autoDetectMapping([["반 번호"]])).toEqual({ class: 0, number: 0 });
  });

  it("빈 입력은 빈 매핑이다", () => {
    expect(autoDetectMapping([])).toEqual({});
    expect(autoDetectMapping([["", ""]])).toEqual({});
  });

  it("여러 행에서 행 순서대로 처음 맞는 칸을 쓴다", () => {
    expect(autoDetectMapping([["", "", "점수"], ["점수", "", ""]]).score).toBe(2);
    expect(autoDetectMapping([["", ""], ["이름", ""]]).name).toBe(0);
  });

  it("영역 : 패턴이 다른 영역 헤더보다 우선한다", () => {
    expect(autoDetectMapping([["항목", "영역 : 듣기"]]).area).toBe(1);
  });

  it("area는 반/번호 컬럼에서 찾지 않는다", () => {
    expect(autoDetectMapping([["반/번호"], ["영역 : 듣기", "듣기"]]).area).toBe(1);
  });

  it("[Q-08] 반과 번호가 따로 있으면 반을 매핑하지 못한다", () => {
    const mapping = autoDetectMapping([["학년", "반", "번호", "이름"]]);
    expect(mapping.number).toBe(2);
    expect(mapping.class).toBeUndefined();
  });

  it("번호 헤더가 없을 때만 반 또는 학급을 class로 찾는다", () => {
    expect(autoDetectMapping([["학급", "이름"]])).toEqual({ class: 0, name: 1 });
    expect(autoDetectMapping([["반", "이름"]])).toEqual({ class: 0, name: 1 });
  });

  it("[Q-23] 총점 컬럼을 만점으로 잡지 않는다", () => {
    expect(autoDetectMapping([["점수", "총점"]]).maxScore).toBeUndefined();
  });

  it("[Q-28] 영어 score, area 헤더는 잡지 못한다", () => {
    expect(autoDetectMapping([["score", "area", "max"]])).toEqual({});
  });

  it("[Q-18] 2025학년도 같은 제목은 학년 컬럼으로 잡지 않는다", () => {
    expect(autoDetectMapping([["2025학년도"], ["", "이름"]]).grade).toBeUndefined();
  });

  it("[Q-28] 데이터 행의 값도 헤더처럼 검색한다", () => {
    expect(autoDetectMapping([["반/번호", "비고"], ["1/1", "점수 확인"]]).score).toBe(1);
  });

  it("[Q-28] 쓰기1 같은 번호 붙은 영역명은 area 패턴에 맞지 않는다", () => {
    expect(autoDetectMapping([["쓰기1"]]).area).toBeUndefined();
  });
});

describe("isMappingComplete", () => {
  const complete = { grade: 0, class: 1, number: 1, name: 2, area: 3, score: 4, maxScore: 5 };

  it("일곱 항목이 모두 있으면 true", () => {
    expect(isMappingComplete(complete)).toBe(true);
  });

  it("0번 컬럼도 있는 것으로 본다", () => {
    expect(isMappingComplete({ ...complete, grade: 0 })).toBe(true);
  });

  it.each(Object.keys(complete))("%s가 없으면 false", (key) => {
    expect(isMappingComplete({ ...complete, [key]: undefined })).toBe(false);
  });
});
