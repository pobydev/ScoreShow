import type { Evaluation } from "../types";

/** "8 / 10" 또는 점수가 없으면 "미입력" */
export function formatScore(evaluation: Evaluation): string {
  return evaluation.score === null
    ? '미입력'
    : `${evaluation.score} / ${evaluation.maxScore}`;
}

/** 백분율을 보여 줄 수 있는 평가인지 알려 줍니다. */
export function hasPercent(
  evaluation: Evaluation
): evaluation is Evaluation & { score: number } {
  return evaluation.maxScore > 0 && evaluation.score !== null;
}

export function percentOf(evaluation: Evaluation & { score: number }): number {
  return (evaluation.score / evaluation.maxScore) * 100;
}
