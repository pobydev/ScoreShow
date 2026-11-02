/**
 * 저장 목록 카드 (어울림의 학급 카드와 같은 모양)
 * 이름, 학생 수, 저장한 날만 보이고 점수는 고른 뒤에야 보입니다.
 */

import { GraduationCap, Trash, WarningCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { isReadable, savedDateText, staleLists } from "../../core/lists";
import { useStore } from "../../store/store";
import type { StoredList } from "../../types";
import { ConfirmDialog } from "../app/ModalDialog";

const CARD = "group flex items-center gap-0.5 rounded-card border border-transparent transition-colors hover:bg-surface-hover";
const CARD_ICON = "flex-shrink-0 w-[30px] h-[34px] grid place-items-center rounded-button";

export function SavedLists({ now }: { now: number }) {
  const { lists, openList, deleteLists, clearAllData } = useStore();
  const [deleting, setDeleting] = useState<StoredList | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  if (lists.length === 0) {
    return <p className="px-2 text-small text-soft">아직 저장한 점수가 없습니다.</p>;
  }

  const staleIds = new Set(staleLists(lists, now).map((list) => list.id));
  const nameOf = (list: StoredList) => (isReadable(list) ? list.name : "읽을 수 없는 자료");

  return (
    <>
      <ul className="min-h-0 overflow-y-auto flex flex-col gap-1" aria-label="저장 목록">
        {lists.map((list) => (
          <li key={list.id} className={CARD}>
            {isReadable(list) ? (
              <button
                type="button"
                onClick={() => openList(list.id)}
                className="flex flex-1 min-w-0 items-center gap-2 py-2.5 pl-2.5 pr-1 text-left"
              >
                <span className={`${CARD_ICON} bg-tint text-accent`}>
                  <GraduationCap size={17} />
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-body font-semibold text-ink" title={list.name}>
                    {list.name}
                  </strong>
                  <small className="block truncate text-caption text-soft">
                    {list.students.length}명 · {savedDateText(list.savedAt)}
                    {staleIds.has(list.id) && " · 30일 지남"}
                  </small>
                </span>
              </button>
            ) : (
              <div className="flex flex-1 min-w-0 items-center gap-2 py-2.5 pl-2.5 pr-1">
                <span className={`${CARD_ICON} bg-surface-hover text-soft`}>
                  <WarningCircle size={17} />
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-body font-semibold text-ink">읽을 수 없는 자료</strong>
                  <small className="block truncate text-caption text-soft">지우고 파일을 다시 넣어 주세요</small>
                </span>
              </div>
            )}
            <button
              type="button"
              aria-label={`${nameOf(list)} 삭제`}
              title="삭제"
              onClick={() => setDeleting(list)}
              className="flex-shrink-0 mr-1.5 w-7 h-8 grid place-items-center rounded-input text-soft transition-colors hover:bg-danger-wash hover:text-danger"
            >
              <Trash size={15} />
            </button>
          </li>
        ))}
      </ul>

      {/* 목록 칸 밖에 두어 목록이 길어 스크롤되어도 늘 보입니다. 하나뿐이면 줄의 휴지통과 같은 일이라 숨깁니다. */}
      {lists.length >= 2 && (
        <button
          type="button"
          onClick={() => setIsClearing(true)}
          className="flex-shrink-0 self-start min-h-[32px] px-2.5 rounded-input text-caption text-soft transition-colors hover:text-danger"
        >
          모두 지우기
        </button>
      )}

      {deleting && (
        <ConfirmDialog
          title="이 목록을 지울까요?"
          confirmLabel="삭제"
          danger
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            const { id } = deleting;
            setDeleting(null);
            void deleteLists([id]);
          }}
        >
          {nameOf(deleting)}을(를) 지웁니다. 되돌릴 수 없습니다.
        </ConfirmDialog>
      )}

      {isClearing && (
        <ConfirmDialog
          title={`저장한 목록 ${lists.length}개를 모두 지울까요?`}
          confirmLabel="모두 지우기"
          danger
          onCancel={() => setIsClearing(false)}
          onConfirm={() => {
            setIsClearing(false);
            void clearAllData();
          }}
        >
          목록과 점수가 모두 지워지고 되돌릴 수 없습니다.
        </ConfirmDialog>
      )}
    </>
  );
}
