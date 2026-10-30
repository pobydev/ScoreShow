/**
 * 화면에서 함께 쓰는 버튼 모양
 * 채운 버튼은 primaryButton 하나뿐입니다 (brand/DESIGN.md).
 */

const BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-button min-h-[38px] px-4 text-body font-semibold transition-colors disabled:opacity-50";

export const primaryButton = `${BUTTON} bg-accent text-white hover:bg-accent-hover`;

export const secondaryButton = `${BUTTON} border border-hairline bg-card text-ink hover:bg-wash hover:border-ring`;

const LINK =
  "rounded-input px-1.5 py-1 text-small underline underline-offset-2 transition-colors hover:bg-surface-hover";

export const linkButton = `${LINK} text-accent-ink`;

export const dangerLinkButton = `${LINK} text-danger`;
