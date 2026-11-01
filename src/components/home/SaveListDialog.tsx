/**
 * 파일을 읽은 뒤 이름을 정해 저장하는 창
 * 같은 이름이 있을 때만 내용을 비교합니다. 같으면 그 목록을 열고, 다르면 덮어쓸지 묻습니다.
 */

import { useState } from "react";
import type { FormEvent } from "react";
import { differenceText, diffStudents, findListByName, isSameContent, normalizeListName } from "../../core/lists";
import type { StudentsDifference } from "../../core/lists";
import { useStore } from "../../store/store";
import type { PendingUpload } from "../app/useFileUpload";
import { ConfirmDialog, ModalDialog } from "../app/ModalDialog";
import { primaryButton, quietButton } from "../buttonStyles";

export function SaveListDialog({
  pending,
  onClose,
}: {
  pending: PendingUpload;
  onClose: () => void;
}) {
  const { lists, saveList, openList, setError } = useStore();
  const [name, setName] = useState(pending.suggestedName);
  const [difference, setDifference] = useState<StudentsDifference | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  const save = async () => {
    try {
      await saveList(name, pending.students);
      onClose();
      setError(pending.message, pending.messageDurationMs);
    } catch {
      setDifference(null);
      setSaveFailed(true);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!normalizeListName(name)) return;

    const existing = findListByName(lists, name);
    if (!existing) {
      void save();
      return;
    }
    const nextDifference = diffStudents(existing.students, pending.students);
    if (isSameContent(nextDifference)) {
      openList(existing.id);
      onClose();
      setError("✓ 이미 저장되어 있습니다.");
    } else {
      setDifference(nextDifference);
    }
  };

  if (difference) {
    return (
      <ConfirmDialog
        title="같은 이름의 목록이 있습니다"
        confirmLabel="덮어쓰기"
        danger
        onConfirm={() => void save()}
        onCancel={() => setDifference(null)}
      >
        {differenceText(difference)} 덮어쓰면 점수 수정 내용도 사라집니다. 취소하면 이름을 바꿀 수 있습니다.
      </ConfirmDialog>
    );
  }

  return (
    <ModalDialog labelledBy="save-list-title" onClose={onClose}>
      <form className="flex flex-col gap-3 p-6" onSubmit={submit}>
        <h3 id="save-list-title" className="text-title-sm font-semibold">
          이름을 정해 저장해 주세요
        </h3>
        <p className="text-body text-soft">학생 {pending.students.length}명을 읽었습니다.</p>
        <label className="flex flex-col gap-1 text-caption font-semibold text-soft">
          목록 이름
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            autoComplete="off"
            maxLength={60}
            className="h-10 px-3 text-body font-normal text-ink bg-card border border-control rounded-input"
          />
        </label>
        {saveFailed && (
          <p className="text-small text-danger" role="alert">
            저장하지 못했습니다. 다시 시도해 주세요.
          </p>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={quietButton}>
            취소
          </button>
          <button type="submit" disabled={!normalizeListName(name)} className={primaryButton}>
            저장
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
