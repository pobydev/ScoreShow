/**
 * 파일 불러오기 결과 문구
 * 색만으로 구분하지 않도록 성공 문구 앞에 기호를 붙이고, StatusMessage는 이 기호로 색을 정합니다.
 */

const SUCCESS_MARK = "✓";

export function loadedMessage(count: number) {
  return `${SUCCESS_MARK} 학생 ${count}명을 불러왔습니다.`;
}

export function isSuccessMessage(message: string) {
  return message.startsWith(SUCCESS_MARK);
}
