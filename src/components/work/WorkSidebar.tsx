/**
 * 목록을 연 뒤의 왼쪽 사이드바: 로고, 지금 연 목록, 검색, 학생 목록, 사용 가이드, 이 목록 삭제
 * 넓은 창에서는 자리를 차지하고, 좁은 창에서는 점수 위에 펼쳐집니다.
 */

import { ArrowRight, CaretLeft, CaretRight, Question, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { useStore } from "../../store/store";
import { AppBrand } from "../app/AppBrand";
import { ConfirmDialog } from "../app/ModalDialog";
import type { FileUpload } from "../app/useFileUpload";
import { dangerSideLink, sideLink } from "../buttonStyles";
import { StudentList } from "../StudentList";
import { ListSwitcher } from "./ListSwitcher";

export function WorkSidebar({
  isExpanded,
  onExpandedChange,
  upload,
  onOpenGuide,
}: {
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  upload: FileUpload;
  onOpenGuide: () => void;
}) {
  const activeListId = useStore((state) => state.activeListId);
  const deleteLists = useStore((state) => state.deleteLists);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isExpanded) {
    return (
      <button
        onClick={() => onExpandedChange(true)}
        className="flex-shrink-0 w-8 border-r border-line bg-card text-soft flex items-center justify-center transition-colors hover:bg-surface-hover hover:text-ink"
        aria-label="목록 펼치기"
        type="button"
      >
        <CaretRight size={18} />
      </button>
    );
  }

  return (
    <aside className="absolute md:relative z-10 inset-y-0 left-0 flex-shrink-0 w-[240px] border-r border-line bg-card flex flex-col gap-3 pt-[29px] pb-3 px-4 [@media(max-height:680px)]:pt-3">
      <button
        onClick={() => onExpandedChange(false)}
        className="absolute top-1.5 right-1.5 p-1 rounded-input text-soft transition-colors hover:bg-surface-hover hover:text-ink"
        aria-label="목록 접기"
        type="button"
      >
        <CaretLeft size={16} />
      </button>
      <div className="ml-1 mb-4 [@media(max-height:680px)]:mb-0">
        <AppBrand />
      </div>

      <ListSwitcher upload={upload} />

      <div className="flex-1 min-h-0">
        <StudentList />
      </div>

      <div className="flex-shrink-0 flex flex-col gap-0.5 border-t border-line pt-2">
        <button type="button" onClick={onOpenGuide} className={sideLink}>
          <Question size={16} />
          스코어쇼 사용 가이드
          <ArrowRight size={14} className="ml-auto" />
        </button>
        <button type="button" onClick={() => setIsDeleting(true)} className={dangerSideLink}>
          <Trash size={16} />이 목록 삭제
        </button>
      </div>

      {isDeleting && activeListId && (
        <ConfirmDialog
          title="이 목록을 지울까요?"
          confirmLabel="삭제"
          danger
          onCancel={() => setIsDeleting(false)}
          onConfirm={() => {
            setIsDeleting(false);
            void deleteLists([activeListId]);
          }}
        >
          이 반의 점수가 지워지고 되돌릴 수 없습니다. 점수를 수정한 내용도 함께 사라집니다.
        </ConfirmDialog>
      )}
    </aside>
  );
}
