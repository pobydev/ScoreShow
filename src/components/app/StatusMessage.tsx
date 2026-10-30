/**
 * 오류/성공 메시지 표시
 */

export function StatusMessage({ message }: { message: string }) {
  return (
    <div
      className={`mb-4 p-4 border rounded-lg ${
        message.startsWith("✅")
          ? "bg-green-50 border-green-200 text-green-700"
          : "bg-red-50 border-red-200 text-red-700"
      }`}
      role="alert"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
