/**
 * 앱 안의 창
 * 브라우저 기본 dialog를 써서 포커스 가두기와 Esc 닫기를 그대로 받습니다.
 */

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { dangerButton, primaryButton, quietButton } from "../buttonStyles";

export function ModalDialog({
  labelledBy,
  widthClass = "w-[440px]",
  onClose,
  children,
}: {
  labelledBy: string;
  widthClass?: string;
  onClose: () => void;
  children: ReactNode;
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
      aria-labelledby={labelledBy}
      onCancel={onClose}
      onClick={(event) => {
        // 창 바깥(배경)을 누르면 target이 dialog 자신입니다.
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
      className={`rounded-window bg-card text-ink shadow-lift ${widthClass} max-w-[calc(100vw-32px)] max-h-[calc(100vh-32px)]`}
    >
      {children}
    </dialog>
  );
}

/** 할지 말지 묻는 작은 창. 삭제처럼 위험한 일이면 danger를 줍니다. */
export function ConfirmDialog({
  title,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  return (
    <ModalDialog labelledBy="confirm-title" onClose={onCancel}>
      <div className="flex flex-col gap-3 p-6">
        <h3 id="confirm-title" className="text-title-sm font-semibold">
          {title}
        </h3>
        <div className="text-body text-soft">{children}</div>
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={quietButton}>
            취소
          </button>
          <button type="button" onClick={onConfirm} className={danger ? dangerButton : primaryButton}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
