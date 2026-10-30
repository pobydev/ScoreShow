/**
 * 발표 화면 가운데: 학생 정보와 평가 카드
 * 평가 영역 수에 따라 글씨 크기와 칸 수가 달라집니다.
 */

import type { Evaluation, Student } from "../../types";
import { formatScore, hasPercent, percentOf } from "../scoreText";

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

function gridColumns(count: number) {
  if (count <= 2) return 'grid-cols-1 md:grid-cols-1';
  if (count <= 4) return 'grid-cols-2';
  if (count <= 6) return 'grid-cols-2 md:grid-cols-3';
  return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
}

function EvaluationCard({
  evaluation,
  isOnly,
}: {
  evaluation: Evaluation;
  isOnly: boolean;
}) {
  return (
    <div
      className="rounded-lg p-6 border flex flex-col items-center"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)'
      }}
    >
      <div className={`${isOnly ? 'text-3xl md:text-5xl' : 'text-xl md:text-2xl'} font-medium mb-4`} style={{ color: 'var(--card-foreground)' }}>
        {evaluation.area}
      </div>
      <div className={`${isOnly ? 'text-8xl md:text-9xl' : 'text-4xl md:text-5xl'} font-bold mb-2`}>
        {formatScore(evaluation)}
      </div>
      {hasPercent(evaluation) && (
        <div className={`${isOnly ? 'text-xl' : 'text-lg'}`} style={{ color: 'var(--muted-foreground)' }}>
          {percentOf(evaluation).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

export function StudentScores({ student }: { student: Student }) {
  const { evaluations } = student;
  const textSize = studentTextSize(evaluations.length);

  return (
    <div className="text-center px-8 animate-fade-in w-full max-w-6xl mx-auto" style={{ color: 'var(--foreground)' }}>
      {/* 학생 정보 */}
      <div className="mb-8 md:mb-12">
        <h1 className={`${textSize.studentInfo} font-bold mb-2 md:mb-4`}>
          {student.grade}학년 {student.class}반{" "}
          {student.number}번
        </h1>
        <h2 className={`${textSize.studentName} font-semibold`}>
          {student.name}
        </h2>
      </div>

      {/* 평가 영역들 */}
      <div className="mb-12">
        <div className={`grid gap-4 md:gap-6 ${gridColumns(evaluations.length)}`}>
          {evaluations.map((evaluation, index) => (
            <EvaluationCard
              key={index}
              evaluation={evaluation}
              isOnly={evaluations.length === 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
