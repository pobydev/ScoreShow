/**
 * Spreadsheet upload component.
 */

import { useRef, useState } from "react";
import { useStore } from "../store/store";
import type { ColumnMapping } from "../types";
import type { ScoreIssue } from "../core/normalize";
import { TEMPLATE_DOWNLOAD_URLS, TEMPLATE_FILE_NAME } from "../core/template";
import { loadedMessage, uploadRejection } from "./app/loadMessages";

export function FilePicker() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { setLoading, setError, setStudents, setMapping } = useStore();
  const hasStudents = useStore((state) => state.students.length > 0);

  const fetchTemplateFromWeb = async (): Promise<Blob> => {
    for (const templateUrl of TEMPLATE_DOWNLOAD_URLS) {
      try {
        const response = await fetch(templateUrl);
        if (response.ok) {
          return await response.blob();
        }
      } catch {
        // Try next fallback URL.
      }
    }

    throw new Error("Template file download failed from all fallback URLs.");
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const rejection = uploadRejection(file);
    if (rejection) {
      setError(rejection);
      event.target.value = "";
      return;
    }

    setIsProcessing(true);
    setLoading(true);
    setError(null);

    try {
      const worker = new Worker(
        new URL("../core/parseExcel.worker.ts", import.meta.url),
        { type: "module" }
      );

      worker.postMessage({ file });

      worker.onmessage = async (e) => {
        const {
          success,
          students,
          mapping,
          error,
          scoreIssues = [],
          areasWithoutMax = [],
        } = e.data as {
          success: boolean;
          students: Parameters<typeof setStudents>[0];
          mapping: ColumnMapping | null;
          error?: string;
          scoreIssues?: ScoreIssue[];
          areasWithoutMax?: string[];
        };

        if (success) {
          await setStudents(students);
          setMapping(mapping ?? null);
          if (scoreIssues.length > 0 || areasWithoutMax.length > 0) {
            // 교사가 학생 번호와 영역을 읽고 찾아볼 수 있도록 오래 보여 줍니다.
            setError(loadedMessage(students.length, scoreIssues, areasWithoutMax), 15000);
          } else {
            setError(loadedMessage(students.length));
            setTimeout(() => {
              setError(null);
            }, 3000);
          }
        } else {
          setError(error || "Failed to parse the selected file.");
        }

        setIsProcessing(false);
        setLoading(false);
        worker.terminate();
      };

      worker.onerror = (error) => {
        setError(`File processing error: ${error.message}`);
        setIsProcessing(false);
        setLoading(false);
        worker.terminate();
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      setIsProcessing(false);
      setLoading(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      let blob: Blob;

      if (typeof window !== "undefined" && window.electronAPI) {
        const result = await window.electronAPI.getTemplateFile();
        if (!result.success || !result.data) {
          throw new Error(result.error || "Template file not found.");
        }

        const binaryString = atob(result.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
      } else {
        blob = await fetchTemplateFromWeb();
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = TEMPLATE_FILE_NAME;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Template download failed:", error);
      setError("Template download failed.");
    }
  };

  return (
    <div className="rounded-card shadow-card bg-card px-4 py-3">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-small font-semibold whitespace-nowrap text-ink">
          Spreadsheet:
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          disabled={isProcessing}
          className={`text-small text-soft file:mr-3 file:py-2 file:px-4 file:rounded-button file:text-small file:font-semibold file:cursor-pointer file:transition-colors disabled:opacity-50 ${
            hasStudents
              ? "file:border file:border-solid file:border-hairline file:bg-card file:text-ink hover:file:bg-wash hover:file:border-ring"
              : "file:border-0 file:bg-accent file:text-white hover:file:bg-accent-hover"
          }`}
          aria-label="Select spreadsheet file"
        />
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="text-small font-semibold inline-flex items-center justify-center gap-2 rounded-button border border-hairline bg-card text-ink px-3 py-2 transition-colors hover:bg-wash hover:border-ring"
        >
          Download Template
        </button>
        {isProcessing && (
          <div className="flex items-center gap-2 text-accent-ink">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand" />
            <span className="text-caption">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}
