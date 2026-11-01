/**
 * 사이드바의 지금 연 목록. 누르면 다른 목록으로 옮기거나 새 파일을 넣거나 처음 화면으로 갑니다.
 */

import { CaretDown, GraduationCap, House, UploadSimple } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { isReadable } from "../../core/lists";
import { useStore } from "../../store/store";
import type { FileUpload } from "../app/useFileUpload";

const MENU_ITEM =
  "flex w-full items-center gap-2 rounded-input px-2.5 py-2 text-left text-small text-ink transition-colors hover:bg-wash";

export function ListSwitcher({ upload }: { upload: FileUpload }) {
  const { lists, activeListId, students, openList, closeList } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const readable = lists.filter(isReadable);
  const active = readable.find((list) => list.id === activeListId);

  useEffect(() => {
    if (!isOpen) return;
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // 메뉴만 닫습니다. 대기 화면 전환은 일어나지 않게 합니다.
        event.stopPropagation();
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative flex-shrink-0">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title={active?.name}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center gap-2 rounded-card border border-tint bg-wash py-2.5 pl-2.5 pr-2 text-left transition-colors hover:border-ring"
      >
        <span className="flex-shrink-0 w-[30px] h-[34px] grid place-items-center rounded-button bg-tint text-accent">
          <GraduationCap size={17} />
        </span>
        <span className="flex-1 min-w-0">
          <strong className="block truncate text-body font-semibold text-ink">{active?.name}</strong>
          <small className="block text-caption text-soft">{students.length}명</small>
        </span>
        <CaretDown size={14} className="flex-shrink-0 text-soft" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute z-20 left-0 right-0 mt-1 max-h-[60vh] overflow-y-auto rounded-button bg-card shadow-lift border border-line p-1.5"
        >
          {readable.map((list) => (
            <button
              key={list.id}
              type="button"
              role="menuitem"
              title={list.name}
              aria-current={list.id === activeListId || undefined}
              className={`${MENU_ITEM} ${list.id === activeListId ? "bg-wash font-semibold" : ""}`}
              onClick={() => {
                if (list.id !== activeListId) openList(list.id);
                setIsOpen(false);
              }}
            >
              <span className="min-w-0 truncate">{list.name}</span>
            </button>
          ))}
          <div className="my-1 h-px bg-line" />
          <button
            type="button"
            role="menuitem"
            className={MENU_ITEM}
            disabled={upload.isProcessing}
            onClick={() => {
              setIsOpen(false);
              upload.openFilePicker();
            }}
          >
            <UploadSimple size={15} className="flex-shrink-0 text-soft" />
            새 파일 넣기
          </button>
          <button
            type="button"
            role="menuitem"
            className={MENU_ITEM}
            onClick={() => {
              setIsOpen(false);
              closeList();
            }}
          >
            <House size={15} className="flex-shrink-0 text-soft" />
            저장 목록으로
          </button>
        </div>
      )}
    </div>
  );
}
