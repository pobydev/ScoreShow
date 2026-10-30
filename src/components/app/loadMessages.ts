/**
 * 파일 불러오기 결과 문구
 * StatusMessage는 "✅"로 시작하는 문구를 성공 색으로 보여 줍니다.
 */

import type { ScoreIssue } from "../../core/normalize";

const MAX_LISTED_STUDENTS = 10;

export function loadedMessage(count: number, issues: ScoreIssue[] = []) {
  const loaded = `✅ Loaded ${count} students successfully.`;
  if (issues.length === 0) return loaded;

  const hasManyClasses = new Set(issues.map((issue) => issue.class)).size > 1;
  const students = [
    ...new Set(
      issues.map((issue) =>
        hasManyClasses ? `${issue.class}반 ${issue.number}번` : `${issue.number}번`
      )
    ),
  ];
  const listed = students.slice(0, MAX_LISTED_STUDENTS).join(", ");
  const rest = students.length - MAX_LISTED_STUDENTS;
  return `${loaded} 확인이 필요한 점수 ${issues.length}건: ${listed}${rest > 0 ? ` 외 ${rest}명` : ""}`;
}
