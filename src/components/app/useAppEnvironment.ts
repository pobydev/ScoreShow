import { useEffect, useState } from "react";

/** Electron 환경에서 버전 정보 가져오기 */
export function useAppVersion(): string | null {
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI?.getVersion) {
      const version = window.electronAPI.getVersion();
      setAppVersion(version);
    }
  }, []);

  return appVersion;
}

/** 놓는 칸 밖에 파일을 놓아도 창이 그 파일로 넘어가지 않게 막습니다. */
export function useBlockStrayFileDrop() {
  useEffect(() => {
    const block = (event: DragEvent) => {
      // 놓는 칸이 먼저 처리했으면 그대로 둡니다.
      if (event.defaultPrevented) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "none";
      }
    };
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);
}

/** 오프라인 상태 표시 */
export function useOfflineLog() {
  useEffect(() => {
    const updateOnlineStatus = () => {
      if (!navigator.onLine && import.meta.env.DEV) {
        console.log("[App] Running in offline mode");
      }
    };
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);
}
