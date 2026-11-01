/**
 * 화면에서 함께 쓰는 버튼 모양
 * 채운 버튼은 primaryButton 하나뿐입니다 (brand/DESIGN.md).
 */

const BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-button min-h-[38px] px-4 text-body font-semibold transition-all active:scale-[.97] disabled:opacity-50";

export const primaryButton = `${BUTTON} bg-accent text-white hover:bg-accent-hover`;

export const secondaryButton = `${BUTTON} border border-hairline bg-card text-ink hover:bg-wash hover:border-ring`;

/** 위험한 버튼은 채우지 않습니다. */
export const dangerButton = `${BUTTON} border border-danger bg-card text-danger hover:bg-danger-wash`;

export const quietButton = `${BUTTON} text-soft hover:bg-surface-hover`;

/** 사이드바 맨 아래의 아이콘 달린 글자 버튼 */
const SIDE_LINK =
  "flex items-center gap-2 rounded-input px-2 py-1.5 text-body transition-colors disabled:opacity-50";

export const sideLink = `${SIDE_LINK} text-soft hover:bg-surface-hover hover:text-ink`;

export const dangerSideLink = `${SIDE_LINK} text-danger hover:bg-danger-wash`;
