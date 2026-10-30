/**
 * 사용 안내 창: 데이터 안전성, 나이스에서 받는 방법, 표준 서식, 점수 수정
 * 브라우저 기본 dialog를 써서 포커스 가두기와 Esc 닫기를 그대로 받습니다.
 */

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { primaryButton, secondaryButton } from "../buttonStyles";
import { CloseIcon } from "../icons";
import { MadeBy } from "./MadeBy";

const STRONG = "font-semibold text-ink";

export function GuideDialog({
  status,
  onDownloadTemplate,
  onClose,
}: {
  status: ReactNode;
  onDownloadTemplate: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="guide-title"
      onCancel={onClose}
      onClick={(event) => {
        // 창 바깥(배경)을 누르면 target이 dialog 자신입니다.
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
      className="rounded-window bg-card text-ink shadow-lift w-[640px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)]"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 id="guide-title" className="text-title-sm font-bold">
            사용 안내
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`${secondaryButton} !px-2`}
            aria-label="사용 안내 닫기"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {status}

        <section className="text-small text-soft flex flex-col gap-1">
          <h3 className="text-body font-semibold text-ink">데이터 안전성</h3>
          <p>
            업로드한 엑셀 파일의 모든 데이터는 <strong className={STRONG}>이 컴퓨터에만 저장</strong>되며, 인터넷으로
            전송되지 않습니다. 서버나 클라우드에 저장되지 않아{" "}
            <strong className={STRONG}>개인정보가 안전하게 보호</strong>됩니다.
          </p>
          <p>
            사용을 완료한 후에는 <strong className={STRONG}>데이터 삭제 버튼</strong>을 눌러 모든 데이터를 삭제하세요.
          </p>
        </section>

        <section className="text-small text-soft flex flex-col gap-1">
          <h3 className="text-body font-semibold text-ink">엑셀 파일 다운로드 방법</h3>
          <p>
            나이스(neis)에서 다음 경로로 이동한 후, 조회 버튼을 누르고 디스켓 모양 아이콘을 눌러{" "}
            <strong className={STRONG}>xls 방식</strong>으로 다운로드한 엑셀 파일을 업로드하세요:
          </p>
          <ul className="ml-4 list-disc">
            <li>교과담임 → 수행평가조회/통계 → 수행평가조회 → 교과목별일람표조회-강의실별</li>
            <li>교과담임 → 수행평가조회/통계 → 수행평가조회 → 강의실별일람표조회-전체영역</li>
          </ul>
        </section>

        <section className="rounded-card bg-wash p-4 text-small text-soft flex flex-col items-start gap-3">
          <p>
            <strong className={STRONG}>
              나이스 엑셀을 업로드했을 때 여러 평가 영역이 하나만 인식될 때는 표준 엑셀서식을 받아 점수를 붙여넣어
              업로드하면 모든 영역이 안정적으로 인식됩니다.
            </strong>
          </p>
          <button type="button" onClick={onDownloadTemplate} className={primaryButton}>
            표준 서식 받기
          </button>
        </section>

        <section className="text-small text-soft flex flex-col gap-1">
          <h3 className="text-body font-semibold text-ink">점수 수정</h3>
          <p>
            업로드한 점수를 직접 수정하고 싶으시면 학생 제목 오른쪽의 <strong className={STRONG}>점수 수정</strong>{" "}
            버튼을 클릭하세요.
          </p>
        </section>

        <MadeBy />
      </div>
    </dialog>
  );
}
