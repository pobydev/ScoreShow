/**
 * 엑셀 파일 업로드 컴포넌트
 */

import { useRef, useState } from "react";
import { useStore } from "../store/store";
import type { ColumnMapping } from "../types";

export function FilePicker() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { setLoading, setError, setStudents, setMapping } = useStore();

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
    ];

    if (
      !validTypes.includes(file.type) &&
      !file.name.match(/\.(xlsx|xls|csv)$/i)
    ) {
      setError("지원되는 파일 형식: .xlsx, .xls, .csv");
      return;
    }

    setIsProcessing(true);
    setLoading(true);
    setError(null);

    try {
      // Web Worker로 파싱
      const worker = new Worker(
        new URL("../core/parseExcel.worker.ts", import.meta.url),
        { type: "module" }
      );

      worker.postMessage({ file });

      worker.onmessage = async (e) => {
        const { success, students, mapping, error } = e.data as {
          success: boolean;
          students: Parameters<typeof setStudents>[0];
          mapping: ColumnMapping | null;
          error?: string;
        };

        if (success) {
          // setStudents가 자동으로 IndexedDB에 저장함
          await setStudents(students);
          setMapping(mapping ?? null);
          // 성공 피드백 표시
          setError(
            `✅ ${students.length}명의 학생 데이터가 성공적으로 로드되었습니다.`
          );
          setTimeout(() => {
            setError(null);
          }, 3000);
          if (import.meta.env.DEV) {
            console.log("Parsed students:", students.length);
          }
        } else {
          setError(error || "파일 파싱 중 오류가 발생했습니다.");
        }

        setIsProcessing(false);
        setLoading(false);
        worker.terminate();
      };

      worker.onerror = (error) => {
        setError(`파일 처리 중 오류: ${error.message}`);
        setIsProcessing(false);
        setLoading(false);
        worker.terminate();
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : "알 수 없는 오류");
      setIsProcessing(false);
      setLoading(false);
    }

    // 입력 초기화 (같은 파일 다시 선택 가능)
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      // public 폴더의 템플릿 파일을 그대로 다운로드
      const response = await fetch('/ScoreShow_Template.xlsx');
      if (!response.ok) {
        throw new Error('템플릿 파일을 찾을 수 없습니다.');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ScoreShow_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('템플릿 다운로드 실패:', error);
      setError('템플릿 다운로드 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="rounded-lg shadow p-4" style={{ backgroundColor: 'var(--card)' }}>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
          엑셀 파일:
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          disabled={isProcessing}
          className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold disabled:opacity-50"
          style={{ 
            color: 'var(--muted-foreground)',
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              const fileButton = e.currentTarget.nextElementSibling as HTMLElement;
              if (fileButton) {
                fileButton.style.backgroundColor = 'var(--accent)';
              }
            }
          }}
          aria-label="엑셀 파일 선택"
        />
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="text-sm font-semibold inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 transition-colors"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-foreground)',
          }}
        >
          📄 표준 서식 다운로드
        </button>
        {isProcessing && (
          <div className="flex items-center gap-2" style={{ color: 'var(--primary)' }}>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
            <span className="text-xs">처리 중...</span>
          </div>
        )}
      </div>
    </div>
  );
}
