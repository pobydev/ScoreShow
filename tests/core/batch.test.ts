import { describe, expect, it } from "vitest";
import { canSave, distinctNames, fileStem, rowStates, savesByDefault } from "../../src/core/batch";
import type { StoredList, Student } from "../../src/types";

function student(number: number, score = 8): Student {
  return {
    id: `2-1-${number}`,
    grade: 2,
    class: 1,
    number,
    name: `가상${number}`,
    evaluations: [{ area: "듣기", score, maxScore: 10 }],
  };
}

describe("fileStem", () => {
  it("확장자를 빼고 공백을 정리한다", () => {
    expect(fileStem("2학년  1반 과학.xlsx")).toBe("2학년 1반 과학");
    expect(fileStem("점수.v2.xls")).toBe("점수.v2");
  });
});

describe("distinctNames", () => {
  it("겹치는 이름 뒤에 차례로 번호를 붙인다", () => {
    expect(distinctNames(["1반", "2반", "1반", " 1반 "])).toEqual(["1반", "2반", "1반 (2)", "1반 (3)"]);
  });

  it("붙인 번호가 다른 이름과 겹치면 다음 번호를 쓴다", () => {
    expect(distinctNames(["1반 (2)", "1반", "1반"])).toEqual(["1반 (2)", "1반", "1반 (3)"]);
  });
});

describe("rowStates", () => {
  const lists: StoredList[] = [
    { id: "a", name: "1반", savedAt: 1, students: [student(1)] },
    { id: "b", name: "2반", savedAt: 1, students: [student(1)] },
  ];

  it("새 이름, 같은 내용, 다른 내용, 빈 이름, 위 줄과 같은 이름을 가린다", () => {
    const states = rowStates(
      [
        { name: "3반", students: [student(1)] },
        { name: "1반", students: [student(1)] },
        { name: "2반", students: [student(1, 5)] },
        { name: "  ", students: [student(1)] },
        { name: "3반 ", students: [student(1)] },
      ],
      lists
    );
    expect(states).toEqual([
      { kind: "new" },
      { kind: "same" },
      { kind: "conflict", summary: "점수 1개가 다릅니다." },
      { kind: "empty" },
      { kind: "duplicate" },
    ]);
  });

  it("덮어쓰기는 기본으로 체크하지 않고, 막힌 줄은 저장할 수 없다", () => {
    expect(savesByDefault({ kind: "new" })).toBe(true);
    expect(savesByDefault({ kind: "conflict", summary: "" })).toBe(false);
    expect(savesByDefault({ kind: "same" })).toBe(false);
    expect(canSave({ kind: "conflict", summary: "" })).toBe(true);
    expect(canSave({ kind: "duplicate" })).toBe(false);
    expect(canSave({ kind: "empty" })).toBe(false);
  });
});
