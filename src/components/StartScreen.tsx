/**
 * 파일을 올리기 전 시작 화면
 * 큰 놓는 칸과, 나이스에서 받는 방법, 표준 서식, 저장 위치 안내
 */

import { useState } from "react";
import type { ReactNode } from "react";
import { AppBrand } from "./app/AppBrand";
import type { FileUpload } from "./app/useFileUpload";
import { linkButton, primaryButton } from "./buttonStyles";
import { UploadIcon } from "./icons";

export function StartScreen({
  appVersion,
  status,
  upload,
  onOpenGuide,
}: {
  appVersion: string | null;
  status: ReactNode;
  upload: FileUpload;
  onOpenGuide: () => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <header className="flex-shrink-0 min-h-[60px] flex items-center justify-between gap-3 px-5 py-2 bg-card border-b border-line">
        <AppBrand appVersion={appVersion} />
        <button type="button" onClick={onOpenGuide} className={linkButton}>
          사용 안내
        </button>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col gap-4 p-4 md:p-6">
        {status}
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
            <span className="flex items-center justify-center h-12 w-12 rounded-card bg-tint text-accent-ink mb-1">
              <UploadIcon className="w-6 h-6" aria-hidden="true" />
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

          <aside className="flex flex-col gap-3.5">
            <details open className="rounded-card bg-card shadow-card p-4">
              <summary className="font-bold text-ink cursor-pointer">나이스에서 받는 방법</summary>
              <ol className="mt-3 pl-[18px] list-decimal text-small text-soft leading-relaxed">
                <li>교과담임 → 수행평가조회/통계 → 수행평가조회</li>
                <li>교과목별일람표조회 또는 강의실별일람표조회</li>
                <li>조회 후 저장 아이콘을 눌러 xls로 받기</li>
              </ol>
            </details>
            <p className="text-small text-soft">
              영역이 하나만 읽히면{" "}
              <button type="button" onClick={upload.downloadTemplate} className={linkButton}>
                표준 서식 받기
              </button>
            </p>
            <p className="text-small text-soft">점수는 인터넷으로 보내지 않고 이 컴퓨터에만 저장합니다.</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
