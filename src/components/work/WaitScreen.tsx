/**
 * 대기 화면: 점수를 가리고 두 학생 사이에서 기다립니다.
 * 이름은 보이지 않고 버튼에 번호만 나옵니다.
 */

import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import hourglass from "../../assets/wait-hourglass.png";
import { studentNumberText, waitNeighbors } from "../../core/waitFlow";
import { useStore } from "../../store/store";
import { primaryButton, secondaryButton } from "../buttonStyles";

export function WaitScreen() {
  const { students, waitGap, showAbove, showBelow } = useStore();
  const { above, below } = waitNeighbors(students, waitGap);

  return (
    <div className="m-auto flex flex-col items-center gap-3 px-8 text-center">
      {/* 모두 끝났을 때는 더 기다리는 것이 아니므로 그림을 넣지 않습니다. */}
      {below && <img src={hourglass} alt="" className="h-32 w-32 mb-1" />}
      <p className="text-3xl md:text-4xl font-bold text-ink">
        {below ? "대기 중입니다" : "모든 학생을 보여 주었습니다"}
      </p>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {above && (
          <button type="button" className={below ? secondaryButton : primaryButton} onClick={showAbove}>
            <ArrowLeft size={16} aria-hidden="true" />
            {studentNumberText(above, students)} 점수 보기
          </button>
        )}
        {below && (
          <button type="button" className={primaryButton} onClick={showBelow}>
            <ArrowRight size={16} aria-hidden="true" />
            {studentNumberText(below, students)} 점수 보기
          </button>
        )}
      </div>
    </div>
  );
}
