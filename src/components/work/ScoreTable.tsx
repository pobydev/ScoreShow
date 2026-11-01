/**
 * 전체 점수표: 반 전체 점수를 펼쳐 보고 바로 고칩니다.
 * 모든 학생의 점수가 보이므로 점수 수정을 눌렀을 때만 열리고, Esc를 누르면 닫혀 대기 화면으로 갑니다.
 */

import { useEffect, useRef, useState } from "react";
import { areaColumns } from "../../core/lists";
import { useStore } from "../../store/store";
import type { Evaluation, Student } from "../../types";
import { editInputClass, editInputStyle, electronInputProps } from "./electronInputProps";

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

function MaxScoreInput({ area, maxScore }: { area: string; maxScore: number }) {
  const setAreaMaxScore = useStore((state) => state.setAreaMaxScore);

  return (
    <label className="flex items-center gap-1 font-normal">
      만점
      <input
        type="number"
        min={1}
        value={maxScore}
        aria-label={`${area} 만점`}
        {...electronInputProps}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (event.target.value !== "" && Number.isFinite(parsed) && parsed > 0) {
            void setAreaMaxScore(area, parsed);
          }
        }}
        className={`${editInputClass} text-small w-[64px]`}
        style={editInputStyle}
      />
    </label>
  );
}

function ScoreInput({
  student,
  evaluation,
  columnMax,
  inputRef,
}: {
  student: Student;
  evaluation: Evaluation;
  columnMax: number;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const updateEvaluation = useStore((state) => state.updateEvaluation);
  const index = student.evaluations.indexOf(evaluation);

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="number"
        step="0.5"
        min={0}
        value={evaluation.score ?? ""}
        placeholder="미입력"
        aria-label={`${student.number}번 ${evaluation.area} 점수`}
        {...electronInputProps}
        onChange={(event) => {
          const { value } = event.target;
          if (value === "") {
            void updateEvaluation(student.id, index, { score: null });
            return;
          }
          const parsed = Number(value);
          if (Number.isFinite(parsed)) {
            void updateEvaluation(student.id, index, { score: parsed });
          }
        }}
        className={`${editInputClass} text-body w-[72px] tabular-nums`}
        style={editInputStyle}
      />
      {/* 같은 영역인데 이 학생만 만점이 다른 경우입니다. */}
      {evaluation.maxScore !== columnMax && (
        <span className="text-caption text-soft whitespace-nowrap">/ {evaluation.maxScore}</span>
      )}
    </div>
  );
}

export function ScoreTable({ onClose }: { onClose: () => void }) {
  const students = useStore((state) => state.students);
  const columns = areaColumns(students);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  if (columns.length === 0) {
    return <p className="m-auto text-body text-soft">평가 데이터가 없습니다.</p>;
  }

  const firstEditable = students.find((student) => student.evaluations.length > 0);

  return (
    <div
      className="flex-1 min-w-0 flex flex-col gap-3 px-4 pb-4 md:px-7"
      onKeyDownCapture={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <p className="flex-shrink-0 text-caption text-soft">
        고친 내용은 자동으로 저장됩니다. 수정 마침을 누르면 다시 잠깁니다. Esc를 누르면 바로 표를 닫고 대기 화면으로 갑니다.
      </p>
      <div className="flex-1 min-h-0 overflow-auto rounded-card bg-card shadow-card">
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
                    <MaxScoreInput area={column.area} maxScore={column.maxScore} />
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
                  const isFirst =
                    student === firstEditable && evaluation === student.evaluations[0];
                  return (
                    <td key={index}>
                      {evaluation ? (
                        <ScoreInput
                          student={student}
                          evaluation={evaluation}
                          columnMax={column.maxScore}
                          inputRef={isFirst ? firstInputRef : undefined}
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
