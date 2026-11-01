import { describe, expect, it } from "vitest";
import { studentNumberText, waitNeighbors } from "../../src/core/waitFlow";
import type { Student } from "../../src/types";

function student(number: number, classNumber = 1): Student {
  return { id: `2-${classNumber}-${number}`, grade: 2, class: classNumber, number, name: "가상", evaluations: [] };
}

const THREE = [student(1), student(2), student(3)];

describe("대기 화면의 양옆 학생", () => {
  it("첫 학생 위에는 아래 학생만 있다", () => {
    expect(waitNeighbors(THREE, -1)).toEqual({ above: null, below: THREE[0] });
  });

  it("두 학생 사이", () => {
    expect(waitNeighbors(THREE, 0)).toEqual({ above: THREE[0], below: THREE[1] });
  });

  it("마지막 학생 뒤에는 위 학생만 있다", () => {
    expect(waitNeighbors(THREE, 2)).toEqual({ above: THREE[2], below: null });
  });
});

describe("번호 문구", () => {
  it("한 반이면 번호만, 여러 반이면 반까지", () => {
    expect(studentNumberText(student(3), THREE)).toBe("3번");
    expect(studentNumberText(student(3, 2), [student(1), student(3, 2)])).toBe("2반 3번");
  });
});
