/**
 * Web Worker 진입점: 파일을 받아 parser/의 읽기 결과를 돌려줍니다.
 */

import type { ColumnMapping } from "../types";
import { parseWorkbook } from "./parser/parseWorkbook";

self.onmessage = async function (
  e: MessageEvent<{ file: File; mapping?: ColumnMapping }>
) {
  const { file, mapping } = e.data;

  try {
    self.postMessage(parseWorkbook(await file.arrayBuffer(), mapping));
  } catch {
    self.postMessage({
      success: false,
      error: "파일을 처리하지 못했습니다. 기존 데이터는 그대로 유지됩니다.",
    });
  }
};
