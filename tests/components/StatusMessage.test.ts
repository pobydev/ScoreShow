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

  it("실패 메시지는 빨간색이다", () => {
    const html = render("파일을 읽지 못했습니다.");
    expect(html).toContain("text-danger");
    expect(html).not.toContain("text-accent-ink");
  });
});
