/**
 * parseExcel.worker.ts를 제품 코드 수정 없이 그대로 실행합니다.
 * 워커는 불러올 때 self.onmessage를 등록하고 결과를 self.postMessage로 보내므로
 * self만 바꿔 끼우면 실제 진입점을 호출할 수 있습니다.
 */

import { expect, vi } from "vitest";
import type { ScoreIssue } from "../../src/core/normalize";
import type { ColumnMapping, Student } from "../../src/types";

export type WorkerResult =
  | {
      success: true;
      students: Student[];
      mapping: ColumnMapping | null;
      headerRows?: string[][];
      scoreIssues?: ScoreIssue[];
      areasWithoutMax?: string[];
    }
  | { success: false; error: string };

type WorkerSelf = {
  onmessage: ((e: { data: unknown }) => Promise<void>) | null;
  postMessage: (message: WorkerResult) => void;
};

const posted: WorkerResult[] = [];
const workerSelf: WorkerSelf = {
  onmessage: null,
  postMessage: (message) => {
    posted.push(message);
  },
};
vi.stubGlobal("self", workerSelf);

await import("../../src/core/parseExcel.worker");

/** 파일 바이트를 워커에 넘기고 워커가 보낸 메시지를 돌려줍니다. */
export async function runWorker(
  bytes: Uint8Array,
  mapping?: ColumnMapping
): Promise<WorkerResult> {
  // 워커의 진단 로그는 시험 출력에서 뺍니다.
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  posted.length = 0;
  try {
    await workerSelf.onmessage!({
      data: { file: new File([bytes as BlobPart], "fixture"), mapping },
    });
  } finally {
    log.mockRestore();
    warn.mockRestore();
  }
  if (posted.length !== 1) {
    throw new Error(`워커 메시지 수가 1이 아닙니다: ${posted.length}`);
  }
  return posted[0];
}

/** 학생을 하나도 찾지 못한 파일의 결과입니다 (Q-17). */
export const NO_STUDENTS_FOUND = {
  success: false,
  error: expect.stringContaining("학생을 찾지 못했습니다"),
};

/** 성공을 전제로 학생 목록만 꺼냅니다. */
export async function parseStudents(
  bytes: Uint8Array,
  mapping?: ColumnMapping
): Promise<Student[]> {
  const result = await runWorker(bytes, mapping);
  if (!result.success) {
    throw new Error(`워커 실패: ${result.error}`);
  }
  return result.students;
}

/** 비교하기 쉽도록 학생을 "id 이름 | 영역:점수/만점 ..." 한 줄로 줄입니다. */
export function summarize(students: Student[]): string[] {
  return students.map((student) => {
    const evaluations = student.evaluations
      .map((e) => `${e.area}:${e.score}/${e.maxScore}`)
      .join(" ");
    return `${student.id} ${student.name} | ${evaluations}`;
  });
}
