/**
 * 여러 파일을 한꺼번에 넣을 때의 이름과 줄 상태
 * 이름은 미리 채우되, 저장 전에 한 번 보여 주고 고칠 수 있게 합니다.
 */

import type { StoredList, Student } from "../types";
import { diffStudents, differenceText, findListByName, isSameContent, normalizeListName } from "./lists";

/** 추천 이름을 만들지 못한 파일은 확장자를 뺀 파일 이름을 씁니다. */
export function fileStem(fileName: string): string {
  return normalizeListName(fileName.replace(/\.[^.]+$/, ""));
}

/** 한 번에 넣은 파일끼리 이름이 겹치면 뒤의 것에 " (2)", " (3)"을 붙입니다. */
export function distinctNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    const base = normalizeListName(name);
    let next = base;
    for (let count = 2; used.has(next); count++) next = `${base} (${count})`;
    used.add(next);
    return next;
  });
}

export type RowState =
  | { kind: "empty" }
  | { kind: "duplicate" }
  | { kind: "same" }
  | { kind: "conflict"; summary: string }
  | { kind: "new" };

/** 줄마다 저장하면 어떻게 되는지 봅니다. 위쪽 줄과 이름이 같으면 아래 줄이 막힙니다. */
export function rowStates(rows: { name: string; students: Student[] }[], lists: StoredList[]): RowState[] {
  const seen = new Set<string>();
  return rows.map(({ name, students }) => {
    const normalized = normalizeListName(name);
    if (!normalized) return { kind: "empty" };
    if (seen.has(normalized)) return { kind: "duplicate" };
    seen.add(normalized);
    const existing = findListByName(lists, normalized);
    if (!existing) return { kind: "new" };
    const difference = diffStudents(existing.students, students);
    return isSameContent(difference)
      ? { kind: "same" }
      : { kind: "conflict", summary: differenceText(difference) };
  });
}

/** 같은 이름의 목록이 있으면 덮어쓰기는 교사가 고를 때만 합니다. */
export function savesByDefault(state: RowState) {
  return state.kind === "new" || state.kind === "empty" || state.kind === "duplicate";
}

export function canSave(state: RowState) {
  return state.kind === "new" || state.kind === "conflict";
}
