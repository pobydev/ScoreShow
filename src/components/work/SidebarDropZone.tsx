/**
 * 점수 화면에서 새 파일을 넣는 칸 (사이드바 아래)
 * 평소에는 작게 두어 여기에 넣으면 된다는 것만 알리고, 파일을 끌고 오는 동안에는 학생 목록 자리까지 넓힙니다.
 * 누르면 파일 선택 창이 열립니다. 점수를 수정하는 동안에는 받지 않습니다.
 * 높이 680px 이하의 낮은 창에서는 학생 목록 자리를 지키려고 평소에는 숨기고, 끌고 올 때만 보입니다.
 */

import { UploadSimple } from "@phosphor-icons/react";
import { useFileDropTarget } from "../app/useFileDrop";
import type { FileUpload } from "../app/useFileUpload";

export function SidebarDropZone({
  upload,
  isDraggingFiles,
  isEditMode,
}: {
  upload: FileUpload;
  isDraggingFiles: boolean;
  isEditMode: boolean;
}) {
  const drop = useFileDropTarget(upload, !isEditMode);
  const isLarge = isDraggingFiles && !isEditMode;

  if (isEditMode) {
    return (
      <div className="flex-shrink-0 flex items-center gap-2.5 rounded-card border-2 border-dashed border-line px-3 py-2.5 text-small text-soft [@media(max-height:680px)]:hidden">
        <UploadSimple size={18} className="flex-shrink-0" aria-hidden="true" />
        점수 수정 중에는 파일을 넣을 수 없습니다.
      </div>
    );
  }

  const frame = drop.isOver
    ? "border-solid border-brand bg-wash"
    : isLarge
      ? "border-dashed border-ring bg-wash"
      : "border-dashed border-hairline bg-card hover:border-ring hover:bg-wash";

  return (
    <button
      type="button"
      {...drop.props}
      onClick={upload.openFilePicker}
      disabled={upload.isProcessing}
      aria-label="파일이나 폴더를 여기에 놓기. 누르면 파일 선택"
      className={`rounded-card border-2 text-left transition-colors ${frame} ${
        isLarge
          ? "flex-1 min-h-0 flex flex-col items-center justify-center gap-3 p-4 text-center"
          : "flex-shrink-0 flex items-center gap-2.5 px-3 py-2.5 [@media(max-height:680px)]:hidden"
      }`}
    >
      <span
        className={`flex-shrink-0 grid place-items-center rounded-button bg-tint text-accent-ink ${
          isLarge ? "h-12 w-12" : "h-8 w-8"
        }`}
      >
        <UploadSimple size={isLarge ? 26 : 17} weight="duotone" aria-hidden="true" />
      </span>
      {isLarge ? (
        <span className="text-emph font-semibold text-ink">
          여기에 놓으면
          <br />
          새 목록으로 저장합니다
        </span>
      ) : (
        <span className="min-w-0">
          <span className="block text-small font-semibold text-ink">파일·폴더를 여기에 놓기</span>
          <span className="block text-caption text-soft">누르면 파일 선택</span>
        </span>
      )}
    </button>
  );
}
