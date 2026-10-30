/**
 * 미리보기 패널 상단의 발표 시작, 데이터 삭제 버튼
 */

import { useStore } from "../../store/store";
import { TrashIcon, VideoIcon } from "../icons";

export function StartPresenterButton() {
  return (
    <button
      onClick={() => useStore.getState().setPresenterMode(true)}
      className="group relative px-6 py-2.5 text-[var(--primary-foreground)] text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 overflow-hidden"
      style={{
        backgroundColor: 'var(--primary)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '0.9';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1';
      }}
      aria-label="발표 모드 시작"
    >
      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></span>
      <VideoIcon className="w-4 h-4" />
      <span className="relative z-10">발표 모드 시작</span>
    </button>
  );
}

export function DeleteDataButton() {
  const clearAllData = useStore((state) => state.clearAllData);

  return (
    <button
      onClick={async () => {
        if (confirm("모든 데이터를 삭제하시겠습니까?")) {
          await clearAllData();
        }
      }}
      className="group px-5 py-2.5 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-red-50 hover:border-red-300 transition-all duration-200 flex items-center gap-2"
      aria-label="모든 데이터 삭제"
    >
      <TrashIcon className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" />
      <span>데이터 삭제</span>
    </button>
  );
}
