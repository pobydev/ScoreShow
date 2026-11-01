/**
 * 앱 아이콘, 이름, 슬로건. 사이드바 위쪽에 놓습니다 (brand/DESIGN.md).
 */

import icon from "../../assets/scoreshow-128.png";

export const SLOGAN = ["수행평가 점수 확인,", "한 명씩 손쉽고 안전하게"] as const;

export function AppBrand() {
  return (
    <div className="flex items-center gap-[11px] min-w-0">
      <img src={icon} alt="" className="h-[45px] w-[45px] flex-shrink-0" />
      <div className="min-w-0">
        <strong className="block text-title leading-none font-bold text-ink whitespace-nowrap">
          스코어쇼
          <span className="ml-[7px] text-caption font-normal text-soft">ScoreShow</span>
        </strong>
        <small className="slogan block mt-1.5 text-caption leading-[1.55] text-soft whitespace-nowrap">
          <span className="block">“{SLOGAN[0]}</span>
          <span className="block">{SLOGAN[1]}”</span>
        </small>
      </div>
    </div>
  );
}
