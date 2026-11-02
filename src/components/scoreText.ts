import type { Evaluation } from "../types";

/** "8 / 10" 또는 점수가 없으면 "미입력" */
export function formatScore(evaluation: Evaluation): string {
  return evaluation.score === null
    ? '미입력'
    : `${evaluation.score} / ${evaluation.maxScore}`;
}

/**
 * 글자 폭을 글자 크기(em) 단위로 어림합니다. 점수 카드가 글자 크기를 정할 때 씁니다.
 * 실제보다 조금 넓게 잡아 카드 안에서 줄이 바뀌거나 넘치지 않게 합니다.
 */
export function textWidthEm(text: string): number {
  let em = 0;
  for (const char of text) {
    if (char === " ") em += 0.28;
    else if (/[0-9]/.test(char)) em += 0.62;
    else if (/[A-Za-z]/.test(char)) em += 0.68;
    else if (char.charCodeAt(0) < 128) em += 0.44;
    else em += 0.92;
  }
  return Math.max(em, 1);
}
