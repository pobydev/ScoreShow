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
