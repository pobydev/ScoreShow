/**
 * made by gnilab 표시 (brand/DESIGN.md 앱 안 표기)
 * 학생에게 보이는 발표 화면에는 넣지 않습니다.
 * 누르면 기본 브라우저로 gnilab.kr을 엽니다. 새 창은 electron/main.cjs가 막고 이 주소만 밖으로 넘깁니다.
 */

import gnilabLogo from "../../assets/gnilab.svg";

export function MadeBy() {
  return (
    <a
      href="https://gnilab.kr"
      target="_blank"
      rel="noreferrer"
      title="gnilab.kr 열기"
      className="flex items-center gap-[5px] rounded-sm text-caption text-soft no-underline"
      data-made-by="true"
    >
      <span>made by</span>
      <img src={gnilabLogo} alt="gnilab" className="h-4 w-auto" />
    </a>
  );
}
