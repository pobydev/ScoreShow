/**
 * 발표 모드에서 화이트아웃 중일 때 어느 학생 사이를 전환하는지 보여 주는 표시
 */

export function BlackoutMarker({ label }: { label: string }) {
  return (
    <li
      aria-label={label}
      className="flex items-center justify-center my-0 py-0"
      style={{ lineHeight: 0, padding: 0 }}
    >
      <div
        className="relative w-5/6 h-0.5 rounded-full border opacity-60 flex items-center justify-center"
        style={{
          backgroundColor: 'var(--primary)',
          borderColor: 'var(--ring)'
        }}
      >
        <span
          className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs select-none leading-none"
          style={{ color: 'var(--primary)' }}
        >
          ▲
        </span>
        <span
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs select-none leading-none"
          style={{ color: 'var(--primary)' }}
        >
          ▼
        </span>
      </div>
    </li>
  );
}
