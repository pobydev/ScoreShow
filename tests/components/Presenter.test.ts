import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Presenter } from "../../src/components/Presenter";
import type { Student } from "../../src/types";

// 서버 렌더링에서는 zustand가 초기 상태만 돌려주므로 스토어를 대역으로 바꿉니다.
const state = vi.hoisted(() => ({
  students: [] as unknown[],
  selectedStudentId: null as string | null,
  isBlackout: false,
  isPresenterMode: true,
  setPresenterMode: () => undefined,
  setSelectedStudent: () => undefined,
  setBlackout: () => undefined,
  nextStudent: () => undefined,
  prevStudent: () => undefined,
}));

vi.mock("../../src/store/store", () => ({
  useStore: (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state),
}));

function student(number: number, name: string, withScores: boolean): Student {
  return {
    id: `2-1-${number}`,
    grade: 2,
    class: 1,
    number,
    name,
    evaluations: withScores ? [{ area: "듣기", score: 8, maxScore: 10 }] : [],
  };
}

const render = () => renderToStaticMarkup(createElement(Presenter));

beforeEach(() => {
  state.students = [student(1, "김가상", true), student(2, "이가상", false)];
  state.selectedStudentId = "2-1-1";
  state.isBlackout = false;
});

describe("발표 화면 학생 목록", () => {
  it("점수가 있는 학생에서는 목록과 점수를 보여 준다", () => {
    const html = render();
    expect(html).toContain("학생 목록");
    expect(html).toContain("듣기");
  });

  it("[C-03] 평가가 없는 학생에서도 목록이 남고 안내 문구를 보여 준다", () => {
    state.selectedStudentId = "2-1-2";
    const html = render();
    expect(html).toContain("학생 목록");
    expect(html).toContain("김가상");
    expect(html).toContain("표시할 데이터가 없습니다.");
  });

  it("[C-03] 선택된 학생이 없어도 목록이 남는다", () => {
    state.selectedStudentId = null;
    const html = render();
    expect(html).toContain("학생 목록");
    expect(html).toContain("표시할 데이터가 없습니다.");
  });
});
