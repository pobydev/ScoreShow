import { useCallback, useEffect, useRef, useState } from "react";

export type Fullscreen = ReturnType<typeof useFullscreen>;

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  // 앱이 직접 해제한 것과 Esc로 풀린 것을 구분합니다.
  const isExitingByApp = useRef(false);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error("Failed to enter fullscreen:", err);
      }
    } else {
      try {
        isExitingByApp.current = true;
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error("Failed to exit fullscreen:", err);
      }
    }
  }, []);

  // 전체화면 변경 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return { isFullscreen, toggleFullscreen, isExitingByApp };
}
