/**
 * 저장 목록의 계산: 이름 비교, 내용 비교, 오래된 목록, 표의 영역 칸
 */

import type { Evaluation, SavedList, StoredList, Student } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;
export const STALE_AFTER_MS = 30 * DAY_MS;
export const STALE_SNOOZE_MS = 7 * DAY_MS;

export function isReadable(list: StoredList): list is SavedList {
  return !("unreadable" in list);
}

/** 앞뒤 공백과 겹친 공백은 다른 이름으로 보지 않습니다. */
export function normalizeListName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function findListByName(lists: StoredList[], name: string): SavedList | undefined {
  const target = normalizeListName(name);
  return lists.filter(isReadable).find((list) => normalizeListName(list.name) === target);
}

export interface StudentsDifference {
  students: number;
  scores: number;
}

function sameEvaluation(a: Evaluation, b: Evaluation) {
  return a.score === b.score && a.maxScore === b.maxScore;
}

/** 같은 이름으로 저장할 때 덮어쓰면 달라지는 학생과 점수의 수를 셉니다. */
export function diffStudents(before: Student[], after: Student[]): StudentsDifference {
  const afterById = new Map(after.map((student) => [student.id, student]));
  const beforeIds = new Set(before.map((student) => student.id));
  let students = after.filter((student) => !beforeIds.has(student.id)).length;
  let scores = 0;

  for (const student of before) {
    const next = afterById.get(student.id);
    if (!next) {
      students++;
      continue;
    }
    if (next.name !== student.name) students++;

    const nextByArea = new Map(next.evaluations.map((evaluation) => [evaluation.area, evaluation]));
    const areas = new Set(student.evaluations.map((evaluation) => evaluation.area));
    scores += next.evaluations.filter((evaluation) => !areas.has(evaluation.area)).length;
    for (const evaluation of student.evaluations) {
      const nextEvaluation = nextByArea.get(evaluation.area);
      if (!nextEvaluation || !sameEvaluation(evaluation, nextEvaluation)) scores++;
    }
  }
  return { students, scores };
}

export function isSameContent(difference: StudentsDifference) {
  return difference.students === 0 && difference.scores === 0;
}

export function differenceText({ students, scores }: StudentsDifference) {
  if (scores === 0) return `학생 ${students}명이 다릅니다.`;
  if (students === 0) return `점수 ${scores}개가 다릅니다.`;
  return `학생 ${students}명, 점수 ${scores}개가 다릅니다.`;
}

/** 학생이 어느 영역에서 달라졌는지 적습니다. 잠금을 풀기 전에 보이므로 점수와 이름은 넣지 않습니다. */
export function differenceLines(before: Student[], after: Student[]): string[] {
  const hasManyClasses = new Set([...before, ...after].map((student) => student.class)).size > 1;
  const label = (student: Student) =>
    hasManyClasses ? `${student.class}반 ${student.number}번` : `${student.number}번`;
  const afterById = new Map(after.map((student) => [student.id, student]));
  const beforeIds = new Set(before.map((student) => student.id));
  const lines: string[] = [];

  for (const student of before) {
    const next = afterById.get(student.id);
    if (!next) {
      lines.push(`${label(student)}: 새 파일에 없음`);
      continue;
    }
    const parts = next.name !== student.name ? ["이름"] : [];
    const nextByArea = new Map(next.evaluations.map((evaluation) => [evaluation.area, evaluation]));
    const areas = new Set(student.evaluations.map((evaluation) => evaluation.area));
    for (const evaluation of student.evaluations) {
      const nextEvaluation = nextByArea.get(evaluation.area);
      if (!nextEvaluation || !sameEvaluation(evaluation, nextEvaluation)) parts.push(evaluation.area);
    }
    for (const { area } of next.evaluations) {
      if (!areas.has(area)) parts.push(area);
    }
    if (parts.length > 0) lines.push(`${label(student)}: ${parts.join(", ")}`);
  }
  for (const student of after) {
    if (!beforeIds.has(student.id)) lines.push(`${label(student)}: 새 파일에만 있음`);
  }
  return lines;
}

/** 저장한 날부터 셉니다. 연 날부터 세면 자주 여는 자료는 영영 안내가 나오지 않습니다. */
export function staleLists(lists: StoredList[], now: number): SavedList[] {
  return lists.filter(isReadable).filter((list) => now - list.savedAt >= STALE_AFTER_MS);
}

export function savedDateText(savedAt: number) {
  const date = new Date(savedAt);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 저장`;
}

export interface AreaColumn {
  area: string;
  maxScore: number;
  /** 만점을 고쳤으면 고치기 전의 값 */
  originalMaxScore?: number;
}

/**
 * 점수나 만점을 바꾸면서 처음 값을 기억합니다.
 * 처음 바꿀 때만 적고, 처음 값으로 돌아오면 지웁니다.
 */
export function changeEvaluation(
  evaluation: Evaluation,
  next: Partial<Evaluation> & Pick<Evaluation, "score" | "maxScore">
): Evaluation {
  const { originalScore, originalMaxScore, ...rest } = evaluation;
  const result: Evaluation = { ...rest, ...next };
  const firstScore = originalScore === undefined ? evaluation.score : originalScore;
  if (next.score !== firstScore) result.originalScore = firstScore;
  const firstMaxScore = originalMaxScore ?? evaluation.maxScore;
  if (next.maxScore !== firstMaxScore) result.originalMaxScore = firstMaxScore;
  return result;
}

export function changedScoreCount(students: Student[]): number {
  return students
    .flatMap((student) => student.evaluations)
    .filter((evaluation) => evaluation.originalScore !== undefined).length;
}

/** 전체 점수표의 영역 칸: 처음 나온 순서대로, 만점은 처음 나온 값입니다. */
export function areaColumns(students: Student[]): AreaColumn[] {
  const columns = new Map<string, AreaColumn>();
  for (const student of students) {
    for (const { area, maxScore } of student.evaluations) {
      if (!columns.has(area)) columns.set(area, { area, maxScore });
    }
  }
  for (const student of students) {
    for (const { area, originalMaxScore } of student.evaluations) {
      const column = columns.get(area);
      if (column && originalMaxScore !== undefined) column.originalMaxScore ??= originalMaxScore;
    }
  }
  return [...columns.values()];
}
