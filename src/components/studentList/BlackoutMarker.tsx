/**
 * 대기 화면일 때 어느 두 학생 사이인지 보여 주는 막대
 * 줄 사이에 끼우되 줄 간격 안에 들어가게 해서 목록이 움직이지 않습니다.
 * 막대가 목록 가운데에 오도록 하는 스크롤은 useScrollSelectedIntoView가 합니다.
 */

export function BlackoutMarker() {
  return (
    <li aria-label="대기 위치" className="relative h-0 -my-0.5 scroll-my-2">
      <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 h-0.5 rounded-full bg-brand" />
      <div className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-brand" />
    </li>
  );
}
