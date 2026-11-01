import { describe, expect, it } from "vitest";
import {
  areaColumns,
  differenceText,
  diffStudents,
  findListByName,
  isSameContent,
  normalizeListName,
  savedDateText,
  STALE_AFTER_MS,
  staleLists,
} from "../../src/core/lists";
import type { StoredList, Student } from "../../src/types";

function student(number: number, score: number | null = 8, name = `가상${number}`): Student {
  return {
    id: `2-1-${number}`,
    grade: 2,
    class: 1,
    number,
    name,
    evaluations: [{ area: "듣기", score, maxScore: 10 }],
  };
}

describe("이름 비교", () => {
  it("앞뒤 공백과 겹친 공백을 같은 이름으로 본다", () => {
    expect(normalizeListName("  2학년   1반 ")).toBe("2학년 1반");
    const lists: StoredList[] = [
      { id: "broken", unreadable: true },
      { id: "a", name: "2학년 1반", savedAt: 1, students: [] },
    ];
    expect(findListByName(lists, " 2학년  1반")?.id).toBe("a");
    expect(findListByName(lists, "2학년 2반")).toBeUndefined();
  });
});

describe("내용 비교", () => {
  it("같으면 차이가 없다", () => {
    const difference = diffStudents([student(1)], [student(1)]);
    expect(difference).toEqual({ students: 0, scores: 0 });
    expect(isSameContent(difference)).toBe(true);
  });

  it("점수와 만점이 다르면 점수로 센다", () => {
    expect(diffStudents([student(1)], [student(1, 5)]).scores).toBe(1);
    const changedMax = { ...student(1), evaluations: [{ area: "듣기", score: 8, maxScore: 20 }] };
    expect(diffStudents([student(1)], [changedMax]).scores).toBe(1);
  });

  it("점수를 비운 것도 차이다", () => {
    expect(diffStudents([student(1)], [student(1, null)]).scores).toBe(1);
  });

  it("학생이 늘거나 줄거나 이름이 다르면 학생으로 센다", () => {
    expect(diffStudents([student(1)], [student(1), student(2)]).students).toBe(1);
    expect(diffStudents([student(1), student(2)], [student(1)]).students).toBe(1);
    expect(diffStudents([student(1)], [student(1, 8, "다른 이름")]).students).toBe(1);
  });

  it("영역이 늘거나 줄면 점수로 센다", () => {
    const extra = {
      ...student(1),
      evaluations: [...student(1).evaluations, { area: "쓰기", score: 1, maxScore: 10 }],
    };
    expect(diffStudents([student(1)], [extra]).scores).toBe(1);
    expect(diffStudents([extra], [student(1)]).scores).toBe(1);
  });

  it("문구는 있는 차이만 적는다", () => {
    expect(differenceText({ students: 1, scores: 3 })).toBe("학생 1명, 점수 3개가 다릅니다.");
    expect(differenceText({ students: 0, scores: 3 })).toBe("점수 3개가 다릅니다.");
    expect(differenceText({ students: 2, scores: 0 })).toBe("학생 2명이 다릅니다.");
  });
});

describe("오래된 목록", () => {
  const NOW = 1_000_000_000_000;
  const list = (id: string, age: number): StoredList => ({
    id,
    name: id,
    savedAt: NOW - age,
    students: [],
  });

  it("저장한 지 30일이 되면 오래된 목록이다", () => {
    const lists = [list("old", STALE_AFTER_MS), list("new", STALE_AFTER_MS - 1), { id: "x", unreadable: true } as const];
    expect(staleLists(lists, NOW).map((item) => item.id)).toEqual(["old"]);
  });

  it("저장일 문구", () => {
    expect(savedDateText(new Date(2026, 9, 30).getTime())).toBe("10월 30일 저장");
  });
});

describe("전체 점수표 칸", () => {
  it("처음 나온 순서대로 영역을 모으고 만점은 처음 값을 쓴다", () => {
    const first = {
      ...student(1),
      evaluations: [
        { area: "듣기", score: 1, maxScore: 10 },
        { area: "쓰기", score: 1, maxScore: 20 },
      ],
    };
    const second = {
      ...student(2),
      evaluations: [
        { area: "말하기", score: 1, maxScore: 5 },
        { area: "듣기", score: 1, maxScore: 99 },
      ],
    };
    expect(areaColumns([first, second])).toEqual([
      { area: "듣기", maxScore: 10 },
      { area: "쓰기", maxScore: 20 },
      { area: "말하기", maxScore: 5 },
    ]);
  });

  it("평가 없는 학생만 있으면 칸이 없다", () => {
    expect(areaColumns([{ ...student(1), evaluations: [] }])).toEqual([]);
  });
});
