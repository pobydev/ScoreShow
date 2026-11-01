/**
 * 프로젝트 전역 타입 정의
 */

export interface Student {
  id: string; // 고유 ID (학년-반-번호)
  grade: number;
  class: number;
  number: number;
  name: string;
  evaluations: Evaluation[];
}

export interface Evaluation {
  area: string; // 평가 영역명
  score: number | null; // 획득 점수 (null = 미입력)
  maxScore: number; // 만점
}

export interface ColumnMapping {
  grade?: number;
  class?: number;
  number?: number;
  name?: number;
  area?: number;
  score?: number;
  maxScore?: number;
}

export interface ParsedRow {
  grade?: string;
  class?: string;
  number?: string;
  name?: string;
  area?: string;
  score?: string;
  maxScore?: string;
}

/** 교사가 이름을 정해 저장한 학생과 점수 묶음 */
export interface SavedList {
  id: string;
  name: string;
  savedAt: number;
  students: Student[];
}

/** 복호화하지 못한 목록. 지울 수만 있습니다. */
export interface UnreadableList {
  id: string;
  unreadable: true;
}

export type StoredList = SavedList | UnreadableList;

export interface AppState {
  lists: StoredList[];
  activeListId: string | null;
  students: Student[];
  /** 지금 점수를 보여 주는 학생. 대기 화면에서는 마지막으로 본 학생입니다. */
  selectedStudentId: string | null;
  /** 대기 화면. 점수를 가리고 다음 학생을 기다립니다. */
  isBlackout: boolean;
  /** 대기 화면 막대 바로 위 학생의 순번. 첫 학생 위는 -1입니다. */
  waitGap: number;
  isLoading: boolean;
  error: string | null;
  mapping: ColumnMapping | null;
  isEditMode: boolean;
}


