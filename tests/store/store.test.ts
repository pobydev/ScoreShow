import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearStorage, loadStudents, saveStudents } from "../../src/core/storage-secure";
import { useStore } from "../../src/store/store";
import type { Student } from "../../src/types";

vi.mock("../../src/core/storage-secure", () => ({
  loadStudents: vi.fn(),
  saveStudents: vi.fn(async () => undefined),
  clearStorage: vi.fn(async () => undefined),
}));

function student(number: number): Student {
  return {
    id: `2-1-${number}`,
    grade: 2,
    class: 1,
    number,
    name: `가상학생${number}`,
    evaluations: [
      { area: "듣기", score: 8, maxScore: 10 },
      { area: "말하기", score: 7, maxScore: 20 },
    ],
  };
}

const THREE = [student(1), student(2), student(3)];
const store = () => useStore.getState();
const evaluationAt = (index: number) => store().students[0].evaluations[index];

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  vi.clearAllMocks();
});

describe("setStudents", () => {
  it("학생을 넣고 첫 학생을 고르고 저장한다", async () => {
    await store().setStudents(THREE);
    expect(store().students).toBe(THREE);
    expect(store().selectedStudentId).toBe("2-1-1");
    expect(saveStudents).toHaveBeenCalledWith(THREE);
  });

  it("이미 고른 학생이 있어도 첫 학생으로 되돌린다", async () => {
    await store().setStudents(THREE);
    store().setSelectedStudent("2-1-3");
    await store().setStudents(THREE);
    expect(store().selectedStudentId).toBe("2-1-1");
  });

  it("첫 학생 id가 비었으면 고르지 않는다", async () => {
    await store().setStudents([{ ...student(1), id: "" }]);
    expect(store().selectedStudentId).toBeNull();
  });

  it("[Q-17] 빈 목록을 넣어도 기존 학생과 선택과 저장 데이터를 그대로 둔다", async () => {
    await store().setStudents(THREE);
    vi.mocked(saveStudents).mockClear();
    await store().setStudents([]);
    expect(store().students).toBe(THREE);
    expect(store().selectedStudentId).toBe("2-1-1");
    expect(saveStudents).not.toHaveBeenCalled();
  });

  it("저장이 실패하면 거부되지만 메모리 상태는 바뀐 채로 남는다", async () => {
    vi.mocked(saveStudents).mockRejectedValueOnce(new Error("저장 실패"));
    await expect(store().setStudents(THREE)).rejects.toThrow("저장 실패");
    expect(store().students).toBe(THREE);
  });
});

describe("학생 이동", () => {
  beforeEach(async () => {
    await store().setStudents(THREE);
  });

  it("nextStudent는 다음 학생으로 가고 마지막에서 멈춘다", () => {
    store().nextStudent();
    expect(store().selectedStudentId).toBe("2-1-2");
    store().nextStudent();
    store().nextStudent();
    expect(store().selectedStudentId).toBe("2-1-3");
  });

  it("prevStudent는 이전 학생으로 가고 처음에서 멈춘다", () => {
    store().setSelectedStudent("2-1-3");
    store().prevStudent();
    expect(store().selectedStudentId).toBe("2-1-2");
    store().prevStudent();
    store().prevStudent();
    expect(store().selectedStudentId).toBe("2-1-1");
  });

  it("선택이 없으면 next는 처음, prev는 마지막으로 간다", () => {
    store().setSelectedStudent(null);
    store().nextStudent();
    expect(store().selectedStudentId).toBe("2-1-1");
    store().setSelectedStudent(null);
    store().prevStudent();
    expect(store().selectedStudentId).toBe("2-1-3");
  });

  it("학생이 없으면 움직이지 않는다", () => {
    useStore.setState({ students: [], selectedStudentId: null });
    store().nextStudent();
    store().prevStudent();
    expect(store().selectedStudentId).toBeNull();
  });

  it("[Q-30] 없는 학생이 선택돼 있으면 next는 처음으로 가고 prev는 그대로다", () => {
    store().setSelectedStudent("없음");
    store().prevStudent();
    expect(store().selectedStudentId).toBe("없음");
    store().nextStudent();
    expect(store().selectedStudentId).toBe("2-1-1");
  });
});

describe("발표 모드와 화면 상태", () => {
  it("켜면 첫 학생을 고르고 가림을 푼다", async () => {
    await store().setStudents(THREE);
    store().setSelectedStudent("2-1-3");
    store().setBlackout(true);
    store().setPresenterMode(true);
    expect(store()).toMatchObject({
      isPresenterMode: true,
      isBlackout: false,
      selectedStudentId: "2-1-1",
    });
  });

  it("학생이 없으면 선택 없이 켠다", () => {
    store().setSelectedStudent("없음");
    store().setPresenterMode(true);
    expect(store()).toMatchObject({ isPresenterMode: true, selectedStudentId: null });
  });

  it("끄면 가림을 풀고 선택은 유지한다", async () => {
    await store().setStudents(THREE);
    store().setPresenterMode(true);
    store().nextStudent();
    store().setBlackout(true);
    store().setPresenterMode(false);
    expect(store()).toMatchObject({
      isPresenterMode: false,
      isBlackout: false,
      selectedStudentId: "2-1-2",
    });
  });

  it("단순 설정 함수는 값만 바꾼다", () => {
    store().setLoading(true);
    store().setEditMode(true);
    store().setMapping({ name: 1 });
    expect(store()).toMatchObject({ isLoading: true, isEditMode: true, mapping: { name: 1 } });
  });
});

describe("setError", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("5초 뒤 저절로 지운다", () => {
    store().setError("오류");
    vi.advanceTimersByTime(4999);
    expect(store().error).toBe("오류");
    vi.advanceTimersByTime(1);
    expect(store().error).toBeNull();
  });

  it("그 사이 다른 오류로 바뀌었으면 앞 타이머가 지우지 않는다", () => {
    store().setError("앞 오류");
    vi.advanceTimersByTime(3000);
    store().setError("뒤 오류");
    vi.advanceTimersByTime(2000);
    expect(store().error).toBe("뒤 오류");
    vi.advanceTimersByTime(3000);
    expect(store().error).toBeNull();
  });

  it("[Q-30] 같은 오류를 다시 설정해도 앞 타이머가 먼저 지운다", () => {
    store().setError("오류");
    vi.advanceTimersByTime(4000);
    store().setError("오류");
    vi.advanceTimersByTime(1000);
    expect(store().error).toBeNull();
  });
});

describe("updateEvaluation", () => {
  beforeEach(async () => {
    await store().setStudents(THREE);
    vi.clearAllMocks();
  });

  it("해당 학생의 해당 평가만 바꾸고 저장한다", async () => {
    await store().updateEvaluation("2-1-1", 1, { score: 5 });
    expect(evaluationAt(1)).toEqual({ area: "말하기", score: 5, maxScore: 20 });
    expect(evaluationAt(0)).toEqual({ area: "듣기", score: 8, maxScore: 10 });
    expect(store().students[1]).toBe(THREE[1]);
    expect(saveStudents).toHaveBeenCalledWith(store().students);
  });

  it("score를 null로 지울 수 있고 NaN도 null이 된다", async () => {
    await store().updateEvaluation("2-1-1", 0, { score: null });
    expect(evaluationAt(0).score).toBeNull();
    await store().updateEvaluation("2-1-1", 0, { score: 3 });
    await store().updateEvaluation("2-1-1", 0, { score: NaN });
    expect(evaluationAt(0).score).toBeNull();
  });

  it("score를 주지 않으면 그대로 둔다", async () => {
    await store().updateEvaluation("2-1-1", 0, { maxScore: 15 });
    expect(evaluationAt(0)).toEqual({ area: "듣기", score: 8, maxScore: 15 });
  });

  it("만점이 0 이하이거나 NaN이면 이전 값을 유지한다", async () => {
    for (const maxScore of [0, -5, NaN]) {
      await store().updateEvaluation("2-1-1", 0, { maxScore });
      expect(evaluationAt(0).maxScore).toBe(10);
    }
  });

  it("영역 이름도 바꿀 수 있다", async () => {
    await store().updateEvaluation("2-1-1", 0, { area: "읽기" });
    expect(evaluationAt(0).area).toBe("읽기");
  });

  it("[Q-30] 음수, 만점 초과, 무한대 점수를 그대로 받는다", async () => {
    for (const score of [-1, 99, Infinity]) {
      await store().updateEvaluation("2-1-1", 0, { score });
      expect(evaluationAt(0).score).toBe(score);
    }
  });

  it("[Q-30] 없는 학생이나 평가를 지정해도 조용히 저장만 한다", async () => {
    await store().updateEvaluation("없음", 0, { score: 1 });
    await store().updateEvaluation("2-1-1", 9, { score: 1 });
    expect(evaluationAt(0).score).toBe(8);
    expect(saveStudents).toHaveBeenCalledTimes(2);
  });
});

describe("저장소 연동", () => {
  it("loadFromStorage는 불러온 학생과 첫 선택을 넣는다", async () => {
    vi.mocked(loadStudents).mockResolvedValueOnce(THREE);
    await store().loadFromStorage();
    expect(store()).toMatchObject({ students: THREE, selectedStudentId: "2-1-1" });
  });

  it("loadFromStorage는 null이면 상태를 건드리지 않는다", async () => {
    await store().setStudents(THREE);
    vi.mocked(loadStudents).mockResolvedValueOnce(null);
    await store().loadFromStorage();
    expect(store().students).toBe(THREE);
  });

  it("[Q-30] loadFromStorage가 빈 목록을 받으면 이전 선택이 남는다", async () => {
    await store().setStudents(THREE);
    vi.mocked(loadStudents).mockResolvedValueOnce([]);
    await store().loadFromStorage();
    expect(store()).toMatchObject({ students: [], selectedStudentId: "2-1-1" });
  });

  it("saveToStorage는 현재 학생을 저장한다", async () => {
    await store().setStudents(THREE);
    vi.clearAllMocks();
    await store().saveToStorage();
    expect(saveStudents).toHaveBeenCalledWith(THREE);
  });

  it("clearAllData는 저장소와 학생, 선택, 매핑, 오류를 지운다", async () => {
    await store().setStudents(THREE);
    store().setMapping({ name: 1 });
    useStore.setState({ error: "오류" });
    await store().clearAllData();
    expect(clearStorage).toHaveBeenCalledTimes(1);
    expect(store()).toMatchObject({
      students: [],
      selectedStudentId: null,
      mapping: null,
      error: null,
    });
  });

  it("[Q-30] clearAllData는 발표, 가림, 편집 상태를 그대로 둔다", async () => {
    store().setPresenterMode(true);
    store().setBlackout(true);
    store().setEditMode(true);
    await store().clearAllData();
    expect(store()).toMatchObject({
      isPresenterMode: true,
      isBlackout: true,
      isEditMode: true,
    });
  });

  it("clearAllData는 저장소 삭제가 실패하면 메모리를 지우지 않는다", async () => {
    await store().setStudents(THREE);
    vi.mocked(clearStorage).mockRejectedValueOnce(new Error("삭제 실패"));
    await expect(store().clearAllData()).rejects.toThrow("삭제 실패");
    expect(store().students).toBe(THREE);
  });
});
