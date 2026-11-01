/**
 * 저장한 지 30일이 지난 목록을 지울지 묻는 안내
 * 자동으로 지우지 않습니다. 나중에를 누르면 7일 뒤에 다시 묻습니다.
 */

import { useState } from "react";
import { STALE_SNOOZE_MS, staleLists } from "../../core/lists";
import { useStore } from "../../store/store";
import { ConfirmDialog } from "../app/ModalDialog";
import { quietButton, secondaryButton } from "../buttonStyles";

const SNOOZE_KEY = "scoreshow-stale-snooze-until";

function readSnooze(): number {
  try {
    return Number(window.localStorage.getItem(SNOOZE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeSnooze(until: number) {
  try {
    window.localStorage.setItem(SNOOZE_KEY, String(until));
  } catch {
    // 저장하지 못하면 다음에 켤 때 다시 묻습니다.
  }
}

export function StaleListsNotice({ now }: { now: number }) {
  const lists = useStore((state) => state.lists);
  const deleteLists = useStore((state) => state.deleteLists);
  const [snoozedUntil, setSnoozedUntil] = useState(readSnooze);
  const [isConfirming, setIsConfirming] = useState(false);

  const stale = staleLists(lists, now);
  if (stale.length === 0 || snoozedUntil > now) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-card shadow-card px-4 py-3" role="status">
      <p className="text-body text-ink">저장한 지 30일이 지난 점수 {stale.length}개가 있습니다. 지울까요?</p>
      <div className="flex gap-2">
        <button
          type="button"
          className={quietButton}
          onClick={() => {
            const until = now + STALE_SNOOZE_MS;
            writeSnooze(until);
            setSnoozedUntil(until);
          }}
        >
          나중에
        </button>
        <button type="button" className={secondaryButton} onClick={() => setIsConfirming(true)}>
          지우기
        </button>
      </div>

      {isConfirming && (
        <ConfirmDialog
          title="오래된 점수를 지울까요?"
          confirmLabel="삭제"
          danger
          onCancel={() => setIsConfirming(false)}
          onConfirm={() => {
            setIsConfirming(false);
            void deleteLists(stale.map((list) => list.id));
          }}
        >
          {stale.map((list) => list.name).join(", ")}을(를) 지웁니다. 되돌릴 수 없습니다.
        </ConfirmDialog>
      )}
    </div>
  );
}
