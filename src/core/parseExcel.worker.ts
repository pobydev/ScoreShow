/**
 * Web Worker에서 실행되는 엑셀 파싱 로직
 */

import * as XLSX from "xlsx";
import type { ParsedRow } from "../types";
import { autoDetectMapping } from "./mapping";
import type { ColumnMapping } from "../types";
import { normalizeRow } from "./normalize";
import type { Student, Evaluation } from "../types";

/**
 * 평가 영역 컬럼 정보
 */
interface AreaColumnInfo {
  col: number; // 컬럼 인덱스
  areaName: string; // 영역명 (예: "쓰기1", "말하기", "듣기")
  maxScore: number; // 만점
}

/**
 * 병합된 셀의 값을 가져옵니다.
 * 병합된 셀의 경우 첫 번째 셀에만 값이 있고 나머지는 빈 값이므로,
 * 병합 범위 내에서 값을 찾아 반환합니다.
 */
function getCellValue(
  worksheet: XLSX.WorkSheet,
  row: number,
  col: number,
  merges?: XLSX.Range[]
): string {
  // 먼저 직접 셀 값을 확인
  const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = worksheet[cellAddress];
  if (cell && (cell.w || cell.v)) {
    return (cell.w || cell.v || "").toString();
  }

  // 병합된 셀인지 확인
  if (merges) {
    for (const merge of merges) {
      const { s, e } = merge;
      // 현재 셀이 이 병합 범위 안에 있는지 확인
      if (row >= s.r && row <= e.r && col >= s.c && col <= e.c) {
        // 병합의 첫 번째 셀(시작 셀)에서 값을 가져옴
        const startCellAddress = XLSX.utils.encode_cell({ r: s.r, c: s.c });
        const startCell = worksheet[startCellAddress];
        if (startCell && (startCell.w || startCell.v)) {
          return (startCell.w || startCell.v || "").toString();
        }
      }
    }
  }

  return "";
}

/**
 * 병합된 셀을 고려하여 행 데이터를 읽습니다.
 */
function readRowWithMerges(
  worksheet: XLSX.WorkSheet,
  row: number,
  maxCol: number,
  merges?: XLSX.Range[]
): string[] {
  const rowData: string[] = [];
  for (let col = 0; col <= maxCol; col++) {
    rowData.push(getCellValue(worksheet, row, col, merges));
  }
  return rowData;
}

/**
 * 원시 셀 값을 직접 읽습니다 (병합 정보 없이)
 */
function getRawCellValue(
  worksheet: XLSX.WorkSheet,
  row: number,
  col: number
): string {
  const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = worksheet[cellAddress];
  if (!cell) return "";
  // 숫자인 경우 그대로 반환
  if (typeof cell.v === "number") {
    return cell.v.toString();
  }
  return (cell.w || cell.v || "").toString();
}

function normalizeHeaderLabel(value: string): string {
  return (value || "").replace(/\s+/g, "").toLowerCase();
}

function parseNumericCell(value: string): number | null {
  if (!value) return null;
  const numeric = parseFloat(value.replace(/[^-0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function parseStandardTemplate(worksheet: XLSX.WorkSheet): Student[] | null {
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  if (range.e.r < 2) {
    // 최소 0행(설명), 1행(헤더), 2행(첫 학생) 필요
    return null;
  }

  // 1행(인덱스 1)에서 헤더 읽기
  const headerRow: string[] = [];
  for (let col = 0; col <= range.e.c; col++) {
    headerRow.push(getRawCellValue(worksheet, 1, col).trim());
  }

  const gradeCol = headerRow.findIndex(
    (value) => normalizeHeaderLabel(value) === "학년"
  );
  const classCol = headerRow.findIndex(
    (value) => normalizeHeaderLabel(value) === "반"
  );
  const numberCol = headerRow.findIndex(
    (value) => normalizeHeaderLabel(value) === "번호"
  );
  const nameCol = headerRow.findIndex(
    (value) => normalizeHeaderLabel(value) === "이름"
  );

  if (nameCol === -1 || classCol === -1 || numberCol === -1) {
    return null;
  }

  // 영역 컬럼 찾기: 영역1 이름, 영역1 만점, 영역2 이름, 영역2 만점, ...
  const areaColumns: Array<{
    areaIndex: number;
    nameCol: number; // 영역 이름이 있는 컬럼 (1행에서 읽음)
    scoreCol: number; // 점수가 있는 컬럼 (2행부터 읽음, nameCol과 동일)
    maxScoreCol: number; // 만점이 있는 컬럼
    areaName: string; // 1행에서 읽은 영역 이름
    defaultMaxScore: number; // 2행에서 읽은 기본 만점
  }> = [];

  for (let col = 0; col <= range.e.c; col++) {
    const header = headerRow[col];
    // "영역1 이름", "영역2 이름" 패턴 찾기
    const areaNameMatch = normalizeHeaderLabel(header).match(/^영역(\d+)이름$/);
    if (areaNameMatch) {
      const index = parseInt(areaNameMatch[1], 10);
      const maxScoreCol = col + 1; // 영역1 만점은 영역1 이름 다음 컬럼
      
      // 1행에서 영역 이름 읽기 (사용자가 수정한 실제 영역명)
      let areaName = getRawCellValue(worksheet, 1, col).trim();
      
      // 영역 이름이 비어있거나 기본값인 경우 처리
      if (!areaName || areaName === "영역1 이름" || areaName === "영역2 이름" || areaName === "영역3 이름" || areaName === "영역4 이름" || areaName === "영역5 이름") {
        // 기본값으로 "영역1", "영역2" 등 사용
        areaName = `영역${index}`;
      }

      // 2행에서 기본 만점 읽기
      const defaultMaxScoreRaw = getRawCellValue(worksheet, 2, maxScoreCol).trim();
      const defaultMaxScore = parseNumericCell(defaultMaxScoreRaw);
      
      // 만점이 없으면 기본값 100 사용
      const finalMaxScore = defaultMaxScore && defaultMaxScore > 0 ? defaultMaxScore : 100;
      
      areaColumns.push({
        areaIndex: index,
        nameCol: col,
        scoreCol: col, // 점수는 영역 이름 칸에 입력됨
        maxScoreCol: maxScoreCol,
        areaName: areaName,
        defaultMaxScore: finalMaxScore,
      });
    }
  }

  if (areaColumns.length === 0) {
    return null;
  }

  const studentsMap = new Map<string, Student>();

  // 2행(인덱스 2)부터 학생 데이터 읽기 (2행은 예시이지만 실제 데이터로도 사용 가능)
  for (let row = 2; row <= range.e.r; row++) {
    const gradeValue =
      gradeCol !== -1 ? getRawCellValue(worksheet, row, gradeCol).trim() : "";
    const classValue =
      classCol !== -1 ? getRawCellValue(worksheet, row, classCol).trim() : "";
    const numberValue =
      numberCol !== -1 ? getRawCellValue(worksheet, row, numberCol).trim() : "";
    const name = getRawCellValue(worksheet, row, nameCol).trim();

    if (!name) {
      continue;
    }

    let grade = parseInt(gradeValue, 10);
    if (!Number.isFinite(grade)) {
      grade = 1;
    }

    const classNum = parseInt(classValue, 10);
    const number = parseInt(numberValue, 10);

    if (!Number.isFinite(classNum) || !Number.isFinite(number)) {
      continue;
    }

    const studentId = `${grade}-${classNum}-${number}`;
    if (!studentsMap.has(studentId)) {
      studentsMap.set(studentId, {
        id: studentId,
        grade,
        class: classNum,
        number: number,
        name,
        evaluations: [],
      });
    }

    const student = studentsMap.get(studentId)!;

    // 각 영역의 점수 읽기
    for (const areaCol of areaColumns) {
      // 점수는 영역 이름 칸(scoreCol)에서 읽음
      const scoreRaw = getRawCellValue(worksheet, row, areaCol.scoreCol).trim();
      const score = parseNumericCell(scoreRaw);
      
      // 만점은 만점 칸에서 읽고, 비어있으면 2행의 기본 만점 사용
      const maxScoreRaw = getRawCellValue(worksheet, row, areaCol.maxScoreCol).trim();
      const maxScoreCandidate = parseNumericCell(maxScoreRaw);
      const maxScore =
        maxScoreCandidate && maxScoreCandidate > 0
          ? maxScoreCandidate
          : areaCol.defaultMaxScore;

      // 점수가 있으면 평가 항목 추가
      if (score !== null) {
        student.evaluations.push({
          area: areaCol.areaName,
          score: score,
          maxScore,
        });
      }
    }
  }

  const students = Array.from(studentsMap.values()).filter(
    (student) => student.evaluations.length > 0
  );

  if (students.length === 0) {
    return null;
  }

  students.sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade;
    if (a.class !== b.class) return a.class - b.class;
    return a.number - b.number;
  });

  return students;
}

self.onmessage = async function (
  e: MessageEvent<{ file: File; mapping?: ColumnMapping }>
) {
  const { file, mapping: providedMapping } = e.data;

  try {
    // 파일 읽기
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, {
      type: "array",
      cellFormula: false, // 수식은 값으로 변환
      cellHTML: false,
      cellStyles: false,
    });

    // 첫 번째 시트 선택
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // 병합된 셀 정보 가져오기
    const merges = worksheet["!merges"] || [];

    // 헤더 행 추론 (1~15행 스캔 - 나이스 형식 대응)
    // 하지만 실제 데이터 행 시작을 찾기 위해 더 넓게 스캔
    const headerRows: string[][] = [];
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
    // 헤더는 최대 15행까지 스캔하되, 실제 데이터 찾을 때는 더 앞에서부터 찾기
    const maxHeaderRows = Math.min(15, range.e.r + 1);
    const maxCol = range.e.c;

    // 상단 메타데이터 및 헤더에서 학년 정보 추출
    let extractedGrade: number | null = null;
    const metadataRows: string[][] = [];

    for (let row = 0; row < maxHeaderRows; row++) {
      const rowData = readRowWithMerges(worksheet, row, maxCol, merges);
      metadataRows.push(rowData);
      headerRows.push(rowData);

      // 원시 데이터도 확인 (병합 전 값)
      const rawRowData: string[] = [];
      for (let col = 0; col <= maxCol; col++) {
        rawRowData.push(getRawCellValue(worksheet, row, col));
      }

      // 학년 정보 찾기 ("2학년", "1학년" 등 - "2025학년도"는 제외)
      if (!extractedGrade) {
        // 각 셀을 개별적으로 확인하는 것이 더 정확함
        for (let col = 0; col < rowData.length; col++) {
          const cellValue = rawRowData[col] || rowData[col] || "";

          // "학년도"를 포함하는 텍스트는 제외 (예: "2025학년도")
          // 하지만 "2학년 1강의실" 같은 형식은 포함
          // 정규식: 숫자(1-6) + "학년"이 뒤에 "도"가 오지 않는 경우
          // 또는 앞에 4자리 숫자가 오지 않는 경우
          const gradeMatch = cellValue.match(/(?:^|[^0-9])([1-6])학년(?!도)/);

          if (gradeMatch) {
            const gradeNum = parseInt(gradeMatch[1], 10);
            // 1-6 학년 범위 확인
            if (gradeNum >= 1 && gradeNum <= 6) {
              extractedGrade = gradeNum;
              if (import.meta.env.DEV) {
                console.log(
                  `[Parser] Extracted grade from header row ${
                    row + 1
                  }, column ${String.fromCharCode(65 + col)}: ${extractedGrade}`
                );
                console.log(`[Parser] Source text: "${cellValue}"`);
              }
              break;
            }
          }
        }

        // 개별 셀에서 못 찾았으면 전체 텍스트에서 찾기
        if (!extractedGrade) {
          const rowText = rowData.join(" ");
          // "2025학년도" 같은 패턴은 제외하고 "2학년"만 찾기
          // "학년도" 앞에 숫자가 4자리 이상이면 제외
          const gradeMatch = rowText.match(/(?:^|[^0-9])([1-6])학년(?!도)/);

          if (gradeMatch) {
            const gradeNum = parseInt(gradeMatch[1], 10);
            if (gradeNum >= 1 && gradeNum <= 6) {
              extractedGrade = gradeNum;
              if (import.meta.env.DEV) {
                console.log(
                  `[Parser] Extracted grade from header row ${
                    row + 1
                  }: ${extractedGrade}`
                );
              }
            }
          }
        }
      }
    }

    // 표준 템플릿인지 먼저 확인
    const templateStudents = parseStandardTemplate(worksheet);
    if (templateStudents) {
      self.postMessage({
        success: true,
        students: templateStudents,
        mapping: null,
      });
      return;
    }

    // 컬럼 매핑
    let mapping: ColumnMapping;
    if (providedMapping && Object.keys(providedMapping).length > 0) {
      mapping = providedMapping;
    } else {
      mapping = autoDetectMapping(headerRows);
    }

    // 디버깅: 매핑 결과 로그
    if (import.meta.env.DEV) {
      console.log("[Parser] Column mapping:", mapping);
      console.log("[Parser] Extracted grade:", extractedGrade);
      console.log("[Parser] Header rows sample:", headerRows.slice(0, 5));

      // 헤더 행에서 "반/번호" 텍스트가 있는 위치 확인
      console.log("[Parser] Searching for '반/번호' in headers:");
      for (let i = 0; i < headerRows.length; i++) {
        headerRows[i].forEach((cell, colIdx) => {
          if (cell && /반.*번호|반\/번호/i.test(cell)) {
            console.log(
              `[Parser] Found '반/번호' at row ${
                i + 1
              }, col ${String.fromCharCode(65 + colIdx)}: "${cell}"`
            );
          }
        });
      }
    }

    // 학년 정보가 여전히 없으면 추가로 헤더 컬럼 매핑에서 찾기
    if (!extractedGrade && mapping.grade !== undefined) {
      // 매핑된 학년 컬럼에서 헤더 행들을 확인
      for (let row = 0; row < maxHeaderRows; row++) {
        const gradeValue = getRawCellValue(worksheet, row, mapping.grade);
        if (gradeValue) {
          // "학년도"가 아닌 "학년"만 매치 (뒤에 "도"가 오지 않는 경우)
          const gradeMatch = gradeValue.match(/(?:^|[^0-9])([1-6])학년(?!도)/);
          if (gradeMatch) {
            const gradeNum = parseInt(gradeMatch[1], 10);
            if (gradeNum >= 1 && gradeNum <= 6) {
              extractedGrade = gradeNum;
              if (import.meta.env.DEV) {
                console.log(
                  `[Parser] Found grade from mapped column: ${extractedGrade}`
                );
              }
              break;
            }
          }
        }
      }
    }

    // 여러 평가 영역 컬럼 찾기
    const areaColumns: AreaColumnInfo[] = [];
    let extractedMaxScore: number | null = null;
    let extractedAreaName: string = "";
    let extractedAreaFromHeader = false;
    // 병합된 "점수" 컬럼 정보 저장 (dataStartRow 설정 후에 사용)
    let scoreMergeInfo: { s: { c: number }; e: { c: number }; headerRow: number } | null = null;

    // class/number 컬럼 제외하기 위한 Set
    const classColumns = new Set(
      [mapping.class, mapping.number, mapping.name].filter(
        (col): col is number => col !== undefined
      )
    );

    // 헤더 영역 전체를 스캔하여 "영역 : 듣기" 패턴 찾기 (단일 영역 형식)
    for (let row = 0; row < headerRows.length; row++) {
      const rowData = headerRows[row];
      for (let col = 0; col < rowData.length; col++) {
        const cellValue = rowData[col] || "";
        // "영역 : 쓰기1" 또는 "영역: 쓰기1 (서·논술형)" 패턴 찾기
        // 숫자와 괄호 내용도 포함하여 매칭
        const areaMatch = cellValue.match(/영역\s*[:：]\s*([가-힣\d]+(?:\s*\([^)]*\))?)/i);
        if (areaMatch) {
          // 괄호 내용 제거 (예: "쓰기1 (서·논술형)" -> "쓰기1")
          extractedAreaName = areaMatch[1].replace(/\s*\([^)]*\)/g, "").trim();
          extractedAreaFromHeader = true;
          if (import.meta.env.DEV) {
            console.log(
              `[Parser] Found area name from header metadata (row ${
                row + 1
              }, col ${col}): "${cellValue}" -> "${extractedAreaName}"`
            );
          }

          // 같은 행이나 인접 행에서 만점 정보 찾기
          // "영역만점 : 10.00" 또는 "만점 : 10.00" 패턴
          const rowText = rowData.join(" ");
          const maxScoreMatch = rowText.match(
            /영역만점\s*[:：]\s*(\d+\.?\d*)|만점\s*[:：]\s*(\d+\.?\d*)/i
          );
          if (maxScoreMatch) {
            extractedMaxScore = parseFloat(
              maxScoreMatch[1] || maxScoreMatch[2]
            );
            if (import.meta.env.DEV) {
              console.log(
                `[Parser] Found maxScore from header metadata: ${extractedMaxScore}`
              );
            }
          }

          // 인접 행에서도 만점 정보 찾기
          for (let offset = 1; offset <= 2; offset++) {
            const nextRow = row + offset;
            if (nextRow < headerRows.length) {
              const nextRowText = headerRows[nextRow].join(" ");
              const nextMaxScoreMatch = nextRowText.match(
                /영역만점\s*[:：]\s*(\d+\.?\d*)|만점\s*[:：]\s*(\d+\.?\d*)/i
              );
              if (nextMaxScoreMatch && !extractedMaxScore) {
                extractedMaxScore = parseFloat(
                  nextMaxScoreMatch[1] || nextMaxScoreMatch[2]
                );
                if (import.meta.env.DEV) {
                  console.log(
                    `[Parser] Found maxScore from next header row (${
                      nextRow + 1
                    }): ${extractedMaxScore}`
                  );
                }
              }
            }
          }
          break;
        }
      }
      if (extractedAreaFromHeader) break;
    }

    // 여러 평가 영역 컬럼 찾기 (표 헤더에서 "쓰기1", "말하기", "듣기" 등)
    // 단일 영역 형식(extractedAreaFromHeader가 true)인 경우는 건너뛰기
    // 헤더 행에서 평가 영역 패턴 찾기: "쓰기1", "쓰기2", "말하기", "듣기", "읽기" 등
    if (!extractedAreaFromHeader) {
      for (let row = 0; row < headerRows.length; row++) {
        const rowData = headerRows[row];
        const rawRowData: string[] = [];
        for (let col = 0; col <= maxCol; col++) {
          rawRowData.push(getRawCellValue(worksheet, row, col));
        }

        for (
          let col = 0;
          col < Math.max(rowData.length, rawRowData.length);
          col++
        ) {
          // class/number/name 컬럼은 제외
          if (classColumns.has(col)) continue;

          // 병합 범위 내의 컬럼 중 첫 번째 컬럼이 아닌 경우 건너뛰기
          let skipCol = false;
          for (const merge of merges) {
            const { s, e } = merge;
            if (row >= s.r && row <= e.r && col > s.c && col <= e.c) {
              // 병합 범위의 첫 번째 컬럼이 아니면 건너뛰기
              skipCol = true;
              break;
            }
          }
          if (skipCol) continue;

          const cellValue = rawRowData[col] || rowData[col] || "";
          if (!cellValue || typeof cellValue !== "string") continue;

          const trimmed = cellValue.trim();

          // 평가 영역 패턴 매칭: "쓰기1", "쓰기2", "말하기", "듣기" 등
          // 또는 "(만점 ...)" 형식 포함
          let areaName = "";
          let maxScore = 0;

          // "쓰기1 (서·논술)", "말하기", "듣기" 같은 패턴
          // 먼저 평가 영역 키워드를 찾습니다
          const areaKeywordMatch = trimmed.match(/(쓰기\d*|말하기|듣기|읽기)/i);

          if (areaKeywordMatch) {
            // 키워드를 포함한 전체 영역명 추출
            // "쓰기1" 또는 "쓰기1 (서·논술)" 같은 형식
            const afterKeyword = trimmed.substring(
              (areaKeywordMatch.index || 0) + areaKeywordMatch[0].length
            );

            // 숫자가 키워드 바로 뒤에 오는 경우 (예: "쓰기1")
            const numberMatch = afterKeyword.match(/^\d+/);
            let areaNameFull = areaKeywordMatch[0];
            if (numberMatch) {
              areaNameFull = areaKeywordMatch[0] + numberMatch[0];
            }

            // 괄호 앞까지 추출 (괄호 내용 제거)
            areaName = areaNameFull.trim();

            // 평가 영역 키워드가 포함되어 있는지 확인 (이미 확인했지만 재확인)
            if (/(?:쓰기|말하기|듣기|읽기)/i.test(areaName)) {
              // 만점 정보 찾기 (같은 셀 또는 인접 셀)
              const maxScoreMatch = trimmed.match(
                /만점\s*[:：]?\s*(\d+\.?\d*)/i
              );
              if (maxScoreMatch) {
                maxScore = parseFloat(maxScoreMatch[1]);
              } else {
                // 인접 행에서 만점 찾기 (보통 다음 행에 있음)
                for (let offset = 1; offset <= 2; offset++) {
                  const nextRow = row + offset;
                  if (nextRow < headerRows.length) {
                    const nextRawValue = getRawCellValue(
                      worksheet,
                      nextRow,
                      col
                    );
                    if (nextRawValue) {
                      const nextMaxScoreMatch = nextRawValue.match(
                        /만점\s*[:：]?\s*(\d+\.?\d*)/
                      );
                      if (nextMaxScoreMatch) {
                        maxScore = parseFloat(nextMaxScoreMatch[1]);
                        break;
                      }
                    }
                  }
                }
                // 만점을 못 찾았으면 기본값 100
                if (!maxScore) maxScore = 100;
              }

              // 병합된 셀인지 확인: 병합의 첫 번째 컬럼 인덱스 사용
              let actualCol = col;
              let foundMergeEndCol = col; // 병합 범위의 마지막 컬럼

              // 병합 정보 확인
              for (const merge of merges) {
                const { s, e } = merge;
                // 현재 행이 병합 범위에 있고, 컬럼이 병합 범위 내에 있는지 확인
                if (row >= s.r && row <= e.r && col >= s.c && col <= e.c) {
                  actualCol = s.c; // 병합의 첫 번째 컬럼 사용
                  foundMergeEndCol = e.c; // 병합 범위의 마지막 컬럼 저장
                  if (import.meta.env.DEV) {
                    console.log(
                      `[Parser] Area "${areaName}" found in merged cell at row ${row}, using first column ${actualCol} (range: ${s.c}-${e.c})`
                    );
                  }
                  break;
                }
              }

              // 이미 같은 컬럼(병합된 경우 첫 번째 컬럼)이 있는지 확인
              const existing = areaColumns.find((a) => a.col === actualCol);
              if (!existing && areaName) {
                areaColumns.push({ col: actualCol, areaName, maxScore });
                if (import.meta.env.DEV) {
                  console.log(
                    `[Parser] Found evaluation area column ${actualCol}: "${areaName}" (maxScore: ${maxScore})`
                  );
                }
                // 병합 범위의 마지막 컬럼까지 스킵
                if (foundMergeEndCol > col) {
                  col = foundMergeEndCol; // 다음 반복에서 foundMergeEndCol + 1부터 시작
                }
              }
            }
          }
        }
      }
    }

    // areaColumns 정렬 (컬럼 순서대로)
    areaColumns.sort((a, b) => a.col - b.col);

    if (import.meta.env.DEV) {
      console.log(
        `[Parser] Found ${areaColumns.length} evaluation area columns:`,
        areaColumns.map((a) => `${a.areaName}@${a.col}`)
      );
    }

    // 매핑된 area 컬럼이 있는 경우, 해당 컬럼에서도 확인 (두 번째 이미지 형식)
    const areaColumnIndex = mapping.area;
    if (areaColumnIndex !== undefined && !extractedAreaFromHeader) {
      // 헤더 행들에서 평가 영역명과 만점 정보 찾기 (원시 데이터 사용)
      for (let headerRow = 0; headerRow < headerRows.length; headerRow++) {
        // 원시 헤더 데이터 읽기
        const rawHeaderValue = getRawCellValue(
          worksheet,
          headerRow,
          areaColumnIndex
        );
        const processedHeaderValue =
          headerRows[headerRow]?.[areaColumnIndex] || "";
        const cellValue = rawHeaderValue || processedHeaderValue;

        if (cellValue) {
          // "(만점 10.00, ...)" 패턴 찾기
          const maxScoreMatch = cellValue.match(/만점\s*[:]?\s*(\d+\.?\d*)/i);
          if (maxScoreMatch) {
            extractedMaxScore = parseFloat(maxScoreMatch[1]);
            if (import.meta.env.DEV) {
              console.log(
                `[Parser] Found maxScore in header: ${extractedMaxScore}`
              );
            }
          }

          // 평가 영역명 추출 (괄호 제외)
          const areaNameMatch = cellValue.match(/([가-힣]+)(?:\s*\(|\s*만점)/);
          if (areaNameMatch) {
            extractedAreaName = areaNameMatch[1];
          } else if (cellValue.match(/[가-힣]+/)) {
            // 괄호가 없는 경우 한글이 포함된 텍스트 사용
            extractedAreaName = cellValue
              .replace(/\s*\(.*?\)/g, "")
              .replace(/\s*만점.*/i, "")
              .trim();
          }

          // 인접 열에서도 확인
          for (let offset = 1; offset <= 2; offset++) {
            const adjCol = areaColumnIndex + offset;
            const adjRawValue = getRawCellValue(worksheet, headerRow, adjCol);
            const adjValue = adjRawValue || "";
            if (adjValue) {
              const adjMaxScoreMatch = adjValue.match(
                /만점\s*[:]?\s*(\d+\.?\d*)/i
              );
              if (adjMaxScoreMatch && !extractedMaxScore) {
                extractedMaxScore = parseFloat(adjMaxScoreMatch[1]);
                if (import.meta.env.DEV) {
                  console.log(
                    `[Parser] Found maxScore in adjacent column: ${extractedMaxScore}`
                  );
                }
              }
            }
          }
        }
      }
    }

    // 헤더 영역에서 area를 찾았는데 매핑에 없는 경우, 점수 컬럼을 area로 사용
    if (extractedAreaFromHeader && areaColumnIndex === undefined) {
      if (mapping.score !== undefined) {
        mapping.area = mapping.score;
        if (import.meta.env.DEV) {
          console.log(
            `[Parser] Using score column (${mapping.score}) as area column (area found in header metadata)`
          );
        }
      }
    }

    if (import.meta.env.DEV) {
      console.log(
        `[Parser] Extracted area: ${extractedAreaName}, maxScore: ${extractedMaxScore}, fromHeader: ${extractedAreaFromHeader}`
      );
      console.log(`[Parser] Current mapping before score detection:`, JSON.stringify({
        score: mapping.score,
        area: mapping.area,
        class: mapping.class,
        number: mapping.number,
        name: mapping.name,
        maxScore: mapping.maxScore,
      }, null, 2));
    }

    // 점수 컬럼이 명시적으로 매핑되지 않은 경우 평가 영역 컬럼을 점수 컬럼으로도 사용
    if (mapping.score === undefined && areaColumnIndex !== undefined) {
      mapping.score = areaColumnIndex;
      if (import.meta.env.DEV) {
        console.log(
          `[Parser] Using area column (${areaColumnIndex}) as score column`
        );
      }
    }

    // 단일 영역 형식에서 점수 컬럼을 찾지 못했거나 잘못 매핑된 경우, 병합된 "점수" 컬럼 범위 내에서 찾기
    // extractedAreaFromHeader가 true이면 헤더에서 영역을 찾았으므로, 점수 컬럼도 헤더에서 찾아야 함
    if (extractedAreaFromHeader) {
      // 기존 매핑이 있더라도 병합된 "점수" 컬럼을 찾아서 확인/수정
      // 원시 데이터에서 직접 "점수" 헤더 찾기 (병합 처리 전 데이터)
      let foundScoreHeader = false;
      for (let row = 0; row < Math.min(headerRows.length, 15); row++) {
        // 원시 데이터에서 직접 확인
        for (let col = 0; col <= maxCol; col++) {
          const rawCellValue = getRawCellValue(worksheet, row, col);
          const cellValue = rawCellValue || "";
          
          // "점수" 헤더 찾기
          if (/점수|득점|원점수|성취점/i.test(cellValue)) {
            // 병합된 셀인지 확인
            let scoreCol = col;
            let mergeInfo: { s: { c: number }; e: { c: number } } | null = null;
            for (const merge of merges) {
              const { s, e } = merge;
              if (row >= s.r && row <= e.r && col >= s.c && col <= e.c) {
                // 병합 범위의 첫 번째 컬럼 사용
                scoreCol = s.c;
                mergeInfo = { s, e };
                // 병합 정보 저장 (dataStartRow 설정 후에 사용)
                scoreMergeInfo = { s, e, headerRow: row };
                if (import.meta.env.DEV) {
                  console.log(
                    `[Parser] Found merged "점수" header at row ${row + 1}, col ${col}, using first column ${scoreCol} (merge range: ${s.c}-${e.c})`
                  );
                }
                break;
              }
            }
            // 일단 병합 범위의 첫 번째 컬럼으로 매핑 (dataStartRow 설정 후에 실제 데이터 컬럼 찾기)
            // 기존 매핑이 없거나, 병합 범위의 첫 번째 컬럼과 다르면 업데이트
            if (mapping.score === undefined || mapping.score !== scoreCol) {
              const oldScore = mapping.score;
              mapping.score = scoreCol;
              foundScoreHeader = true;
              if (import.meta.env.DEV) {
                console.log(
                  `[Parser] Found/Updated score column from "점수" header: ${scoreCol} (row ${row + 1}${mergeInfo ? `, merge range: ${mergeInfo.s.c}-${mergeInfo.e.c}` : ''})${oldScore !== undefined ? ` (was ${oldScore})` : ''}`
                );
              }
            }
            break;
          }
        }
        if (foundScoreHeader) break;
      }
    }

    // 데이터 행 시작 위치 찾기 (빈 행 건너뛰기)
    // "반/번호" 헤더가 있는 행 다음부터 시작하되, "1/1" 형식의 첫 번째 학생 행을 찾기

    // "반/번호" 헤더가 있는 행 찾기
    let classHeaderRow = -1;
    for (let i = 0; i < headerRows.length; i++) {
      const found = headerRows[i].some(
        (cell) => cell && /반.*번호|반\/번호/i.test(cell)
      );
      if (found) {
        classHeaderRow = i;
        if (import.meta.env.DEV) {
          console.log(`[Parser] Found "반/번호" header at row ${i + 1}`);
        }
        break;
      }
    }

    // 최소 검색 시작 행: "반/번호" 헤더 다음 행 또는 maxHeaderRows 중 큰 값
    const minSearchRow =
      classHeaderRow >= 0 ? classHeaderRow + 1 : maxHeaderRows;

    let dataStartRow = minSearchRow;
    const candidateRows: {
      row: number;
      value: string;
      classNum: number;
      studentNum: number;
      col: number;
    }[] = [];

    // "반/번호" 컬럼이 있는 경우, 해당 컬럼에 모든 "반/번호" 형식 찾기
    const classColumnIndex = mapping.class;

    if (import.meta.env.DEV) {
      console.log(
        `[Parser] Looking for data start row, classColumnIndex: ${classColumnIndex}`
      );
      console.log(
        `[Parser] Searching from row ${
          minSearchRow + 1
        } (after "반/번호" header at row ${
          classHeaderRow >= 0 ? classHeaderRow + 1 : "unknown"
        })`
      );
      console.log(
        `[Parser] maxHeaderRows: ${maxHeaderRows}, minSearchRow: ${minSearchRow}, classHeaderRow: ${classHeaderRow}`
      );
    }

    // 헤더 다음부터 최대 30행까지 모든 행 확인
    for (
      let row = minSearchRow;
      row <= Math.min(range.e.r, minSearchRow + 30);
      row++
    ) {
      // 원시 데이터로 직접 확인
      const rawRowData: string[] = [];
      for (let col = 0; col <= maxCol; col++) {
        rawRowData.push(getRawCellValue(worksheet, row, col));
      }

      // 매핑된 컬럼에서 확인
      if (
        classColumnIndex !== undefined &&
        classColumnIndex < rawRowData.length
      ) {
        const rawValue = rawRowData[classColumnIndex] || "";
        const trimmed = rawValue.trim();

        // "반/번호" 형식 확인 (앞뒤 공백, 슬래시 주변 공백 허용)
        if (trimmed && /^\d+\s*\/\s*\d+/.test(trimmed)) {
          const parts = trimmed.split(/\s*\/\s*/);
          if (parts.length === 2) {
            const classNum = parseInt(parts[0] || "", 10);
            const studentNum = parseInt(parts[1] || "", 10);

            if (!isNaN(classNum) && !isNaN(studentNum) && studentNum >= 1) {
              candidateRows.push({
                row,
                value: trimmed,
                classNum,
                studentNum,
                col: classColumnIndex,
              });
              if (import.meta.env.DEV) {
                console.log(
                  `[Parser] Found candidate at row ${row + 1}: "${trimmed}"`
                );
              }
            }
          }
        }
      }

      // 매핑된 컬럼에서 못 찾았으면 모든 컬럼에서 "반/번호" 형식 찾기 (백업)
      if (
        candidateRows.length === 0 ||
        candidateRows[candidateRows.length - 1].row !== row
      ) {
        for (let col = 0; col < rawRowData.length; col++) {
          const cellValue = rawRowData[col] || "";
          const trimmed = cellValue.trim();

          // "반/번호" 형식 확인
          if (trimmed && /^\d+\s*\/\s*\d+/.test(trimmed)) {
            const parts = trimmed.split(/\s*\/\s*/);
            if (parts.length === 2) {
              const classNum = parseInt(parts[0] || "", 10);
              const studentNum = parseInt(parts[1] || "", 10);

              if (!isNaN(classNum) && !isNaN(studentNum) && studentNum >= 1) {
                // 이미 같은 행에 후보가 있으면 추가하지 않음
                const existing = candidateRows.find(
                  (c) => c.row === row && c.value === trimmed
                );
                if (!existing) {
                  candidateRows.push({
                    row,
                    value: trimmed,
                    classNum,
                    studentNum,
                    col,
                  });
                  if (import.meta.env.DEV) {
                    console.log(
                      `[Parser] Found candidate at row ${
                        row + 1
                      }, col ${String.fromCharCode(65 + col)}: "${trimmed}"`
                    );
                  }
                }
              }
            }
          }
        }
      }
    }

    // 후보 행들을 정렬해서 가장 앞에 있는 "1/1" 또는 첫 번째 학생 찾기
    if (candidateRows.length > 0) {
      if (import.meta.env.DEV) {
        console.log(`[Parser] Found ${candidateRows.length} candidate rows`);
      }

      // 1. "1/1" 형식 우선 (가장 앞에 있는 것)
      const firstStudents = candidateRows.filter((c) => c.studentNum === 1);
      if (firstStudents.length > 0) {
        // 가장 앞에 있는 행 선택
        firstStudents.sort((a, b) => a.row - b.row);
        dataStartRow = firstStudents[0].row;
        if (import.meta.env.DEV) {
          console.log(
            `[Parser] Data starts at row ${
              dataStartRow + 1
            } (found first student: "${firstStudents[0].value}")`
          );
        }
      } else {
        // 2. 가장 앞에 있는 행 선택
        candidateRows.sort((a, b) => a.row - b.row);
        dataStartRow = candidateRows[0].row;
        if (import.meta.env.DEV) {
          console.log(
            `[Parser] Data starts at row ${
              dataStartRow + 1
            } (found earliest student: "${candidateRows[0].value}")`
          );
        }
      }
    } else {
      if (import.meta.env.DEV) {
        console.log(
          `[Parser] No "반/번호" format found, using general data detection`
        );
      }
    }

    // "반/번호" 형식을 찾지 못한 경우 일반 데이터 확인
    // 하지만 일반 데이터 확인 시 "반/번호" 형식을 다시 한 번 전체 컬럼에서 찾기
    if (dataStartRow === minSearchRow) {
      if (import.meta.env.DEV) {
        console.log(
          `[Parser] No "반/번호" found in mapped column, searching all columns...`
        );
      }

      // 모든 컬럼에서 "반/번호" 형식 다시 찾기
      // "반/번호" 헤더 다음 행부터 검색
      for (
        let row = minSearchRow;
        row <= Math.min(range.e.r, minSearchRow + 20);
        row++
      ) {
        const rawRowData: string[] = [];
        for (let col = 0; col <= maxCol; col++) {
          rawRowData.push(getRawCellValue(worksheet, row, col));
        }

        // 모든 컬럼에서 "1/1", "1/2" 같은 형식 찾기
        for (let col = 0; col < rawRowData.length; col++) {
          const cellValue = rawRowData[col] || "";
          const trimmed = cellValue.trim();

          if (trimmed && /^\d+\s*\/\s*\d+/.test(trimmed)) {
            const parts = trimmed.split(/\s*\/\s*/);
            if (parts.length === 2) {
              const classNum = parseInt(parts[0] || "", 10);
              const studentNum = parseInt(parts[1] || "", 10);

              if (!isNaN(classNum) && !isNaN(studentNum) && studentNum >= 1) {
                // "1/1" 형식이면 바로 선택
                if (studentNum === 1) {
                  dataStartRow = row;
                  if (import.meta.env.DEV) {
                    console.log(
                      `[Parser] Data starts at row ${
                        row + 1
                      }, col ${String.fromCharCode(
                        65 + col
                      )} (found "반/번호": "${trimmed}")`
                    );
                  }
                  break;
                } else if (dataStartRow === maxHeaderRows) {
                  // 첫 번째로 만나는 "반/번호" 형식 저장
                  dataStartRow = row;
                  console.log(
                    `[Parser] Data starts at row ${
                      row + 1
                    }, col ${String.fromCharCode(
                      65 + col
                    )} (found "반/번호": "${trimmed}")`
                  );
                }
              }
            }
          }
        }

        if (dataStartRow !== minSearchRow) break;
      }

      // 그래도 못 찾았으면 일반 데이터 확인
      if (dataStartRow === minSearchRow) {
        for (
          let row = minSearchRow;
          row <= Math.min(range.e.r, minSearchRow + 20);
          row++
        ) {
          const rowData = readRowWithMerges(worksheet, row, maxCol, merges);

          // 헤더 텍스트와 다른 실제 데이터가 있는지 확인
          const hasRealData = rowData.some((cell, idx) => {
            if (!cell || cell.trim() === "") return false;

            // 헤더에 포함된 텍스트인지 확인
            const isHeaderText = headerRows.some(
              (headerRow) =>
                idx < headerRow.length && headerRow[idx] === cell.trim()
            );

            // 헤더가 아니고 실제 데이터인 경우
            return !isHeaderText && /[\d가-힣]/.test(cell.trim());
          });

          if (hasRealData) {
            dataStartRow = row;
            console.log(
              `[Parser] Data starts at row ${row + 1} (found general data)`
            );
            break;
          }
        }
      }
    }

    if (import.meta.env.DEV) {
      console.log(`[Parser] Final data start row: ${dataStartRow + 1}`);
    }

    // 병합된 "점수" 컬럼을 찾은 경우, 병합 범위 내에서 실제 점수 데이터가 있는 컬럼 찾기
    // dataStartRow가 설정된 후에 실행해야 함
    if (mapping.score !== undefined && extractedAreaFromHeader && dataStartRow > 0 && scoreMergeInfo) {
      // 저장된 병합 정보를 사용하여 병합 범위 내에서 실제 점수 데이터가 있는 컬럼 찾기
      const { s, e } = scoreMergeInfo;
      const checkRows = Math.min(dataStartRow + 10, range.e.r); // 더 많은 행 확인
      const scoreCandidates: { col: number; count: number; firstValue: number | null }[] = [];
      
      // 병합 범위 내의 모든 컬럼을 확인하여 실제 점수 데이터가 있는 컬럼 찾기
      for (let checkCol = s.c; checkCol <= e.c; checkCol++) {
        // class/number/name 컬럼은 제외
        if (checkCol === mapping.class || checkCol === mapping.number || checkCol === mapping.name) {
          continue;
        }
        
        let numericCount = 0;
        let firstNumericValue: number | null = null;
        for (let checkRow = dataStartRow; checkRow <= checkRows; checkRow++) {
          const rawValue = getRawCellValue(worksheet, checkRow, checkCol);
          const trimmed = (rawValue || "").trim();
          
          // 빈 셀이 아니고 숫자 데이터인지 확인
          if (trimmed && trimmed !== "") {
            const numeric = parseNumericCell(rawValue);
            if (numeric !== null && numeric >= 0) {
              numericCount++;
              if (firstNumericValue === null) {
                firstNumericValue = numeric;
              }
            }
          }
        }
        
        if (numericCount > 0) {
          scoreCandidates.push({ col: checkCol, count: numericCount, firstValue: firstNumericValue });
        }
      }
      
      // 숫자 데이터가 가장 많이 있는 컬럼을 선택 (같으면 첫 번째 컬럼 우선)
      if (scoreCandidates.length > 0) {
        scoreCandidates.sort((a, b) => {
          // 먼저 숫자 데이터 개수로 정렬
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          // 개수가 같으면 첫 번째 컬럼에 가까운 것을 선택
          return a.col - b.col;
        });
        
        const foundDataCol = scoreCandidates[0].col;
        if (foundDataCol !== mapping.score) {
          const oldScore = mapping.score;
          mapping.score = foundDataCol;
          if (import.meta.env.DEV) {
            console.log(
              `[Parser] Updated score column from merged range ${s.c}-${e.c}: ${foundDataCol} (${scoreCandidates[0].count} numeric values, was ${oldScore})`
            );
            console.log(`[Parser] Score candidates:`, scoreCandidates.map(c => `col ${c.col}: ${c.count} values`).join(', '));
          }
        } else if (import.meta.env.DEV) {
          console.log(
            `[Parser] Score column ${mapping.score} is correct within merge range ${s.c}-${e.c} (${scoreCandidates[0].count} numeric values found)`
          );
        }
      }
    }

    // 단일 영역 형식에서 점수 컬럼을 여전히 찾지 못한 경우, 데이터 행에서 숫자가 있는 컬럼 찾기
    if (mapping.score === undefined && extractedAreaFromHeader) {
      const classColumns = new Set(
        [mapping.class, mapping.number, mapping.name].filter(
          (col): col is number => col !== undefined
        )
      );
      
      // 데이터 시작 행부터 몇 행을 확인하여 숫자가 있는 컬럼 찾기
      const checkRows = Math.min(dataStartRow + 10, range.e.r);
      const scoreCandidates: { col: number; count: number }[] = [];
      
      for (let col = 0; col <= maxCol; col++) {
        if (classColumns.has(col)) continue;
        
        let numericCount = 0;
        for (let row = dataStartRow; row <= checkRows; row++) {
          const rawValue = getRawCellValue(worksheet, row, col);
          const numeric = parseNumericCell(rawValue);
          if (numeric !== null) {
            numericCount++;
          }
        }
        
        if (numericCount > 0) {
          scoreCandidates.push({ col, count: numericCount });
        }
      }
      
      // 숫자가 가장 많이 있는 컬럼을 점수 컬럼으로 선택
      if (scoreCandidates.length > 0) {
        scoreCandidates.sort((a, b) => b.count - a.count);
        mapping.score = scoreCandidates[0].col;
        if (import.meta.env.DEV) {
          console.log(
            `[Parser] Auto-detected score column from data: ${mapping.score} (${scoreCandidates[0].count} numeric values found)`
          );
        }
      }
    }

    const parsedRows: ParsedRow[] = [];

    for (let row = dataStartRow; row <= range.e.r; row++) {
      // 원시 데이터 직접 읽기 (병합 정보 무시) - 먼저 읽어야 함
      const rawRowData: string[] = [];
      for (let col = 0; col <= maxCol; col++) {
        rawRowData.push(getRawCellValue(worksheet, row, col));
      }

      const rowData = readRowWithMerges(worksheet, row, maxCol, merges);

      // 행이 비어있는지 확인 (반/번호 컬럼에 데이터가 있는지 먼저 확인)
      let isEmpty = true;

      if (mapping.class !== undefined && mapping.class < rawRowData.length) {
        const classValue = rawRowData[mapping.class] || "";
        const trimmed = classValue.trim();

        // "반/번호" 형식이 있으면 데이터가 있는 것으로 간주 (공백 허용)
        if (trimmed && /^\d+\s*\/\s*\d+/.test(trimmed)) {
          isEmpty = false;
        }

        // 숫자만 있어도 확인 (번호만 있을 수 있음)
        if (isEmpty && trimmed && /^\d+$/.test(trimmed)) {
          const num = parseInt(trimmed, 10);
          // 1 이상의 숫자이고 주변에 데이터가 있으면
          if (num >= 1) {
            // 이름 컬럼이나 점수 컬럼에 데이터가 있는지 확인
            const nameCol = mapping.name;
            const scoreCol = mapping.score;
            if (nameCol !== undefined && nameCol < rawRowData.length) {
              const nameValue = rawRowData[nameCol] || "";
              if (nameValue.trim() && /[가-힣]/.test(nameValue.trim())) {
                isEmpty = false;
              }
            }
            if (
              isEmpty &&
              scoreCol !== undefined &&
              scoreCol < rawRowData.length
            ) {
              const scoreValue = rawRowData[scoreCol] || "";
              if (scoreValue.trim() && /[\d.]/.test(scoreValue.trim())) {
                isEmpty = false;
              }
            }
          }
        }
      }

      // 반/번호가 없으면 일반적인 데이터 확인 (더 관대하게)
      if (isEmpty) {
        // 최소 2개 이상의 셀에 실제 데이터가 있으면 데이터 행으로 간주
        const dataCellCount = rawRowData.filter((cell) => {
          const trimmed = (cell || "").trim();
          return trimmed && /[\d가-힣]/.test(trimmed) && trimmed.length > 0;
        }).length;

        // 이름이나 점수 같은 중요 데이터가 하나라도 있으면
        if (dataCellCount >= 2) {
          isEmpty = false;
        } else if (dataCellCount === 1) {
          // 단일 셀에 데이터가 있으면 좀 더 확인
          const singleData = rawRowData.find((cell) => {
            const trimmed = (cell || "").trim();
            return trimmed && /[\d가-힣]/.test(trimmed);
          });
          // 헤더 텍스트가 아니고 충분히 긴 텍스트면 데이터로 간주
          if (singleData && singleData.trim().length > 1) {
            const isHeaderText = headerRows.some((headerRow) =>
              headerRow.includes(singleData.trim())
            );
            if (!isHeaderText) {
              isEmpty = false;
            }
          }
        }
      }

      if (isEmpty) continue;

      const parsed: ParsedRow = {};

      // 매핑된 컬럼에서 값을 가져올 때, 원시 데이터 우선 사용
      const getValueFromMappedColumn = (
        colIndex: number | undefined
      ): string => {
        if (colIndex === undefined) return "";

        // 먼저 원시 데이터에서 직접 읽기 (가장 정확)
        if (colIndex < rawRowData.length) {
          const rawValue = rawRowData[colIndex];
          if (rawValue && rawValue.trim()) {
            return rawValue.trim();
          }
        }

        // 원시 데이터에서 없으면 병합 처리된 데이터에서 확인
        if (colIndex < rowData.length) {
          const value = rowData[colIndex];
          if (value && value.trim()) {
            return value.trim();
          }
        }

        // 병합된 셀인 경우, 병합 범위 내의 모든 열을 확인
        for (const merge of merges) {
          const { s, e } = merge;
          if (colIndex >= s.c && colIndex <= e.c && s.c < rawRowData.length) {
            // 병합 범위 내의 첫 번째 셀에서 원시 값 가져오기
            const startRawValue = rawRowData[s.c] || "";
            if (startRawValue && startRawValue.trim()) {
              return startRawValue.trim();
            }
          }
        }

        return "";
      };

      // 학년 정보: 메타데이터에서 추출한 값 우선 사용
      if (extractedGrade !== null) {
        parsed.grade = extractedGrade.toString();
      } else if (mapping.grade !== undefined) {
        parsed.grade = getValueFromMappedColumn(mapping.grade);
      } else {
        // 학년이 없으면 기본값 1 (정규화 단계에서 처리하지만 여기서도 설정)
        parsed.grade = "1";
      }

      // 반/번호 정보 (원시 데이터 우선 사용)
      if (mapping.class !== undefined) {
        // 원시 데이터에서 직접 읽기
        const rawClassValue = getRawCellValue(worksheet, row, mapping.class);
        if (rawClassValue && rawClassValue.trim()) {
          parsed.class = rawClassValue.trim();
        } else {
          parsed.class = getValueFromMappedColumn(mapping.class);
        }
      }

      // number는 class와 같은 컬럼이면 class 값 사용
      if (mapping.number !== undefined) {
        if (mapping.number === mapping.class && parsed.class) {
          parsed.number = parsed.class; // 같은 컬럼이면 같은 값 사용
        } else {
          const rawNumberValue = getRawCellValue(
            worksheet,
            row,
            mapping.number
          );
          if (rawNumberValue && rawNumberValue.trim()) {
            parsed.number = rawNumberValue.trim();
          } else {
            parsed.number = getValueFromMappedColumn(mapping.number);
          }
        }
      }

      // 이름
      if (mapping.name !== undefined) {
        parsed.name = getValueFromMappedColumn(mapping.name);
      }

      // 평가 영역: 헤더에서 추출한 값 우선 사용
      if (extractedAreaName) {
        parsed.area = extractedAreaName;
      } else if (mapping.area !== undefined) {
        parsed.area = getValueFromMappedColumn(mapping.area);
      }

      // 점수
      if (mapping.score !== undefined) {
        parsed.score = getValueFromMappedColumn(mapping.score);
        
        // 해당 행에 결시 관련 텍스트가 있는지 확인
        const absenceKeywords = /인정결|질병결|미인정결|기타결|입학|재입학|편입학|전입학|전출|면제|유예|취학|재취학/i;
        let hasAbsenceReason = false;
        
        // 행의 모든 컬럼을 확인하여 결시 관련 텍스트 찾기
        for (let col = 0; col < rawRowData.length; col++) {
          // 점수 컬럼은 제외 (점수 컬럼에 '전출'이 있을 수도 있음)
          if (col === mapping.score) continue;
          
          const cellValue = rawRowData[col] || "";
          const trimmed = cellValue.toString().trim();
          
          if (trimmed && absenceKeywords.test(trimmed)) {
            hasAbsenceReason = true;
            if (import.meta.env.DEV && parsedRows.length === 0) {
              console.log(`[Parser] Found absence reason "${trimmed}" in column ${col}, setting score to null`);
            }
            break;
          }
        }
        
        // 결시 관련 텍스트가 있으면 점수를 null로 설정
        if (hasAbsenceReason) {
          parsed.score = "";
        }
        
        // 디버깅: 첫 번째 행에서 점수 읽기 확인
        if (parsedRows.length === 0 && import.meta.env.DEV) {
          console.log(`[Parser] Reading score from column ${mapping.score}:`, JSON.stringify({
            rawValue: rawRowData[mapping.score],
            parsedScore: parsed.score,
            hasAbsenceReason,
            rawRowDataSample: rawRowData.slice(0, 10),
            columnMapping: {
              class: mapping.class,
              number: mapping.number,
              name: mapping.name,
              score: mapping.score,
            }
          }, null, 2));
        }
      } else {
        // 점수 컬럼이 없으면 경고
        if (parsedRows.length === 0 && import.meta.env.DEV) {
          console.warn(`[Parser] Score column not mapped!`, {
            mapping,
            extractedAreaFromHeader,
            extractedAreaName,
          });
        }
      }

      // 만점: 헤더에서 추출한 값 우선 사용
      if (extractedMaxScore !== null) {
        parsed.maxScore = extractedMaxScore.toString();
      } else if (mapping.maxScore !== undefined) {
        parsed.maxScore = getValueFromMappedColumn(mapping.maxScore);
      }

      // 반/번호 중 하나라도 있으면 파싱 시도
      if (parsed.class || parsed.number) {
        // 디버깅: 첫 번째 행 로그
        if (parsedRows.length === 0 && import.meta.env.DEV) {
          console.log("[Parser] First parsed row:", JSON.stringify({
            raw: rawRowData.slice(0, 10),
            parsed: {
              grade: parsed.grade,
              class: parsed.class,
              number: parsed.number,
              name: parsed.name,
              area: parsed.area,
              score: parsed.score,
              maxScore: parsed.maxScore,
            },
            mapping: {
              grade: mapping.grade,
              class: mapping.class,
              number: mapping.number,
              name: mapping.name,
              area: mapping.area,
              score: mapping.score,
              maxScore: mapping.maxScore,
            },
          }, null, 2));
        }
        parsedRows.push(parsed);
      }
    }

    // 정규화 및 학생 데이터 생성
    const studentsMap = new Map<string, Student>();

    // 여러 영역이 있는 경우, 각 행에서 모든 영역의 점수 읽기
    if (areaColumns.length > 0) {
      // 여러 영역이 있는 경우: 각 행에서 모든 영역 점수 읽기
      for (let row = dataStartRow; row <= range.e.r; row++) {
        const rawRowData: string[] = [];
        for (let col = 0; col <= maxCol; col++) {
          rawRowData.push(getRawCellValue(worksheet, row, col));
        }

        // 반/번호 확인
        const classColumnIndex = mapping.class;
        if (
          classColumnIndex === undefined ||
          classColumnIndex >= rawRowData.length
        )
          continue;

        const classValue = rawRowData[classColumnIndex] || "";
        const trimmed = classValue.trim();
        if (!trimmed || !/^\d+\s*\/\s*\d+/.test(trimmed)) continue;

        // 기본 정보 읽기
        const classAndNumber = trimmed.split(/\s*\/\s*/);
        if (classAndNumber.length < 2) continue;

        const classNum = parseInt(classAndNumber[0] || "", 10);
        const number = parseInt(classAndNumber[1] || "", 10);
        if (isNaN(classNum) || isNaN(number)) continue;

        // 이름 읽기
        const nameValue =
          mapping.name !== undefined && mapping.name < rawRowData.length
            ? rawRowData[mapping.name] || ""
            : "";
        const name = nameValue.trim();

        if (!name) continue;

        // 학년 정보
        const grade = extractedGrade !== null ? extractedGrade : 1;

        const studentId = `${grade}-${classNum}-${number}`;

        if (!studentsMap.has(studentId)) {
          studentsMap.set(studentId, {
            id: studentId,
            grade,
            class: classNum,
            number,
            name,
            evaluations: [],
          });
        }

        const student = studentsMap.get(studentId)!;

        // 모든 영역 컬럼에서 점수 읽기
        for (const areaCol of areaColumns) {
          // 점수 찾기: 각 영역 컬럼은 독립적으로 처리
          let score: number | null = null;

          // 해당 영역 컬럼에서만 점수 읽기
          const col = areaCol.col;
          
          if (col >= 0 && col < rawRowData.length) {
            const scoreValue = rawRowData[col] || "";
            const scoreStr = scoreValue.toString().trim();

            // 결시 관련 텍스트 체크
            const absenceKeywords = /인정결|질병결|미인정결|기타결|입학|재입학|편입학|전입학|전출|면제|유예|취학|재취학/i;
            
            // 빈 셀이거나 결시 관련 텍스트면 null
            if (!scoreStr || scoreStr === "" || absenceKeywords.test(scoreStr)) {
              score = null;
              if (import.meta.env.DEV) {
                console.log(
                  `[Parser] Empty or absence reason cell for "${areaCol.areaName}" at col ${col}: "${scoreStr}"`
                );
              }
            } else {
              // 점수 파싱 (숫자만 추출)
              const scoreMatch = scoreStr.match(/^(\d+\.?\d*)$/);
              if (scoreMatch) {
                const parsedScore = parseFloat(scoreMatch[1]);
                // 유효한 점수인지 확인 (0 이상, 만점 이하)
                if (
                  !isNaN(parsedScore) &&
                  parsedScore >= 0 &&
                  parsedScore <= areaCol.maxScore
                ) {
                  score = parsedScore;
                  if (import.meta.env.DEV) {
                    console.log(
                      `[Parser] Found score for "${areaCol.areaName}" at col ${col}: ${score}`
                    );
                  }
                } else {
                  score = null;
                  if (import.meta.env.DEV) {
                    console.log(
                      `[Parser] Invalid score for "${areaCol.areaName}" at col ${col}: ${parsedScore} (max: ${areaCol.maxScore})`
                    );
                  }
                }
              } else {
                score = null;
                if (import.meta.env.DEV) {
                  console.log(
                    `[Parser] Could not parse score for "${areaCol.areaName}" at col ${col}: "${scoreStr}"`
                  );
                }
              }
            }
          } else {
            score = null;
            if (import.meta.env.DEV) {
              console.log(
                `[Parser] Column out of range for "${areaCol.areaName}": col ${col} (max: ${rawRowData.length - 1})`
              );
            }
          }

          // Evaluation 생성
          const evaluation: Evaluation = {
            area: areaCol.areaName,
            score,
            maxScore: areaCol.maxScore,
          };

          // 중복 평가 영역 체크
          const existingIndex = student.evaluations.findIndex(
            (e) => e.area === evaluation.area
          );

          if (existingIndex >= 0) {
            student.evaluations[existingIndex] = evaluation;
          } else {
            student.evaluations.push(evaluation);
          }
        }
      }
    } else {
      // 단일 영역인 경우: 기존 로직 사용
      for (const parsed of parsedRows) {
        const normalized = normalizeRow(parsed);
        if (!normalized) continue;

        const studentId = `${normalized.grade}-${normalized.class}-${normalized.number}`;

        if (!studentsMap.has(studentId)) {
          studentsMap.set(studentId, {
            id: studentId,
            grade: normalized.grade,
            class: normalized.class,
            number: normalized.number,
            name: normalized.name,
            evaluations: [],
          });
        }

        const student = studentsMap.get(studentId)!;

        // 중복 평가 영역 체크
        const existingIndex = student.evaluations.findIndex(
          (e) => e.area === normalized.evaluation.area
        );

        if (existingIndex >= 0) {
          // 기존 평가 영역 업데이트
          student.evaluations[existingIndex] = normalized.evaluation;
        } else {
          student.evaluations.push(normalized.evaluation);
        }
      }
    }

    const students = Array.from(studentsMap.values());

    // 정렬: 학년 -> 반 -> 번호
    students.sort((a, b) => {
      if (a.grade !== b.grade) return a.grade - b.grade;
      if (a.class !== b.class) return a.class - b.class;
      return a.number - b.number;
    });

    // 결과 전송
    self.postMessage({
      success: true,
      students,
      mapping,
      headerRows,
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
