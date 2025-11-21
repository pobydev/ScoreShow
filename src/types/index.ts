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

export interface AppState {
  students: Student[];
  selectedStudentId: string | null;
  isPresenterMode: boolean;
  isBlackout: boolean;
  isLoading: boolean;
  error: string | null;
  mapping: ColumnMapping | null;
  isEditMode: boolean;
}


