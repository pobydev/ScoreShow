/**
 * Zustand 상태 관리 스토어
 */

import { create } from "zustand";
import type { Student, AppState, ColumnMapping, Evaluation, SavedList } from "../types";
import { clearStorage, loadLists, putList, removeLists } from "../core/storage-secure";
import { changeEvaluation, findListByName, isReadable, normalizeListName } from "../core/lists";
import { waitNeighbors } from "../core/waitFlow";

interface AppStore extends AppState {
  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null, durationMs?: number) => void;
  setMapping: (mapping: ColumnMapping | null) => void;
  setEditMode: (enabled: boolean) => void;
  updateEvaluation: (
    studentId: string,
    evaluationIndex: number,
    updates: Partial<Evaluation>
  ) => Promise<void>;
  renameArea: (area: string, nextArea: string) => Promise<void>;
  setAreaMaxScore: (area: string, maxScore: number) => Promise<void>;
  restoreAreaMaxScore: (area: string) => Promise<void>;

  // 학생 보여 주기
  showStudent: (id: string) => void;
  /** 지금 학생과 다음 학생 사이의 대기 화면으로 갑니다. 이미 대기 화면이면 자리를 옮기지 않습니다. */
  waitAfterCurrent: () => void;
  /** 앞 학생과 지금 학생 사이의 대기 화면으로 갑니다. */
  waitBeforeCurrent: () => void;
  showAbove: () => void;
  showBelow: () => void;

  // Lists
  loadFromStorage: () => Promise<void>;
  saveList: (name: string, students: Student[]) => Promise<void>;
  openList: (id: string) => void;
  closeList: () => void;
  deleteLists: (ids: string[]) => Promise<void>;
  clearAllData: () => Promise<void>;
}

const CLOSED_LIST = {
  activeListId: null,
  students: [],
  selectedStudentId: null,
  isBlackout: false,
  waitGap: -1,
  isEditMode: false,
};

export const useStore = create<AppStore>((set, get) => {
  /** 지금 연 목록의 학생을 바꾸고 저장합니다. 저장일은 그대로 둡니다. */
  const commitStudents = async (students: Student[]) => {
    const { lists, activeListId } = get();
    const active = lists.filter(isReadable).find((list) => list.id === activeListId);
    if (!active) {
      set({ students });
      return;
    }
    const next: SavedList = { ...active, students };
    set({
      students,
      lists: lists.map((list) => (list.id === active.id ? next : list)),
    });
    await putList(next);
  };

  const currentIndex = () => {
    const { students, selectedStudentId } = get();
    return students.findIndex((student) => student.id === selectedStudentId);
  };

  return {
    // Initial state
    lists: [],
    ...CLOSED_LIST,
    isLoading: false,
    error: null,
    mapping: null,

    // Actions
    setLoading: (loading) => set({ isLoading: loading }),

    setError: (error, durationMs = 5000) => {
      set({ error });
      // 에러가 설정되면 정해진 시간(기본 5초) 후 자동으로 해제
      if (error) {
        setTimeout(() => {
          const currentError = get().error;
          if (currentError === error) {
            set({ error: null });
          }
        }, durationMs);
      }
    },

    setMapping: (mapping) => set({ mapping }),
    setEditMode: (enabled) => set({ isEditMode: enabled }),
    updateEvaluation: async (studentId, evaluationIndex, updates) => {
      const students = get().students.map((student) => {
        if (student.id !== studentId) {
          return student;
        }

        const evaluations = student.evaluations.map((evaluation, index) => {
          if (index !== evaluationIndex) {
            return evaluation;
          }
          const nextScore =
            updates.score === undefined ? evaluation.score : updates.score;
          const sanitizedScore =
            typeof nextScore === "number" && isNaN(nextScore) ? null : nextScore;
          const nextMaxScore =
            updates.maxScore === undefined ? evaluation.maxScore : updates.maxScore;

          return changeEvaluation(evaluation, {
            ...updates,
            score: sanitizedScore,
            maxScore:
              typeof nextMaxScore === "number" && nextMaxScore > 0
                ? nextMaxScore
                : evaluation.maxScore,
          });
        });

        return { ...student, evaluations };
      });

      await commitStudents(students);
    },

    renameArea: async (area, nextArea) => {
      await commitStudents(
        get().students.map((student) => ({
          ...student,
          evaluations: student.evaluations.map((evaluation) =>
            evaluation.area === area ? { ...evaluation, area: nextArea } : evaluation
          ),
        }))
      );
    },

    setAreaMaxScore: async (area, maxScore) => {
      if (!(maxScore > 0)) return;
      await commitStudents(
        get().students.map((student) => ({
          ...student,
          evaluations: student.evaluations.map((evaluation) =>
            evaluation.area === area
              ? changeEvaluation(evaluation, { score: evaluation.score, maxScore })
              : evaluation
          ),
        }))
      );
    },

    restoreAreaMaxScore: async (area) => {
      await commitStudents(
        get().students.map((student) => ({
          ...student,
          evaluations: student.evaluations.map((evaluation) =>
            evaluation.area === area && evaluation.originalMaxScore !== undefined
              ? changeEvaluation(evaluation, {
                  score: evaluation.score,
                  maxScore: evaluation.originalMaxScore,
                })
              : evaluation
          ),
        }))
      );
    },

    // 학생 보여 주기
    showStudent: (id) => {
      set({ selectedStudentId: id, isBlackout: false, isEditMode: false });
    },

    waitAfterCurrent: () => {
      if (get().isBlackout) {
        set({ isEditMode: false });
        return;
      }
      set({ isBlackout: true, isEditMode: false, waitGap: currentIndex() });
    },

    waitBeforeCurrent: () => {
      set({ isBlackout: true, isEditMode: false, waitGap: currentIndex() - 1 });
    },

    showAbove: () => {
      const { above } = waitNeighbors(get().students, get().waitGap);
      if (above) get().showStudent(above.id);
    },

    showBelow: () => {
      const { below } = waitNeighbors(get().students, get().waitGap);
      if (below) get().showStudent(below.id);
    },

    // Lists
    loadFromStorage: async () => {
      set({ lists: await loadLists() });
    },

    /** 같은 이름의 목록이 있으면 덮어씁니다. 덮어쓸지 묻는 것은 저장 창의 일입니다. */
    saveList: async (name, students) => {
      const existing = findListByName(get().lists, name);
      const saved = await putList({
        id: existing?.id,
        name: normalizeListName(name),
        savedAt: Date.now(),
        students,
      });
      const { lists } = get();
      set({
        lists: existing
          ? lists.map((list) => (list.id === saved.id ? saved : list))
          : [...lists, saved],
      });
      get().openList(saved.id);
    },

    // 열었을 때 점수가 바로 보이지 않도록 첫 학생 위의 대기 화면으로 시작합니다.
    openList: (id) => {
      const list = get().lists.filter(isReadable).find((item) => item.id === id);
      if (!list) return;
      set({
        ...CLOSED_LIST,
        activeListId: id,
        students: list.students,
        isBlackout: true,
      });
    },

    closeList: () => {
      set(CLOSED_LIST);
    },

    deleteLists: async (ids) => {
      await removeLists(ids);
      set({ lists: get().lists.filter((list) => !ids.includes(list.id)) });
      const { activeListId, closeList } = get();
      if (activeListId && ids.includes(activeListId)) {
        closeList();
      }
    },

    clearAllData: async () => {
      await clearStorage();
      set({ lists: [], mapping: null, error: null });
      get().closeList();
    },
  };
});
