/**
 * made by gnilab 표시 (brand/DESIGN.md 앱 안 표기)
 * 학생에게 보이는 발표 화면에는 넣지 않습니다. 아직 눌러도 동작이 없습니다.
 */

import gnilabLogo from "../../assets/gnilab.svg";

export function MadeBy() {
  return (
    <p className="flex items-center gap-[5px] text-caption text-soft" data-made-by="true">
      <span>made by</span>
      <img src={gnilabLogo} alt="gnilab" className="h-4 w-auto" />
    </p>
  );
}
