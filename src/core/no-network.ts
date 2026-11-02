/**
 * 네트워크 요청을 차단하는 유틸리티
 * 학생 정보를 다루는 화면 쪽 코드가 외부로 요청을 보내지 못하게 막습니다.
 * 새 버전 확인은 화면 밖의 electron/updater.cjs가 따로 합니다.
 */

// 앱 안의 자원만 허용합니다. "//"나 "/\"로 시작하면 외부 주소입니다.
function isLocalUrl(url: string): boolean {
  return url.startsWith("blob:") || url.startsWith("data:") || /^\/(?![/\\])/.test(url);
}

// fetch 오버라이드
const originalFetch = window.fetch;
window.fetch = function (...args: Parameters<typeof fetch>) {
  // 로컬 리소스는 허용 (blob:, data: 등)
  const target = args[0];
  const url =
    typeof target === "string"
      ? target
      : target instanceof URL
        ? target.href
        : (target as Request).url;
  if (isLocalUrl(url)) {
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
  if (!isLocalUrl(urlStr)) {
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
        if (!/^wss?:\/\/localhost(?::\d+)?(?:[/?#]|$)/.test(urlStr)) {
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
