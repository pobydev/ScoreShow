/**
 * 정규식 기반 컬럼 자동 매핑
 */

import type { ColumnMapping } from "../types";

// ColumnMapping을 다시 export (타입 에러 방지)
export type { ColumnMapping };

export const MAPPING_PATTERNS = {
  grade: /학년|grade/i,
  class: /반.*번호|반\/번호|class/i,
  number: /번호|번|student[_\s]?no/i,
  name: /이름|성명|name/i,
  // 평가 영역: "영역 : 듣기" 또는 "듣기 (만점...)" 형식 매칭
  // "반/번호"와 매칭되지 않도록 "영역" 또는 평가 영역 명칭이 명확한 경우만 매칭
  area: /영역\s*[:：]\s*[가-힣]+|평가.?영역|과제명|항목|(?:듣기|말하기|읽기|쓰기)(?:\s*\(|$)/i,
  score: /점수|득점|원점수|성취점/i,
  maxScore: /만점|배점|총점/i,
};

/**
 * 헤더 행에서 컬럼 매핑을 자동으로 찾습니다.
 * @param headers 헤더 행 배열 (1~5행까지 스캔)
 * @returns ColumnMapping 객체
 */
export function autoDetectMapping(headers: string[][]): ColumnMapping {
  const mapping: ColumnMapping = {};

  // 모든 행을 합쳐서 검색 (행 인덱스도 함께 저장하여 우선순위 결정)
  const flatHeaders: { value: string; col: number; row: number }[] = [];
  headers.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell && typeof cell === "string") {
        flatHeaders.push({ value: cell.trim(), col: colIndex, row: rowIndex });
      }
    });
  });

  // class와 number 매핑 먼저 처리 (area 매핑 시 제외하기 위해)
  Object.entries(MAPPING_PATTERNS).forEach(([key, pattern]) => {
    if (key === "area") return; // area는 나중에 처리

    for (const header of flatHeaders) {
      if (pattern.test(header.value)) {
        // "반/번호"의 경우 class와 number가 같은 컬럼으로 매핑됨
        if (key === "class") {
          mapping.class = header.col;
          mapping.number = header.col; // 같은 컬럼 사용
        } else {
          mapping[key as keyof ColumnMapping] = header.col;
        }
        break;
      }
    }
  });

  // area 매핑: class/number 컬럼 제외하고 찾기
  // "영역 : 듣기" 같은 헤더 형식이 우선순위 높음
  const classColumns = new Set(
    [mapping.class, mapping.number].filter(
      (col): col is number => col !== undefined
    )
  );

  // 먼저 "영역 : " 패턴이 있는 헤더 찾기 (헤더 영역에 있는 경우)
  let areaFound = false;
  for (const header of flatHeaders) {
    if (classColumns.has(header.col)) continue; // class/number 컬럼 제외

    // "영역 : 듣기" 같은 패턴 우선 매칭
    if (/영역\s*[:：]\s*[가-힣]+/i.test(header.value)) {
      mapping.area = header.col;
      areaFound = true;
      break;
    }
  }

  // "영역 : " 패턴을 못 찾았으면 다른 패턴 시도
  if (!areaFound) {
    for (const header of flatHeaders) {
      if (classColumns.has(header.col)) continue; // class/number 컬럼 제외

      if (MAPPING_PATTERNS.area.test(header.value)) {
        mapping.area = header.col;
        break;
      }
    }
  }

  // "반/번호"가 별도로 매핑되지 않은 경우, "반" 또는 "번호"만으로도 매핑 시도
  if (mapping.class === undefined && mapping.number === undefined) {
    for (const header of flatHeaders) {
      if (/반|class|학급/i.test(header.value)) {
        mapping.class = header.col;
        break;
      }
      if (/번호|번/i.test(header.value)) {
        mapping.number = header.col;
        break;
      }
    }
  }

  return mapping;
}

/**
 * 매핑이 완전한지 확인합니다.
 */
export function isMappingComplete(mapping: ColumnMapping): boolean {
  return !!(
    mapping.grade !== undefined &&
    mapping.class !== undefined &&
    mapping.number !== undefined &&
    mapping.name !== undefined &&
    mapping.area !== undefined &&
    mapping.score !== undefined &&
    mapping.maxScore !== undefined
  );
}
