/**
 * 앱을 켰을 때의 화면
 * 왼쪽은 저장 목록, 오른쪽은 파일 넣는 칸입니다. 어느 목록을 고르기 전에는 점수가 보이지 않습니다.
 */

import { ArrowRight, Question, Trash, UploadSimple } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AppBrand } from "../app/AppBrand";
import { ConfirmDialog } from "../app/ModalDialog";
import { ExternalDisplayNotice } from "../app/ExternalDisplayNotice";
import type { FileUpload } from "../app/useFileUpload";
import { dangerSideLink, primaryButton, sideLink } from "../buttonStyles";
import { privacyNote } from "../../core/updates";
import { useStore } from "../../store/store";
import { SavedLists } from "./SavedLists";
import { StaleListsNotice } from "./StaleListsNotice";

export function HomeScreen({
  status,
  upload,
  updateNotice,
  canCheckUpdates,
  onOpenGuide,
}: {
  status: ReactNode;
  upload: FileUpload;
  updateNotice: ReactNode;
  canCheckUpdates: boolean;
  onOpenGuide: () => void;
}) {
  const lists = useStore((state) => state.lists);
  const clearAllData = useStore((state) => state.clearAllData);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const now = useMemo(() => Date.now(), []);

  return (
    <div className="h-full flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
      <aside className="flex-shrink-0 w-full md:w-[240px] md:h-full flex flex-col gap-3 pt-[29px] pb-3 px-4 bg-card border-b md:border-b-0 md:border-r border-line">
        <div className="ml-1 mb-4">
          <AppBrand />
        </div>
        <div className="flex-1 min-h-0 flex flex-col gap-2">
          <div className="section-label">SAVED LISTS</div>
          <SavedLists now={now} />
        </div>
        <div className="flex-shrink-0 flex flex-col gap-0.5 border-t border-line pt-2">
          {updateNotice}
          <button type="button" onClick={onOpenGuide} className={sideLink}>
            <Question size={16} />
            스코어쇼 사용 가이드
            <ArrowRight size={14} className="ml-auto" />
          </button>
          {lists.length > 0 && (
            <button type="button" onClick={() => setIsClearing(true)} className={dangerSideLink}>
              <Trash size={16} />
              모두 삭제
            </button>
          )}
        </div>
      </aside>

      <main className="surface-glow flex-1 min-w-0 md:overflow-y-auto flex flex-col gap-4 p-4 md:p-7">
        {status}
        <ExternalDisplayNotice />
        <StaleListsNotice now={now} />
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-5">
          <section
            data-dropzone="true"
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
              setIsDragOver(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setIsDragOver(false);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragOver(false);
              const file = event.dataTransfer.files[0];
              if (file) {
                upload.handleFile(file);
              }
            }}
            className={`min-h-[240px] rounded-window border-2 flex flex-col items-center justify-center gap-2 p-6 text-center transition-colors ${
              isDragOver ? "border-solid border-brand bg-wash" : "border-dashed border-hairline bg-card"
            }`}
          >
            <span className="flex items-center justify-center h-14 w-14 rounded-card bg-tint text-accent-ink mb-1">
              <UploadSimple size={30} weight="duotone" aria-hidden="true" />
            </span>
            <p className="text-title font-bold text-ink">나이스 점수 파일을 여기에 놓아 주세요</p>
            <p className="text-body text-soft mb-3">xls, xlsx 파일을 쓸 수 있습니다.</p>
            <button
              type="button"
              onClick={upload.openFilePicker}
              disabled={upload.isProcessing}
              className={`${primaryButton} !min-h-[50px] !px-7 !text-emph`}
            >
              파일 선택
            </button>
          </section>

          <aside className="flex flex-col gap-3.5" aria-label="시작 안내">
            <div className="rounded-card bg-wash border border-tint p-4 text-small text-accent-ink">
              <strong className="block text-body font-semibold mb-1">점수를 열기 전에</strong>
              TV와 프로젝터를 끄거나 연결을 해제해 주세요.
            </div>
            <div className="rounded-card bg-card shadow-card p-4">
              <h2 className="text-body font-bold text-ink">나이스에서 받는 방법</h2>
              <ol className="mt-3 pl-[18px] list-decimal text-body text-ink leading-relaxed">
                <li>교과담임 → 수행평가조회/통계 → 수행평가조회</li>
                <li>교과목별일람표조회-강의실별 또는 강의실별일람표조회-전체영역</li>
                <li>조회 후 저장 아이콘을 눌러 xls로 받기</li>
              </ol>
            </div>
            <p className="text-small text-soft">{privacyNote(canCheckUpdates)}</p>
          </aside>
        </div>
      </main>

      {isClearing && (
        <ConfirmDialog
          title="저장된 점수를 모두 지울까요?"
          confirmLabel="모두 삭제"
          danger
          onCancel={() => setIsClearing(false)}
          onConfirm={() => {
            setIsClearing(false);
            void clearAllData();
          }}
        >
          저장 목록 {lists.length}개가 모두 지워지고 되돌릴 수 없습니다.
        </ConfirmDialog>
      )}
    </div>
  );
}
