import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditMode } from "../../src/components/preview/useEditMode";
import type { Student } from "../../src/types";

// DOM 시험 도구를 의존성에 넣지 않으려고 훅이 쓰는 React 함수만 대역으로 바꿉니다.
// useEffect는 React처럼 의존성이 바뀌었을 때만 실행합니다.
const harness = vi.hoisted(() => {
  const focus = vi.fn();
  let lastDeps: unknown[] | undefined;
  return {
    focus,
    isEditMode: true,
    reset() {
      lastDeps = undefined;
      focus.mockClear();
    },
    react: {
      useEffect(effect: () => void, deps: unknown[]) {
        if (!lastDeps || deps.some((dep, i) => !Object.is(dep, lastDeps?.[i]))) {
          effect();
        }
        lastDeps = deps;
      },
      useRef: () => ({ current: { focus } }),
      useState: (initial: unknown) => [initial, () => undefined],
    },
  };
});

vi.mock("react", () => harness.react);
vi.mock("../../src/store/store", () => ({
  useStore: (selector: (state: unknown) => unknown) =>
    selector({ isEditMode: harness.isEditMode, setEditMode: () => undefined }),
}));

function student(id: string): Student {
  return {
    id,
    grade: 2,
    class: 1,
    number: 1,
    name: "김가상",
    evaluations: [{ area: "영역1", score: 8, maxScore: 10 }],
  };
}

// 시험에서는 렌더링 없이 훅을 바로 부릅니다.
const runHook = useEditMode;

/** 훅을 한 번 실행하고 지연 포커스까지 기다린 뒤 포커스 횟수를 돌려줍니다. */
function renderAndFlush(selected: Student | undefined) {
  runHook(selected);
  vi.advanceTimersByTime(50);
  return harness.focus.mock.calls.length;
}

beforeEach(() => {
  vi.useFakeTimers();
  harness.reset();
  harness.isEditMode = true;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useEditMode 포커스", () => {
  it("편집 모드가 켜지면 첫 입력칸에 포커스를 준다", () => {
    expect(renderAndFlush(student("2-1-1"))).toBe(1);
  });

  it("편집 모드가 꺼져 있으면 포커스를 주지 않는다", () => {
    harness.isEditMode = false;
    expect(renderAndFlush(student("2-1-1"))).toBe(0);
  });

  it("평가가 없는 학생이면 포커스를 주지 않는다", () => {
    expect(renderAndFlush({ ...student("2-1-1"), evaluations: [] })).toBe(0);
  });

  it("다른 학생으로 옮기면 다시 첫 입력칸에 포커스를 준다", () => {
    renderAndFlush(student("2-1-1"));
    expect(renderAndFlush(student("2-1-2"))).toBe(2);
  });

  it("[C-01] 점수를 고쳐 학생 객체가 새로 만들어져도 포커스를 옮기지 않는다", () => {
    const before = student("2-1-1");
    renderAndFlush(before);
    const typed = {
      ...before,
      evaluations: [{ area: "영역1", score: 1, maxScore: 10 }],
    };
    expect(renderAndFlush(typed)).toBe(1);
  });
});
