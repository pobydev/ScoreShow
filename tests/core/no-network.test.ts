import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const TEMPLATE_URL =
  "https://raw.githubusercontent.com/pobydev/ScoreShow/main/public/ScoreShow_Template.xlsx";

const originalFetch = vi.fn(async () => "허용됨");
const originalOpen = vi.fn();
const socketUrls: string[] = [];

class FakeSocket {
  constructor(url: string | URL) {
    socketUrls.push(url.toString());
  }
}

class FakeXhr {
  open(...args: unknown[]) {
    originalOpen(...args);
  }
}

type StubWindow = {
  fetch: (input: unknown) => Promise<unknown>;
  WebSocket: new (url: string | URL) => unknown;
};
const stubWindow = { fetch: originalFetch } as unknown as StubWindow;

beforeAll(async () => {
  vi.stubGlobal("window", stubWindow);
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
  vi.stubGlobal("WebSocket", FakeSocket);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  await import("../../src/core/no-network");
});

beforeEach(() => {
  originalFetch.mockClear();
  originalOpen.mockClear();
  socketUrls.length = 0;
});

describe("fetch 차단", () => {
  it.each(["https://example.com/a", "http://localhost:5173/a", "./a.json", "a.json"])(
    "%s는 원본 fetch를 부르지 않고 거부한다",
    async (url) => {
      await expect(stubWindow.fetch(url)).rejects.toThrow("Network requests are disabled");
      expect(originalFetch).not.toHaveBeenCalled();
    }
  );

  it.each(["blob:abc", "data:text/plain,a", "/local.json", TEMPLATE_URL])(
    "%s는 통과시킨다",
    async (url) => {
      await expect(stubWindow.fetch(url)).resolves.toBe("허용됨");
    }
  );

  it("같은 저장소의 다른 파일은 거부한다", async () => {
    await expect(
      stubWindow.fetch("https://raw.githubusercontent.com/pobydev/ScoreShow/main/README.md")
    ).rejects.toThrow();
  });

  it("Request 객체도 주소로 판단한다", async () => {
    await expect(stubWindow.fetch({ url: "https://example.com/a" })).rejects.toThrow(
      "Network requests are disabled"
    );
  });

  it("[Q-32] 슬래시 두 개로 시작하는 외부 주소를 통과시킨다", async () => {
    await expect(stubWindow.fetch("//example.com/a")).resolves.toBe("허용됨");
  });

  it("[Q-32] URL 객체를 주면 거부 대신 TypeError를 던진다", () => {
    expect(() => stubWindow.fetch(new URL("https://example.com/a"))).toThrow(TypeError);
    expect(originalFetch).not.toHaveBeenCalled();
  });

  it("[Q-32] 템플릿 주소를 외부 요청으로 허용한다", async () => {
    await stubWindow.fetch(TEMPLATE_URL);
    expect(originalFetch).toHaveBeenCalledWith(TEMPLATE_URL);
  });
});

describe("XMLHttpRequest 차단", () => {
  it("외부 주소는 예외를 던진다", () => {
    expect(() => new XMLHttpRequest().open("GET", "https://example.com/a")).toThrow(
      "Network requests are disabled"
    );
    expect(originalOpen).not.toHaveBeenCalled();
  });

  it("로컬 주소는 통과시킨다", () => {
    new XMLHttpRequest().open("GET", "/local.json");
    expect(originalOpen).toHaveBeenCalledTimes(1);
  });

  it("[Q-32] fetch에서 허용하는 템플릿 주소를 XHR은 막는다", () => {
    expect(() => new XMLHttpRequest().open("GET", TEMPLATE_URL)).toThrow();
  });
});

describe("WebSocket 차단", () => {
  it("외부 주소는 예외를 던진다", () => {
    expect(() => new stubWindow.WebSocket("wss://example.com")).toThrow(
      "WebSocket connections are disabled"
    );
    expect(socketUrls).toEqual([]);
  });

  it("localhost는 통과시킨다", () => {
    new stubWindow.WebSocket("ws://localhost:5173");
    expect(socketUrls).toEqual(["ws://localhost:5173"]);
  });

  it("[Q-32] localhost로 시작하는 다른 호스트를 통과시킨다", () => {
    new stubWindow.WebSocket("ws://localhost.example.com");
    expect(socketUrls).toEqual(["ws://localhost.example.com"]);
  });
});
