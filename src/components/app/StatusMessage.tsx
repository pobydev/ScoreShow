/**
 * 오류/성공 메시지 표시
 */

import { isSuccessMessage } from "./loadMessages";

export function StatusMessage({ message }: { message: string }) {
  return (
    <div
      className={`px-4 py-3 border rounded-card text-body ${
        isSuccessMessage(message)
          ? "bg-wash border-tint text-accent-ink"
          : "bg-card border-danger text-danger"
      }`}
      role="alert"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
