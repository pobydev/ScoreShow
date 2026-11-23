/**
 * 파일 여러 개를 읽은 뒤 한꺼번에 저장하는 창
 * 이름은 미리 채우고, 줄마다 새 목록인지, 이미 있는지, 같은 이름의 다른 목록이 있는지 보여 줍니다.
 * 같은 이름의 다른 목록은 교사가 체크할 때만 덮어씁니다.
 * 학생에게 보이는 화면이라 이름과 점수는 넣지 않고 목록 이름과 학생 수만 적습니다.
 */

import { WarningCircle } from "@phosphor-icons/react";
import { useState } from "react";
import type { FormEvent } from "react";
import { canSave, rowStates, savesByDefault } from "../../core/batch";
import type { RowState } from "../../core/batch";
import { normalizeListName } from "../../core/lists";
import { useStore } from "../../store/store";
import { successMessage } from "../app/loadMessages";
import { ModalDialog } from "../app/ModalDialog";
import type { BatchItem, BatchUpload } from "../app/useFileUpload";
import { primaryButton, quietButton } from "../buttonStyles";

type ReadItem = Extract<BatchItem, { kind: "read" }>;

function stateText(state: RowState, checked: boolean) {
  switch (state.kind) {
    case "new":
      return "새 목록";
    case "same":
      return "이미 저장되어 있어 건너뜁니다.";
    case "conflict":
      return checked
        ? `같은 이름의 목록을 덮어씁니다. ${state.summary}`
        : `같은 이름의 목록이 있습니다. ${state.summary} 체크하면 덮어씁니다.`;
    case "duplicate":
      return "위 줄과 이름이 같습니다. 이름을 바꿔 주세요.";
    case "empty":
      return "이름을 적어 주세요.";
  }
}

export function BatchSaveDialog({ batch, onClose }: { batch: BatchUpload; onClose: () => void }) {
  const { lists, saveLists, setError } = useStore();
  const readItems = batch.items.filter((item): item is ReadItem => item.kind === "read");
  const [names, setNames] = useState(() => readItems.map((item) => item.suggestedName));
  // 교사가 체크를 바꾼 줄만 적어 둡니다. 나머지는 줄 상태로 정합니다.
  const [checkedOverride, setCheckedOverride] = useState<(boolean | undefined)[]>(() => readItems.map(() => undefined));
  const [isSaving, setIsSaving] = useState(false);

  const states = rowStates(
    readItems.map((item, index) => ({ name: names[index], students: item.students })),
    lists
  );
  const checked = states.map((state, index) =>
    state.kind === "same" ? false : checkedOverride[index] ?? savesByDefault(state)
  );
  const toSave = readItems.map((_, index) => index).filter((index) => checked[index]);
  const blocked = toSave.some((index) => !canSave(states[index]));
  const overwrites = toSave.some((index) => states[index].kind === "conflict");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (blocked || toSave.length === 0 || isSaving) return;
    setIsSaving(true);
    const entries = toSave.map((index) => ({
      name: normalizeListName(names[index]),
      students: readItems[index].students,
    }));
    const saved = await saveLists(entries);
    onClose();
    if (saved === entries.length) {
      setError(successMessage(`목록 ${saved}개를 저장했습니다.`), 4000);
    } else {
      setError(`목록 ${entries.length}개 가운데 ${saved}개만 저장했습니다. 저장하지 못한 파일을 다시 넣어 주세요.`, 8000);
    }
  };

  const title =
    readItems.length > 0 ? `파일 ${batch.items.length}개를 읽었습니다` : "파일을 읽지 못했습니다";

  return (
    <ModalDialog labelledBy="batch-save-title" widthClass="w-[640px]" onClose={onClose}>
      <form className="flex flex-col gap-3 p-6 max-h-[calc(100vh-32px)]" onSubmit={submit}>
        <h3 id="batch-save-title" className="text-title-sm font-semibold">
          {title}
        </h3>
        {readItems.length > 0 && (
          <p className="text-body text-soft">
            목록 이름은 파일을 보고 채웠습니다. 고칠 수 있고, 체크를 풀면 그 파일은 저장하지 않습니다.
          </p>
        )}

        <ul className="min-h-0 overflow-y-auto flex flex-col gap-2 -mx-1 px-1" aria-label="읽은 파일">
          {readItems.map((item, index) => {
            const state = states[index];
            const isChecked = checked[index];
            const isProblem = isChecked && (!canSave(state) || state.kind === "conflict");
            return (
              <li
                key={`${item.fileName}-${index}`}
                className="grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1 rounded-card border border-line p-3"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={state.kind === "same"}
                  onChange={(event) => {
                    const next = [...checkedOverride];
                    next[index] = event.target.checked;
                    setCheckedOverride(next);
                  }}
                  aria-label={`${item.fileName} 저장`}
                  className="mt-3 h-4 w-4 accent-[var(--accent)]"
                />
                <div className="min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={names[index]}
                      onChange={(event) => {
                        const next = [...names];
                        next[index] = event.target.value;
                        setNames(next);
                      }}
                      onFocus={(event) => event.currentTarget.select()}
                      aria-label={`${item.fileName} 목록 이름`}
                      autoComplete="off"
                      maxLength={60}
                      className="h-10 flex-1 min-w-0 px-3 text-body text-ink bg-card border border-control rounded-input"
                    />
                    <span className="flex-shrink-0 text-small text-soft">{item.students.length}명</span>
                  </div>
                  <p className="text-caption text-soft truncate" title={item.fileName}>
                    {item.fileName}
                  </p>
                  <p className={`text-small ${isProblem ? "text-danger" : "text-soft"}`}>
                    {stateText(state, isChecked)}
                  </p>
                  {item.warning && <p className="text-small text-ink">{item.warning}</p>}
                </div>
              </li>
            );
          })}

          {batch.items.map(
            (item, index) =>
              item.kind === "failed" && (
                <li
                  key={`${item.fileName}-failed-${index}`}
                  className="flex items-start gap-3 rounded-card border border-line bg-canvas p-3"
                >
                  <WarningCircle size={18} className="mt-0.5 flex-shrink-0 text-danger" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-body text-ink truncate" title={item.fileName}>
                      {item.fileName}
                    </p>
                    <p className="text-small text-danger">{item.reason} 이 파일은 빠집니다.</p>
                  </div>
                </li>
              )
          )}
        </ul>

        {batch.skippedInFolders > 0 && (
          <p className="text-small text-soft">폴더 안의 엑셀이 아닌 파일 {batch.skippedInFolders}개는 뺐습니다.</p>
        )}
        {overwrites && (
          <p className="text-small text-danger">덮어쓰는 목록은 점수를 수정한 내용도 사라집니다.</p>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={quietButton}>
            {readItems.length > 0 ? "취소" : "닫기"}
          </button>
          {readItems.length > 0 && (
            <button
              type="submit"
              disabled={blocked || toSave.length === 0 || isSaving}
              className={primaryButton}
            >
              {toSave.length > 0 ? `${toSave.length}개 저장` : "저장"}
            </button>
          )}
        </div>
      </form>
    </ModalDialog>
  );
}
