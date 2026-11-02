import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearStorage, loadLists, putList, removeLists } from "../../src/core/storage-secure";
import { waitNeighbors } from "../../src/core/waitFlow";
import { useStore } from "../../src/store/store";
import type { SavedList, Student } from "../../src/types";

vi.mock("../../src/core/storage-secure", () => ({
  loadLists: vi.fn(async () => []),
  putList: vi.fn(async (list: Omit<SavedList, "id"> & { id?: string }) => ({
    ...list,
    id: list.id ?? "새 목록",
  })),
  removeLists: vi.fn(async () => undefined),
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

async function openThree() {
  await store().saveList("우리 반", THREE);
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  vi.clearAllMocks();
});

describe("saveList", () => {
  it("저장하고 대기 화면으로 연다", async () => {
    await openThree();
    expect(store()).toMatchObject({
      activeListId: "새 목록",
      students: THREE,
      selectedStudentId: null,
      isBlackout: true,
    });
    expect(putList).toHaveBeenCalledWith(
      expect.objectContaining({ name: "우리 반", students: THREE })
    );
  });

  it("이름의 공백을 정리해 저장한다", async () => {
    await store().saveList("  우리   반 ", THREE);
    expect(putList).toHaveBeenCalledWith(expect.objectContaining({ name: "우리 반" }));
  });

  it("같은 이름이면 같은 목록을 덮어쓰고 저장일을 새로 적는다", async () => {
    useStore.setState({ lists: [{ id: "a", name: "우리 반", savedAt: 1, students: [student(1)] }] });
    await store().saveList("우리  반", THREE);
    expect(store().lists).toHaveLength(1);
    expect(store().lists[0]).toMatchObject({ id: "a", students: THREE });
    expect((store().lists[0] as SavedList).savedAt).toBeGreaterThan(1);
  });

  it("저장이 실패하면 거부되고 목록을 열지 않는다", async () => {
    vi.mocked(putList).mockRejectedValueOnce(new Error("저장 실패"));
    await expect(store().saveList("우리 반", THREE)).rejects.toThrow("저장 실패");
    expect(store()).toMatchObject({ activeListId: null, students: [], lists: [] });
  });
});

describe("openList와 closeList", () => {
  beforeEach(() => {
    useStore.setState({
      lists: [
        { id: "a", name: "가", savedAt: 1, students: THREE },
        { id: "b", unreadable: true },
      ],
    });
  });

  it("열면 고른 학생 없이 대기 화면이고 수정이 닫힌다", () => {
    useStore.setState({ selectedStudentId: "2-1-2", isEditMode: true, isBlackout: false });
    store().openList("a");
    expect(store()).toMatchObject({
      activeListId: "a",
      students: THREE,
      selectedStudentId: null,
      isBlackout: true,
      isEditMode: false,
    });
  });

  it("읽을 수 없는 목록이나 없는 목록은 열지 않는다", () => {
    store().openList("b");
    store().openList("없음");
    expect(store().activeListId).toBeNull();
  });

  it("닫으면 메모리의 학생을 비운다", () => {
    store().openList("a");
    store().closeList();
    expect(store()).toMatchObject({ activeListId: null, students: [], selectedStudentId: null });
  });
});

describe("setError 표시 시간", () => {
  it("[Q-25] 표시 시간을 주면 그동안 메시지를 지우지 않는다", () => {
    vi.useFakeTimers();
    try {
      store().setError("확인 필요", 15000);
      vi.advanceTimersByTime(14999);
      expect(store().error).toBe("확인 필요");
      vi.advanceTimersByTime(1);
      expect(store().error).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("대기 화면과 학생 보여 주기", () => {
  beforeEach(async () => {
    await openThree();
  });

  const neighbors = () => {
    const { above, below } = waitNeighbors(store().students, store().waitGap);
    return [above?.number ?? null, below?.number ?? null];
  };

  it("열면 첫 학생 위에서 기다린다", () => {
    expect(store()).toMatchObject({ isBlackout: true, waitGap: -1, selectedStudentId: null });
    expect(neighbors()).toEqual([null, 1]);
  });

  it("아래 학생을 보여 주고, 앞으로 가면 그 아래 사이로 간다", () => {
    store().showBelow();
    expect(store()).toMatchObject({ isBlackout: false, selectedStudentId: "2-1-1" });
    store().waitAfterCurrent();
    expect(neighbors()).toEqual([1, 2]);
  });

  it("뒤로 가면 그 위 사이로 가고 양옆을 볼 수 있다", () => {
    store().showStudent("2-1-3");
    store().waitBeforeCurrent();
    expect(neighbors()).toEqual([2, 3]);
    store().showAbove();
    expect(store().selectedStudentId).toBe("2-1-2");
    store().waitAfterCurrent();
    store().showBelow();
    expect(store().selectedStudentId).toBe("2-1-3");
  });

  it("양 끝에서는 없는 쪽을 보여 주지 않는다", () => {
    store().showAbove();
    expect(store().isBlackout).toBe(true);
    store().showStudent("2-1-3");
    store().waitAfterCurrent();
    expect(neighbors()).toEqual([3, null]);
    store().showBelow();
    expect(store().isBlackout).toBe(true);
  });

  it("이미 대기 화면이면 다시 눌러도 자리를 옮기지 않는다", () => {
    store().showStudent("2-1-2");
    store().waitBeforeCurrent();
    store().waitAfterCurrent();
    expect(neighbors()).toEqual([1, 2]);
  });

  it("대기 화면으로 가면 표를 닫는다", () => {
    store().showStudent("2-1-2");
    store().setEditMode(true);
    store().waitAfterCurrent();
    expect(store().isEditMode).toBe(false);
    store().setEditMode(true);
    store().waitAfterCurrent();
    expect(store().isEditMode).toBe(false);
  });

  it("학생을 보여 줘도 저장하지 않는다", () => {
    vi.clearAllMocks();
    store().showStudent("2-1-1");
    expect(putList).not.toHaveBeenCalled();
  });
});

describe("화면 상태", () => {
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
    await openThree();
    vi.clearAllMocks();
  });

  it("해당 학생의 해당 평가만 바꾸고 그 목록을 저장한다", async () => {
    await store().updateEvaluation("2-1-1", 1, { score: 5 });
    expect(evaluationAt(1)).toMatchObject({ area: "말하기", score: 5, maxScore: 20 });
    expect(evaluationAt(0)).toEqual({ area: "듣기", score: 8, maxScore: 10 });
    expect(store().students[1]).toBe(THREE[1]);
    expect(putList).toHaveBeenCalledWith(
      expect.objectContaining({ id: "새 목록", students: store().students })
    );
    expect(store().lists[0]).toMatchObject({ students: store().students });
  });

  it("저장일은 바꾸지 않는다", async () => {
    const { savedAt } = store().lists[0] as SavedList;
    await store().updateEvaluation("2-1-1", 1, { score: 5 });
    expect((store().lists[0] as SavedList).savedAt).toBe(savedAt);
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
    expect(evaluationAt(0)).toMatchObject({ area: "듣기", score: 8, maxScore: 15 });
  });

  it("처음 고칠 때 원래 점수를 적고, 다시 고쳐도 그대로 두며, 돌아오면 지운다", async () => {
    await store().updateEvaluation("2-1-1", 0, { score: 5 });
    expect(evaluationAt(0).originalScore).toBe(8);
    await store().updateEvaluation("2-1-1", 0, { score: 4 });
    expect(evaluationAt(0).originalScore).toBe(8);
    await store().updateEvaluation("2-1-1", 0, { score: 8 });
    expect(evaluationAt(0)).toEqual({ area: "듣기", score: 8, maxScore: 10 });
  });

  it("같은 값으로 쓰면 표시하지 않는다", async () => {
    await store().updateEvaluation("2-1-1", 0, { score: 8 });
    expect(evaluationAt(0)).toEqual({ area: "듣기", score: 8, maxScore: 10 });
  });

  it("미입력이었던 점수를 고치면 원래 값으로 미입력을 적는다", async () => {
    await store().updateEvaluation("2-1-1", 0, { score: null });
    expect(evaluationAt(0).originalScore).toBe(8);
    await store().updateEvaluation("2-1-1", 0, { score: 8 });
    expect(evaluationAt(0).originalScore).toBeUndefined();
  });

  it("만점이 0 이하이거나 NaN이면 이전 값을 유지한다", async () => {
    for (const maxScore of [0, -5, NaN]) {
      await store().updateEvaluation("2-1-1", 0, { maxScore });
      expect(evaluationAt(0).maxScore).toBe(10);
    }
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
    expect(putList).toHaveBeenCalledTimes(2);
  });
});

describe("영역 전체 바꾸기", () => {
  beforeEach(async () => {
    await openThree();
    vi.clearAllMocks();
  });

  it("renameArea는 모든 학생의 그 영역 이름을 바꾼다", async () => {
    await store().renameArea("듣기", "읽기");
    expect(store().students.every((s) => s.evaluations[0].area === "읽기")).toBe(true);
    expect(store().students[0].evaluations[1].area).toBe("말하기");
    expect(putList).toHaveBeenCalledTimes(1);
  });

  it("setAreaMaxScore는 모든 학생의 그 영역 만점을 바꾸고 점수는 둔다", async () => {
    await store().setAreaMaxScore("듣기", 15);
    expect(store().students.every((s) => s.evaluations[0].maxScore === 15)).toBe(true);
    expect(evaluationAt(0).score).toBe(8);
    expect(evaluationAt(1).maxScore).toBe(20);
  });

  it("setAreaMaxScore는 원래 만점을 적고 restoreAreaMaxScore는 되돌린다", async () => {
    await store().setAreaMaxScore("듣기", 15);
    expect(store().students[0].evaluations.find((e) => e.area === "듣기")?.originalMaxScore).toBe(10);
    await store().setAreaMaxScore("듣기", 18);
    expect(store().students[0].evaluations.find((e) => e.area === "듣기")?.originalMaxScore).toBe(10);
    await store().restoreAreaMaxScore("듣기");
    const restored = store().students[0].evaluations.find((e) => e.area === "듣기");
    expect(restored?.maxScore).toBe(10);
    expect(restored?.originalMaxScore).toBeUndefined();
  });

  it("setAreaMaxScore는 0 이하를 받지 않는다", async () => {
    await store().setAreaMaxScore("듣기", 0);
    expect(evaluationAt(0).maxScore).toBe(10);
    expect(putList).not.toHaveBeenCalled();
  });
});

describe("저장소 연동", () => {
  it("loadFromStorage는 목록만 넣고 어느 것도 열지 않는다", async () => {
    const lists = [{ id: "a", name: "가", savedAt: 1, students: THREE }];
    vi.mocked(loadLists).mockResolvedValueOnce(lists);
    await store().loadFromStorage();
    expect(store()).toMatchObject({ lists, activeListId: null, students: [], selectedStudentId: null });
  });

  it("deleteLists는 그 목록만 지운다", async () => {
    await openThree();
    useStore.setState({
      lists: [...store().lists, { id: "b", name: "나", savedAt: 1, students: THREE }],
    });
    await store().deleteLists(["b"]);
    expect(removeLists).toHaveBeenCalledWith(["b"]);
    expect(store().lists).toHaveLength(1);
    expect(store().activeListId).toBe("새 목록");
  });

  it("보고 있는 목록을 지우면 닫는다", async () => {
    await openThree();
    await store().deleteLists(["새 목록"]);
    expect(store()).toMatchObject({ lists: [], activeListId: null, students: [] });
  });

  it("deleteLists는 저장소 삭제가 실패하면 메모리를 지우지 않는다", async () => {
    await openThree();
    vi.mocked(removeLists).mockRejectedValueOnce(new Error("삭제 실패"));
    await expect(store().deleteLists(["새 목록"])).rejects.toThrow("삭제 실패");
    expect(store().students).toBe(THREE);
  });

  it("clearAllData는 저장소와 목록, 학생, 선택, 매핑, 오류를 지운다", async () => {
    await openThree();
    store().setMapping({ name: 1 });
    useStore.setState({ error: "오류" });
    await store().clearAllData();
    expect(clearStorage).toHaveBeenCalledTimes(1);
    expect(store()).toMatchObject({
      lists: [],
      activeListId: null,
      students: [],
      selectedStudentId: null,
      mapping: null,
      error: null,
    });
  });

  it("clearAllData는 저장소 삭제가 실패하면 메모리를 지우지 않는다", async () => {
    await openThree();
    vi.mocked(clearStorage).mockRejectedValueOnce(new Error("삭제 실패"));
    await expect(store().clearAllData()).rejects.toThrow("삭제 실패");
    expect(store().students).toBe(THREE);
  });
});
