/**
 * 파일 불러오기 결과 문구
 * StatusMessage는 "✅"로 시작하는 문구를 성공 색으로 보여 줍니다.
 */

export function loadedMessage(count: number) {
  return `✅ Loaded ${count} students successfully.`;
}
