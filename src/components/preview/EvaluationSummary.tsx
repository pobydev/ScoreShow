/**
 * 잠긴 상태의 평가 카드 내용: 영역, 점수, 막대, 백분율
 */

import type { Evaluation } from "../../types";
import { formatScore, hasPercent, percentOf } from "../scoreText";

export function EvaluationSummary({ evaluation }: { evaluation: Evaluation }) {
  const isEmpty = evaluation.score === null;

  return (
    <div className="grid gap-1.5">
      <div className="font-semibold text-body text-ink">{evaluation.area}</div>
      <div className={isEmpty ? "text-title font-bold text-soft" : "text-display font-bold text-accent-ink"}>
        {formatScore(evaluation)}
      </div>
      {hasPercent(evaluation) && (
        <>
          <div className="w-full rounded-full h-1.5 bg-surface-hover overflow-hidden">
            <div
              className="h-1.5 rounded-full transition-all bg-brand"
              style={{ width: `${percentOf(evaluation)}%` }}
            />
          </div>
          <p className="text-caption text-soft">
            {percentOf(evaluation).toFixed(1)}%
          </p>
        </>
      )}
      {isEmpty && (
        <>
          <div className="w-full rounded-full h-1.5 bg-surface-hover" />
          <p className="text-caption text-soft">점수 없음</p>
        </>
      )}
    </div>
  );
}
