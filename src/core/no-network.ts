/**
 * 네트워크 요청을 차단하는 유틸리티
 * 외부 전송을 완전히 차단하여 오프라인 전용 앱을 보장합니다.
 */

// fetch 오버라이드
const originalFetch = window.fetch;
window.fetch = function (...args: Parameters<typeof fetch>) {
  // 로컬 리소스는 허용 (blob:, data: 등)
  const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
  if (
    url.startsWith("blob:") ||
    url.startsWith("data:") ||
    url.startsWith("/")
  ) {
    return originalFetch.apply(window, args);
  }
  console.warn("[Network Blocked] fetch request prevented:", url);
  return Promise.reject(
    new Error("Network requests are disabled in offline mode")
  );
};

// XMLHttpRequest 오버라이드
const originalXHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (
  method: string,
  url: string | URL,
  async?: boolean,
  username?: string | null,
  password?: string | null
) {
  const urlStr = typeof url === "string" ? url : url.toString();
  if (
    !urlStr.startsWith("blob:") &&
    !urlStr.startsWith("data:") &&
    !urlStr.startsWith("/")
  ) {
    console.warn("[Network Blocked] XMLHttpRequest prevented:", urlStr);
    throw new Error("Network requests are disabled in offline mode");
  }
  return originalXHROpen.call(
    this,
    method,
    url,
    async ?? true,
    username,
    password
  );
};

// WebSocket 오버라이드
if (typeof WebSocket !== "undefined") {
  const OriginalWebSocket = WebSocket;
  type WebSocketProtocol = string | string[] | undefined;
  (window as typeof window & { WebSocket: typeof WebSocket }).WebSocket =
    class BlockedWebSocket extends OriginalWebSocket {
      constructor(url: string | URL, protocols?: WebSocketProtocol) {
        const urlStr = typeof url === "string" ? url : url.toString();
        if (
          !urlStr.startsWith("ws://localhost") &&
          !urlStr.startsWith("wss://localhost")
        ) {
          console.warn("[Network Blocked] WebSocket prevented:", urlStr);
          throw new Error("WebSocket connections are disabled in offline mode");
        }
        super(url, protocols);
      }
    };
}

if (import.meta.env.DEV) {
  console.log("[Security] Network blocking enabled");
}
