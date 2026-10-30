/**
 * 잠긴 상태의 평가 카드 내용: 영역, 점수, 막대, 백분율
 */

import type { Evaluation } from "../../types";
import { formatScore, hasPercent, percentOf } from "../scoreText";

export function EvaluationSummary({ evaluation }: { evaluation: Evaluation }) {
  return (
    <>
      <div className="font-semibold text-small text-ink mb-1">{evaluation.area}</div>
      <div className="text-title font-bold text-accent-ink mb-2">
        {formatScore(evaluation)}
      </div>
      {hasPercent(evaluation) && (
        <div>
          <div className="w-full rounded-full h-1.5 mb-1 bg-surface-hover">
            <div
              className="h-1.5 rounded-full transition-all bg-brand"
              style={{ width: `${percentOf(evaluation)}%` }}
            />
          </div>
          <p className="text-caption text-soft">
            {percentOf(evaluation).toFixed(1)}%
          </p>
        </div>
      )}
    </>
  );
}
