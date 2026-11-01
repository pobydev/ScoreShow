/**
 * 편집 입력칸에 공통으로 주는 속성
 * Electron에서 클릭해도 포커스가 잡히지 않거나 키 입력이 전파되는 문제를 막습니다.
 */

import type { CSSProperties, InputHTMLAttributes, KeyboardEvent, MouseEvent, SyntheticEvent } from "react";

// Electron에서 클릭 시 포커스를 강제로 주기
function focusOnPointer(e: MouseEvent<HTMLInputElement>) {
  e.stopPropagation();
  e.currentTarget.focus();
}

// Electron에서 키보드 이벤트가 전파되지 않도록 방지
function stopKeyEvent(e: KeyboardEvent<HTMLInputElement>) {
  e.stopPropagation();
  if (e.nativeEvent) {
    e.nativeEvent.stopImmediatePropagation();
  }
}

function stopEvent(e: SyntheticEvent<HTMLInputElement>) {
  e.stopPropagation();
}

export const electronInputProps: InputHTMLAttributes<HTMLInputElement> = {
  onMouseDown: focusOnPointer,
  onClick: focusOnPointer,
  onKeyDown: stopKeyEvent,
  onKeyPress: stopKeyEvent,
  onKeyUp: stopKeyEvent,
  onFocus: stopEvent,
  onInput: stopEvent,
  autoComplete: "off",
  tabIndex: 0,
  autoFocus: false,
  readOnly: false,
};

export const editInputStyle: CSSProperties = {
  pointerEvents: 'auto',
  zIndex: 1,
};

export const editInputClass =
  "w-full bg-card text-ink border border-control rounded-input px-2 py-1";
