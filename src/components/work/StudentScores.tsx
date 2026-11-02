/**
 * 발표 화면 가운데: 학생 정보와 평가 카드
 * 평가 영역 수에 따라 글씨 크기와 칸 수가 달라집니다.
 * 창이 작으면 index.css의 presenter-stage가 전체를 함께 줄입니다.
 */

import type { CSSProperties } from "react";
import type { Evaluation, Student } from "../../types";
import { formatScore, textWidthEm } from "../scoreText";

function studentTextSize(count: number) {
  if (count === 1) {
    return {
      studentName: "text-5xl md:text-7xl",
      studentInfo: "text-6xl md:text-8xl",
    };
  } else if (count === 2 || count === 3) {
    return {
      studentName: "text-4xl md:text-5xl",
      studentInfo: "text-5xl md:text-6xl",
    };
  } else if (count === 4 || count === 5) {
    return {
      studentName: "text-3xl md:text-4xl",
      studentInfo: "text-4xl md:text-5xl",
    };
  } else {
    return {
      studentName: "text-2xl md:text-3xl",
      studentInfo: "text-3xl md:text-4xl",
    };
  }
}

/** 평가 수별 칸 수와 글자 크기는 index.css의 score-cards에 있습니다. */
function cardTier(count: number) {
  if (count === 1) return "score-cards-1";
  if (count === 2) return "score-cards-2";
  if (count <= 4) return "score-cards-3";
  if (count <= 6) return "score-cards-5";
  return "score-cards-7";
}

function EvaluationCard({ evaluation }: { evaluation: Evaluation }) {
  return (
    <div className="score-card rounded-card bg-card shadow-card">
      <div className="score-card-area font-semibold text-ink">{evaluation.area}</div>
      <div className={`presenter-card-score score-card-score font-bold ${evaluation.score === null ? 'text-soft' : 'text-accent-ink'}`}>
        {formatScore(evaluation)}
      </div>
    </div>
  );
}

export function StudentScores({ student }: { student: Student }) {
  const { evaluations } = student;
  const textSize = studentTextSize(evaluations.length);
  // 가장 긴 글자에 맞춰 정하므로 한 학생의 카드는 글자 크기가 모두 같습니다.
  const cardFit = {
    "--area-em": Math.max(...evaluations.map((evaluation) => textWidthEm(evaluation.area))),
    "--score-em": Math.max(...evaluations.map((evaluation) => textWidthEm(formatScore(evaluation)))),
  } as CSSProperties;

  return (
    <div className={`presenter-stage ${evaluations.length >= 5 ? 'presenter-stage-dense' : ''} text-center text-ink px-6 animate-fade-in w-full max-w-6xl`}>
      {/* 학생 정보 */}
      <div className="mb-8 md:mb-12">
        <h1 className={`${textSize.studentInfo} font-bold mb-2 md:mb-4`}>
          {student.grade}학년 {student.class}반{" "}
          {student.number}번
        </h1>
        <h2 className={`${textSize.studentName} font-bold`}>
          {student.name}
        </h2>
      </div>

      {/* 평가 영역들 */}
      <div className={`score-cards ${cardTier(evaluations.length)}`} style={cardFit}>
        {evaluations.map((evaluation, index) => (
          <EvaluationCard key={index} evaluation={evaluation} />
        ))}
      </div>
    </div>
  );
}
