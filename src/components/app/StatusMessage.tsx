/**
 * 오류/성공 메시지 표시
 */

export function StatusMessage({ message }: { message: string }) {
  return (
    <div
      className={`mb-4 px-4 py-3 border rounded-card text-body ${
        message.startsWith("✅")
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
