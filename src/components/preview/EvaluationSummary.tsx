/**
 * 잠긴 상태의 평가 카드 내용: 영역, 점수, 막대, 백분율
 */

import type { Evaluation } from "../../types";
import { formatScore, hasPercent, percentOf } from "../scoreText";

export function EvaluationSummary({ evaluation }: { evaluation: Evaluation }) {
  return (
    <>
      <div className="font-semibold text-sm mb-1">{evaluation.area}</div>
      <div className="text-xl font-bold mb-2" style={{ color: 'var(--primary)' }}>
        {formatScore(evaluation)}
      </div>
      {hasPercent(evaluation) && (
        <div>
          <div className="w-full rounded-full h-1.5 mb-1" style={{ backgroundColor: 'var(--secondary)' }}>
            <div
              className="h-1.5 rounded-full transition-all"
              style={{
                backgroundColor: 'var(--primary)',
                width: `${percentOf(evaluation)}%`,
              }}
            />
          </div>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {percentOf(evaluation).toFixed(1)}%
          </p>
        </div>
      )}
    </>
  );
}
