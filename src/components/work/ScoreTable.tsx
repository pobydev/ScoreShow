/**
 * 전체 점수표: 반 전체 점수를 펼쳐 보고 고칩니다.
 * 모든 학생의 점수가 보이므로 점수 수정을 눌렀을 때만 열리고, Esc를 누르면 닫혀 대기 화면으로 갑니다.
 * 점수는 교사가 칸을 고른 뒤 값을 고치고 칸을 벗어나거나 Enter를 누를 때만 바뀝니다.
 * type="number"는 화살표, 휠, 스핀 버튼으로 값이 바뀌므로 쓰지 않습니다.
 * 고친 값은 처음 값과 함께 저장해 표에서만 보여 줍니다. 학생에게 보여 주는 화면은 이 값을 읽지 않습니다.
 */

import { useEffect, useRef, useState } from "react";
import { areaColumns, changedScoreCount } from "../../core/lists";
import type { AreaColumn } from "../../core/lists";
import { useStore } from "../../store/store";
import type { Evaluation, Student } from "../../types";
import { ConfirmDialog } from "../app/ModalDialog";
import { editInputClass, editInputStyle, electronInputProps } from "./electronInputProps";

const NUMBER_TEXT = /^\d*\.?\d*$/;
const RESTORE_BUTTON =
  "flex-shrink-0 min-h-[24px] px-1.5 rounded-input font-semibold text-accent-ink transition-colors hover:bg-wash";

/** 같은 칸의 윗줄이나 아랫줄 칸으로 옮겨 갑니다. 옮겨 갈 칸이 없으면 false입니다. */
function moveToRow(input: HTMLInputElement, step: 1 | -1) {
  const column = input.closest("td")?.cellIndex;
  if (column === undefined) return false;
  const nextRow = (row: Element | null | undefined) =>
    (step === 1 ? row?.nextElementSibling : row?.previousElementSibling) as HTMLTableRowElement | null;
  for (let row = nextRow(input.closest("tr")); row; row = nextRow(row)) {
    const target = row.cells[column]?.querySelector("input");
    if (target) {
      target.focus();
      target.select();
      return true;
    }
  }
  return false;
}

/** 영역 이름은 칸을 벗어날 때 정합니다. 치는 도중에 다른 영역과 이름이 같아져 칸이 합쳐지지 않게 합니다. */
function AreaNameInput({ area, taken }: { area: string; taken: string[] }) {
  const renameArea = useStore((state) => state.renameArea);
  const [draft, setDraft] = useState(area);

  useEffect(() => setDraft(area), [area]);

  const commit = () => {
    const next = draft.trim();
    if (!next || next === area || taken.includes(next)) {
      setDraft(area);
      return;
    }
    void renameArea(area, next);
  };

  return (
    <input
      type="text"
      value={draft}
      aria-label={`${area} 영역 이름`}
      placeholder="평가 영역 이름"
      {...electronInputProps}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        electronInputProps.onKeyDown?.(event);
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className={`${editInputClass} text-small font-semibold min-w-[88px]`}
      style={editInputStyle}
    />
  );
}

/** 만점은 영역 전체에 적용되므로 칸을 벗어날 때 정하고, 지금 점수보다 낮아지면 먼저 묻습니다. */
function MaxScoreInput({ column }: { column: AreaColumn }) {
  const { area, maxScore, originalMaxScore } = column;
  const students = useStore((state) => state.students);
  const setAreaMaxScore = useStore((state) => state.setAreaMaxScore);
  const restoreAreaMaxScore = useStore((state) => state.restoreAreaMaxScore);
  const display = String(maxScore);
  const [draft, setDraft] = useState(display);
  const [problem, setProblem] = useState<string | null>(null);
  const [lowered, setLowered] = useState<{ value: number; over: number } | null>(null);

  useEffect(() => setDraft(display), [display]);

  const commit = () => {
    if (draft === display) return;
    const value = Number(draft);
    if (!draft || !(value > 0)) {
      setDraft(display);
      setProblem(`만점은 0보다 커야 합니다. ${display}점으로 둡니다.`);
      return;
    }
    setProblem(null);
    if (value === maxScore) {
      setDraft(display);
      return;
    }
    const over = students.filter((student) =>
      student.evaluations.some(
        (evaluation) =>
          evaluation.area === area && evaluation.score !== null && evaluation.score > value
      )
    ).length;
    if (over > 0) {
      setLowered({ value, over });
      return;
    }
    void setAreaMaxScore(area, value);
  };

  return (
    <>
      <label className="flex items-center gap-1 font-normal">
        만점
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          aria-label={`${area} 만점`}
          {...electronInputProps}
          onChange={(event) => {
            if (NUMBER_TEXT.test(event.target.value)) setDraft(event.target.value);
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            electronInputProps.onKeyDown?.(event);
            if (event.key === "Enter") {
              // 묻는 창이 뜨면 같은 Enter가 창의 취소 버튼을 누르지 않게 합니다.
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          className={`${editInputClass} text-small w-[64px] tabular-nums ${originalMaxScore === undefined ? "" : "!border-accent"}`}
          style={editInputStyle}
        />
      </label>
      {problem && (
        <p role="alert" className="text-caption text-danger max-w-[180px]">
          {problem}
        </p>
      )}
      {originalMaxScore !== undefined && (
        <div className="flex items-center gap-1 text-caption text-accent-ink whitespace-nowrap">
          <span>수정됨 · 원래 {originalMaxScore}</span>
          <button
            type="button"
            aria-label={`${area} 만점 되돌리기`}
            onClick={() => void restoreAreaMaxScore(area)}
            className={RESTORE_BUTTON}
          >
            되돌리기
          </button>
        </div>
      )}
      {lowered && (
        <ConfirmDialog
          title={`${area} 만점을 ${lowered.value}점으로 낮출까요?`}
          confirmLabel="만점 바꾸기"
          danger
          onCancel={() => {
            setLowered(null);
            setDraft(display);
          }}
          onConfirm={() => {
            setLowered(null);
            void setAreaMaxScore(area, lowered.value);
          }}
        >
          이 영역 전체에 적용됩니다. 학생 {lowered.over}명의 점수가 새 만점보다 큽니다. 점수는 그대로 두고 표에 표시합니다.
        </ConfirmDialog>
      )}
    </>
  );
}

function ScoreInput({
  student,
  evaluation,
  columnMax,
}: {
  student: Student;
  evaluation: Evaluation;
  columnMax: number;
}) {
  const updateEvaluation = useStore((state) => state.updateEvaluation);
  const index = student.evaluations.indexOf(evaluation);
  const { score, maxScore, originalScore } = evaluation;
  const display = score === null ? "" : String(score);
  const [draft, setDraft] = useState(display);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => setDraft(display), [display]);

  /** 저장할 수 없는 값이면 까닭을 돌려줍니다. */
  const problemOf = (text: string) => {
    if (text === "") return null;
    const value = Number(text);
    const kept = score === null ? "미입력으로" : `${score}점으로`;
    if (!Number.isFinite(value)) return `숫자가 아닙니다. ${kept} 둡니다.`;
    if (maxScore > 0 && value > maxScore) return `만점 ${maxScore}점보다 큽니다. ${kept} 둡니다.`;
    return null;
  };

  const commit = () => {
    if (draft === display) return;
    const nextProblem = problemOf(draft);
    setProblem(nextProblem);
    if (nextProblem) {
      setDraft(display);
      return;
    }
    const value = draft === "" ? null : Number(draft);
    if (value === score) {
      setDraft(display);
      return;
    }
    void updateEvaluation(student.id, index, { score: value });
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          placeholder="미입력"
          aria-label={`${student.number}번 ${evaluation.area} 점수`}
          {...electronInputProps}
          onChange={(event) => {
            if (NUMBER_TEXT.test(event.target.value)) {
              setDraft(event.target.value);
              setProblem(null);
            }
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            electronInputProps.onKeyDown?.(event);
            const isUp = event.key === "ArrowUp" || (event.key === "Enter" && event.shiftKey);
            const isDown = event.key === "ArrowDown" || (event.key === "Enter" && !event.shiftKey);
            if (!isUp && !isDown) return;
            event.preventDefault();
            // 저장되지 않는 값이면 그 칸에 남아 까닭을 보여 줍니다. 옮겨 가면 칸을 벗어나며 저장됩니다.
            if (problemOf(draft) || !moveToRow(event.currentTarget, isDown ? 1 : -1)) commit();
          }}
          className={`${editInputClass} text-body w-[72px] tabular-nums ${originalScore === undefined ? "" : "!border-accent"}`}
          style={editInputStyle}
        />
        {/* 같은 영역인데 이 학생만 만점이 다른 경우입니다. */}
        {maxScore !== columnMax && (
          <span className="text-caption text-soft whitespace-nowrap">/ {maxScore}</span>
        )}
      </div>
      {problem && (
        <p role="alert" className="text-caption text-danger max-w-[180px]">
          {problem}
        </p>
      )}
      {!problem && score !== null && maxScore > 0 && score > maxScore && (
        <p className="text-caption text-danger whitespace-nowrap">만점보다 큽니다</p>
      )}
      {originalScore !== undefined && (
        <div className="flex items-center gap-1 text-caption text-accent-ink whitespace-nowrap">
          <span>수정됨 · 원래 {originalScore ?? "미입력"}</span>
          <button
            type="button"
            aria-label={`${student.number}번 ${evaluation.area} 되돌리기`}
            onClick={() => void updateEvaluation(student.id, index, { score: originalScore })}
            className={RESTORE_BUTTON}
          >
            되돌리기
          </button>
        </div>
      )}
    </div>
  );
}

export function ScoreTable({ onClose }: { onClose: () => void }) {
  const students = useStore((state) => state.students);
  const columns = areaColumns(students);
  const changedScores = changedScoreCount(students);
  const changedMaxScores = columns.filter((column) => column.originalMaxScore !== undefined).length;
  const scrollerRef = useRef<HTMLDivElement>(null);

  // 점수 칸이 아니라 표 전체에 포커스를 둡니다. 교사가 칸을 고르기 전에는 어떤 키도 값을 바꾸지 않습니다.
  useEffect(() => {
    scrollerRef.current?.focus({ preventScroll: true });
  }, []);

  if (columns.length === 0) {
    return <p className="m-auto text-body text-soft">평가 데이터가 없습니다.</p>;
  }

  return (
    <div
      className="flex-1 min-w-0 flex flex-col gap-3 px-4 pb-4 md:px-7"
      onKeyDownCapture={(event) => {
        // 만점을 묻는 창이 떠 있으면 Esc는 그 창만 닫습니다.
        if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex-shrink-0 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-caption text-soft">
          칸을 고친 뒤 Enter를 누르거나 다른 칸으로 옮기면 저장됩니다. 수정 마침을 누르면 다시 잠깁니다. Esc를 누르면 입력 중인 값은 저장하지 않고 표를 닫아 대기 화면으로 갑니다.
        </p>
        {(changedScores > 0 || changedMaxScores > 0) && (
          <p role="status" className="text-small font-semibold text-accent-ink whitespace-nowrap">
            {changedScores > 0 && `수정한 점수 ${changedScores}개`}
            {changedScores > 0 && changedMaxScores > 0 && " · "}
            {changedMaxScores > 0 && `수정한 만점 ${changedMaxScores}개`}
          </p>
        )}
      </div>
      <div
        ref={scrollerRef}
        tabIndex={-1}
        role="region"
        aria-label="전체 점수표"
        className="flex-1 min-h-0 overflow-auto rounded-card bg-card shadow-card outline-none"
      >
        <table className="score-table w-full border-collapse text-left text-small">
          <thead>
            <tr>
              <th scope="col" className="w-[64px]">번호</th>
              <th scope="col" className="min-w-[96px]">이름</th>
              {columns.map((column, index) => (
                <th key={index} scope="col">
                  <div className="flex flex-col gap-1.5">
                    <AreaNameInput
                      area={column.area}
                      taken={columns.map((item) => item.area).filter((area) => area !== column.area)}
                    />
                    <MaxScoreInput column={column} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td className="text-soft tabular-nums whitespace-nowrap">{student.number}</td>
                <td className="text-ink font-semibold whitespace-nowrap">{student.name}</td>
                {columns.map((column, index) => {
                  const evaluation = student.evaluations.find((item) => item.area === column.area);
                  return (
                    <td key={index}>
                      {evaluation ? (
                        <ScoreInput
                          student={student}
                          evaluation={evaluation}
                          columnMax={column.maxScore}
                        />
                      ) : (
                        <span className="text-soft">없음</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
