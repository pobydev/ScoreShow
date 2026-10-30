/**
 * 파일을 올린 뒤 왼쪽 사이드바: 로고, 파일, 검색, 학생 목록, 사용 안내, 데이터 삭제
 */

import { useStore } from "../store/store";
import { AppBrand } from "./app/AppBrand";
import type { FileUpload } from "./app/useFileUpload";
import { dangerLinkButton, linkButton } from "./buttonStyles";
import { StudentList } from "./StudentList";

function DeleteDataButton() {
  const clearAllData = useStore((state) => state.clearAllData);

  return (
    <button
      type="button"
      onClick={async () => {
        if (confirm("모든 데이터를 삭제하시겠습니까?")) {
          await clearAllData();
        }
      }}
      className={dangerLinkButton}
      aria-label="모든 데이터 삭제"
    >
      데이터 삭제
    </button>
  );
}

export function Sidebar({
  appVersion,
  upload,
  onOpenGuide,
}: {
  appVersion: string | null;
  upload: FileUpload;
  onOpenGuide: () => void;
}) {
  const studentCount = useStore((state) => state.students.length);

  return (
    <aside className="flex-shrink-0 w-full md:w-[280px] md:h-full flex flex-col gap-2.5 p-4 bg-card border-b md:border-b-0 md:border-r border-line">
      <AppBrand appVersion={appVersion} />

      <button
        type="button"
        onClick={upload.openFilePicker}
        disabled={upload.isProcessing}
        title={upload.fileName ?? undefined}
        className="flex-shrink-0 grid gap-0.5 rounded-button bg-wash px-3 py-2.5 text-left transition-colors hover:bg-tint disabled:opacity-50"
      >
        <span className="truncate text-small font-semibold text-ink">{upload.fileName ?? "저장된 점수"}</span>
        <span className="text-caption text-soft">{studentCount}명, 다른 파일 열기</span>
      </button>

      <div className="flex-shrink-0 h-[40vh] md:flex-1 md:min-h-0 md:h-auto">
        <StudentList />
      </div>

      <div className="flex-shrink-0 flex items-center justify-between border-t border-line pt-2">
        <button type="button" onClick={onOpenGuide} className={linkButton}>
          사용 안내
        </button>
        <DeleteDataButton />
      </div>
    </aside>
  );
}
