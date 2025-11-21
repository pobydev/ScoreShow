/**
 * Zustand 상태 관리 스토어
 */

import { create } from "zustand";
import type { Student, AppState, ColumnMapping, Evaluation } from "../types";
import { loadStudents, saveStudents, clearStorage } from "../core/storage";

interface AppStore extends AppState {
  // Actions
  setStudents: (students: Student[]) => Promise<void>;
  setSelectedStudent: (id: string | null) => void;
  setPresenterMode: (enabled: boolean) => void;
  setBlackout: (enabled: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setMapping: (mapping: ColumnMapping | null) => void;
  setEditMode: (enabled: boolean) => void;
  updateEvaluation: (
    studentId: string,
    evaluationIndex: number,
    updates: Partial<Evaluation>
  ) => Promise<void>;

  // Navigation
  nextStudent: () => void;
  prevStudent: () => void;

  // Storage
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

export const useStore = create<AppStore>((set, get) => ({
  // Initial state
  students: [],
  selectedStudentId: null,
  isPresenterMode: false,
  isBlackout: false,
  isLoading: false,
  error: null,
  mapping: null,
  isEditMode: false,

  // Actions
  setStudents: async (students) => {
    set({ students });
    // 진짜 학생이 존재하고 id가 명확해야만 자동 선택
    if (students.length > 0 && students[0].id && students[0].id !== "") {
      set({ selectedStudentId: students[0].id });
    }
    // IndexedDB에 자동 저장
    await saveStudents(students);
  },

  setSelectedStudent: (id) => set({ selectedStudentId: id }),

  setPresenterMode: (enabled) => {
    const { students } = get();
    if (enabled) {
      // 발표 모드 시작 시 첫 번째 학생을 자동 선택하여 바로 보이게 함
      if (students.length > 0 && students[0].id) {
        set({
          isPresenterMode: true,
          isBlackout: false,
          selectedStudentId: students[0].id,
        });
      } else {
        set({
          isPresenterMode: true,
          isBlackout: false,
          selectedStudentId: null,
        });
      }
    } else {
      set({ isPresenterMode: false, isBlackout: false });
    }
  },

  setBlackout: (enabled) => set({ isBlackout: enabled }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => {
    set({ error });
    // 에러가 설정되면 5초 후 자동으로 해제
    if (error) {
      setTimeout(() => {
        const currentError = get().error;
        if (currentError === error) {
          set({ error: null });
        }
      }, 5000);
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

        return {
          ...evaluation,
          ...updates,
          score: sanitizedScore,
          maxScore:
            typeof nextMaxScore === "number" && nextMaxScore > 0
              ? nextMaxScore
              : evaluation.maxScore,
        };
      });

      return { ...student, evaluations };
    });

    set({ students });
    await saveStudents(students);
  },

  // Navigation
  nextStudent: () => {
    const { students, selectedStudentId } = get();
    if (students.length === 0) return;

    // 화이트아웃 상태(selectedStudentId가 null)에서 시작하는 경우 첫 번째 학생으로 이동
    if (!selectedStudentId) {
      if (students.length > 0 && students[0].id) {
        set({ selectedStudentId: students[0].id });
      }
      return;
    }

    const currentIndex = students.findIndex((s) => s.id === selectedStudentId);
    // 마지막 학생에서는 순환하지 않음 (다음 학생이 없으면 현재 학생 유지)
    if (currentIndex >= students.length - 1) {
      return; // 마지막 학생이면 이동하지 않음
    }
    const nextIndex = currentIndex + 1;

    set({ selectedStudentId: students[nextIndex].id });
  },

  prevStudent: () => {
    const { students, selectedStudentId } = get();
    if (students.length === 0) return;

    // 화이트아웃 상태(selectedStudentId가 null)에서 시작하는 경우 마지막 학생으로 이동
    if (!selectedStudentId) {
      if (students.length > 0) {
        const lastStudent = students[students.length - 1];
        if (lastStudent.id) {
          set({ selectedStudentId: lastStudent.id });
        }
      }
      return;
    }

    const currentIndex = students.findIndex((s) => s.id === selectedStudentId);
    // 첫 번째 학생에서는 순환하지 않음 (이전 학생이 없으면 현재 학생 유지)
    if (currentIndex <= 0) {
      return; // 첫 번째 학생이면 이동하지 않음
    }
    const prevIndex = currentIndex - 1;

    set({ selectedStudentId: students[prevIndex].id });
  },

  // Storage
  loadFromStorage: async () => {
    const students = await loadStudents();
    if (students) {
      set({ students });
      if (students.length > 0) {
        set({ selectedStudentId: students[0].id });
      }
    }
  },

  saveToStorage: async () => {
    const { students } = get();
    await saveStudents(students);
  },

  clearAllData: async () => {
    await clearStorage();
    set({
      students: [],
      selectedStudentId: null,
      mapping: null,
      error: null,
    });
  },
}));
