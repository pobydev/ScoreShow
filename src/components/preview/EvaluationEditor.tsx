/**
 * 편집 모드의 평가 카드 내용: 영역 이름, 점수, 만점 입력칸
 */

import type { InputHTMLAttributes, Ref } from "react";
import type { Evaluation } from "../../types";
import { editInputClass, editInputStyle, electronInputProps } from "./electronInputProps";

function NumberField({
  label,
  ...inputProps
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-caption font-semibold text-soft">
        {label}
      </label>
      <input
        type="number"
        {...inputProps}
        {...electronInputProps}
        className={`${editInputClass} text-body`}
        style={editInputStyle}
      />
    </div>
  );
}

export function EvaluationEditor({
  evaluation,
  areaInputRef,
  onUpdate,
}: {
  evaluation: Evaluation;
  areaInputRef?: Ref<HTMLInputElement>;
  onUpdate: (updates: Partial<Evaluation>) => void;
}) {
  return (
    <div className="space-y-2">
      <input
        ref={areaInputRef}
        type="text"
        value={evaluation.area}
        onChange={(event) => {
          event.stopPropagation();
          onUpdate({ area: event.target.value });
        }}
        {...electronInputProps}
        className={`${editInputClass} text-small font-semibold`}
        style={editInputStyle}
        placeholder="평가 영역 이름"
      />
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="점수"
          step="0.5"
          min={0}
          value={evaluation.score ?? ""}
          onChange={(event) => {
            event.stopPropagation();
            const value = event.target.value;
            if (value === "") {
              onUpdate({ score: null });
              return;
            }
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
              onUpdate({ score: parsed });
            }
          }}
        />
        <NumberField
          label="만점"
          min={1}
          value={evaluation.maxScore}
          onChange={(event) => {
            event.stopPropagation();
            const value = event.target.value;
            if (value === "") {
              return;
            }
            const parsed = Number(value);
            if (Number.isFinite(parsed) && parsed > 0) {
              onUpdate({ maxScore: parsed });
            }
          }}
        />
      </div>
    </div>
  );
}
