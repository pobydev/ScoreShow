/**
 * 미리보기 패널 상단의 발표 시작, 데이터 삭제 버튼
 */

import { useStore } from "../../store/store";
import { TrashIcon, VideoIcon } from "../icons";

export function StartPresenterButton() {
  return (
    <button
      onClick={() => useStore.getState().setPresenterMode(true)}
      className="px-6 py-2 bg-accent text-white text-small font-semibold rounded-button transition-colors hover:bg-accent-hover flex items-center gap-2"
      aria-label="발표 모드 시작"
    >
      <VideoIcon className="w-4 h-4" />
      <span>발표 모드 시작</span>
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
      className="px-5 py-2 bg-card border border-hairline text-danger text-small font-semibold rounded-button transition-colors hover:bg-surface-hover hover:border-danger flex items-center gap-2"
      aria-label="모든 데이터 삭제"
    >
      <TrashIcon className="w-4 h-4" />
      <span>데이터 삭제</span>
    </button>
  );
}
