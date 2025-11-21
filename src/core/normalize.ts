/**
 * 데이터 정규화 유틸리티
 * 다양한 형식의 입력값을 표준 형식으로 변환합니다.
 */

import type { Evaluation, ParsedRow } from "../types";

/**
 * 점수 문자열을 숫자로 파싱합니다.
 * "10점", "10/10", "10 / 10" 등의 형식을 처리합니다.
 */
function parseScore(scoreStr: string | undefined): number | null {
  if (!scoreStr) return null;

  // 공백 제거 및 정규화
  let normalized = scoreStr.toString().trim().replace(/\s+/g, "");

  // 빈 문자열 체크 (공백 제거 후)
  if (!normalized || normalized === "") return null;

  // 결시 관련 텍스트 필터링
  const absenceKeywords = /인정결|질병결|미인정결|기타결|입학|재입학|편입학|전입학|전출|면제|유예|취학|재취학/i;
  if (absenceKeywords.test(normalized)) {
    return null;
  }

  // "10점" 형식 처리
  normalized = normalized.replace(/점$/, "");

  // "10/10" 형식에서 앞부분만 추출
  if (normalized.includes("/")) {
    const parts = normalized.split("/");
    normalized = parts[0]?.trim() || "";
    if (!normalized) return null;
  }

  // 한국식 숫자 형식 처리 (쉼표를 소수점으로 변환: "6,50" -> "6.50")
  normalized = normalized.replace(/,/g, ".");

  // 숫자 추출 (소수점 포함)
  const match = normalized.match(/^(\d+\.?\d*)$/);
  if (!match) return null;

  const num = parseFloat(match[1]);
  if (isNaN(num)) return null;
  
  // 유효한 숫자인지 확인 (0 이상)
  return num >= 0 ? num : null;
}

/**
 * 만점 문자열을 숫자로 파싱합니다.
 */
function parseMaxScore(
  maxScoreStr: string | undefined,
  score: number | null
): number | null {
  if (!maxScoreStr && score !== null) {
    // 만점이 없으면 점수와 동일한 값으로 추정
    return score;
  }

  if (!maxScoreStr) return null;

  let normalized = maxScoreStr.toString().trim().replace(/\s+/g, "");
  normalized = normalized.replace(/점$/, "");

  // "10/10" 형식에서 뒷부분 추출
  if (normalized.includes("/")) {
    const parts = normalized.split("/");
    normalized = parts[1]?.trim() || parts[0]?.trim() || "";
  }

  const match = normalized.match(/(\d+\.?\d*)/);
  if (!match) return null;

  const num = parseFloat(match[1]);
  return isNaN(num) ? null : num;
}

/**
 * 이름 정규화 (공백 제거, 전각 문자 처리)
 */
function normalizeName(name: string | undefined): string {
  if (!name) return "";
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\uFF00-\uFFEF]/g, (char) => {
      // 전각 문자를 반각으로 변환
      const code = char.charCodeAt(0);
      if (code >= 0xff01 && code <= 0xff5e) {
        return String.fromCharCode(code - 0xfee0);
      }
      return char;
    });
}

/**
 * 숫자 문자열을 정수로 변환합니다.
 */
function parseInteger(value: string | undefined): number | null {
  if (!value) return null;
  const num = parseInt(value.toString().trim(), 10);
  return isNaN(num) ? null : num;
}

/**
 * "반/번호" 형식의 문자열을 파싱합니다.
 * 예: "1/1", "1/12", "2/5" 등
 */
function parseClassAndNumber(
  value: string | undefined
): { class: number; number: number } | null {
  if (!value) return null;

  const str = value.toString().trim();

  // "반/번호" 형식 처리
  if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.length >= 2) {
      const classNum = parseInt(parts[0]?.trim() || "", 10);
      const num = parseInt(parts[1]?.trim() || "", 10);
      if (!isNaN(classNum) && !isNaN(num)) {
        return { class: classNum, number: num };
      }
    }
  }

  return null;
}

/**
 * ParsedRow를 Evaluation으로 변환합니다.
 */
export function normalizeRow(row: ParsedRow): {
  grade: number;
  class: number;
  number: number;
  name: string;
  evaluation: Evaluation;
} | null {
  let grade = parseInteger(row.grade);
  let classNum: number | null = null;
  let number: number | null = null;

  // "반/번호"가 하나의 필드에 있는 경우 처리
  if (row.class || row.number) {
    // "반/번호" 형식이 하나의 필드에 있는지 확인
    const classAndNumber = parseClassAndNumber(row.class || row.number || "");
    if (classAndNumber) {
      classNum = classAndNumber.class;
      number = classAndNumber.number;
    } else {
      // 별도 필드인 경우
      classNum = parseInteger(row.class);
      number = parseInteger(row.number);
    }
  }

  const name = normalizeName(row.name);
  const score = parseScore(row.score);
  let maxScore = parseMaxScore(row.maxScore, score);

  // 필수 필드 검증 (학년은 선택적, 반/번호와 이름은 필수)
  if (classNum === null || number === null || !name) {
    return null;
  }

  // 학년이 없으면 기본값 1 사용 (또는 null 허용)
  if (grade === null) {
    grade = 1; // 기본값 설정
  }

  // 점수 검증: 점수가 없어도 평가 영역 정보만 있으면 허용
  // (점수가 나중에 입력될 수 있음)
  // score가 null이면 null로 유지 (미입력 상태)

  if (maxScore === null) {
    // 만점 정보가 없으면 점수와 동일하게 설정하거나 기본값 (score가 null이 아니고 0보다 클 때)
    maxScore = (score !== null && score > 0) ? score : 100; // 기본값 100
  }

  // 음수 체크 (score가 null이 아닐 때만)
  if (score !== null && (score < 0 || maxScore < 0)) {
    console.warn(`Invalid score: ${score}/${maxScore} for ${name}`);
    return null;
  }

  // 만점 초과 체크 (score가 null이 아닐 때만)
  if (score !== null && score > maxScore) {
    console.warn(`Score exceeds max: ${score}/${maxScore} for ${name}`);
    // 경고만 표시하고 진행
  }

  return {
    grade,
    class: classNum,
    number,
    name,
    evaluation: {
      area: row.area?.trim() || "평가",
      score,
      maxScore,
    },
  };
}
