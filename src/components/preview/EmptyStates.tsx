/**
 * 작업 영역의 빈 화면 안내
 */

import { BookIcon, CheckCircleIcon } from "../icons";

export function NoStudentSelected() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <BookIcon className="w-16 h-16 mb-4 text-brand" aria-hidden="true" />
      <p className="text-emph font-semibold text-ink mb-1">학생을 선택하세요</p>
      <p className="text-body text-soft">
        왼쪽 목록에서 학생을 클릭하여 점수를 확인하세요
      </p>
    </div>
  );
}

export function NoEvaluations() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center rounded-card bg-card shadow-card">
      <CheckCircleIcon className="w-12 h-12 mb-3 text-brand" aria-hidden="true" />
      <p className="text-body text-soft">평가 데이터가 없습니다.</p>
    </div>
  );
}
