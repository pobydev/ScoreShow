import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { loadedMessage } from "../../src/components/app/loadMessages";
import { StatusMessage } from "../../src/components/app/StatusMessage";

const render = (message: string) =>
  renderToStaticMarkup(createElement(StatusMessage, { message }));

describe("StatusMessage", () => {
  it("[C-02] 학생을 불러온 메시지는 빨간색이 아니라 성공 색이다", () => {
    const html = render(loadedMessage(30));
    expect(html).toContain("30");
    expect(html).toContain("text-accent-ink");
    expect(html).not.toContain("text-danger");
  });

  it("[Q-25] 확인이 필요한 점수의 건수와 학생 번호를 함께 보여 준다", () => {
    const message = loadedMessage(30, [
      { class: 1, number: 3 },
      { class: 1, number: 3 },
      { class: 1, number: 12 },
    ]);
    expect(message).toContain("확인이 필요한 점수 3건: 3번, 12번");
    expect(render(message)).toContain("text-accent-ink");
  });

  it("[Q-25] 반이 여럿이면 반도 함께 보여 준다", () => {
    expect(
      loadedMessage(30, [
        { class: 1, number: 3 },
        { class: 2, number: 3 },
      ])
    ).toContain("확인이 필요한 점수 2건: 1반 3번, 2반 3번");
  });

  it("[Q-25] 학생이 많으면 앞의 10명만 적고 나머지는 수로 줄인다", () => {
    const issues = Array.from({ length: 12 }, (_, i) => ({ class: 1, number: i + 1 }));
    expect(loadedMessage(30, issues)).toContain("10번 외 2명");
  });

  it("실패 메시지는 빨간색이다", () => {
    const html = render("파일을 읽지 못했습니다.");
    expect(html).toContain("text-danger");
    expect(html).not.toContain("text-accent-ink");
  });
});
