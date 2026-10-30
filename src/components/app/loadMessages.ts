/**
 * 파일 불러오기 결과 문구
 * StatusMessage는 "✅"로 시작하는 문구를 성공 색으로 보여 줍니다.
 */

import type { ScoreIssue } from "../../core/normalize";

const MAX_LISTED_STUDENTS = 10;

const SPREADSHEET_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

/** 받지 않는 파일이면 안내 문구를, 받는 파일이면 null을 돌려줍니다. */
export function uploadRejection(file: { name: string; type: string }): string | null {
  if (/\.csv$/i.test(file.name) || file.type === "text/csv") {
    return "CSV는 읽지 않습니다. 엑셀 파일로 저장해 주세요.";
  }
  if (!SPREADSHEET_TYPES.includes(file.type) && !/\.(xlsx|xls)$/i.test(file.name)) {
    return "Unsupported format: .xlsx, .xls";
  }
  return null;
}

function issueText(issues: ScoreIssue[]) {
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
  return `확인이 필요한 점수 ${issues.length}건: ${listed}${rest > 0 ? ` 외 ${rest}명` : ""}`;
}

export function loadedMessage(
  count: number,
  issues: ScoreIssue[] = [],
  areasWithoutMax: string[] = []
) {
  const parts = [`✅ Loaded ${count} students successfully.`];
  if (issues.length > 0) parts.push(issueText(issues));
  if (areasWithoutMax.length > 0) {
    parts.push(`만점을 찾지 못해 100점으로 둔 영역: ${areasWithoutMax.join(", ")}`);
  }
  return parts.join(" ");
}
