/**
 * Spreadsheet upload component.
 */

import { useRef, useState } from "react";
import { useStore } from "../store/store";
import type { ColumnMapping } from "../types";
import { TEMPLATE_DOWNLOAD_URLS, TEMPLATE_FILE_NAME } from "../core/template";

export function FilePicker() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { setLoading, setError, setStudents, setMapping } = useStore();

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

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    if (
      !validTypes.includes(file.type) &&
      !file.name.match(/\.(xlsx|xls|csv)$/i)
    ) {
      setError("Unsupported format: .xlsx, .xls, .csv");
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
        const { success, students, mapping, error } = e.data as {
          success: boolean;
          students: Parameters<typeof setStudents>[0];
          mapping: ColumnMapping | null;
          error?: string;
        };

        if (success) {
          await setStudents(students);
          setMapping(mapping ?? null);
          setError(`Loaded ${students.length} students successfully.`);
          setTimeout(() => {
            setError(null);
          }, 3000);
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
    <div className="rounded-lg shadow p-4" style={{ backgroundColor: "var(--card)" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <label
          className="text-sm font-medium whitespace-nowrap"
          style={{ color: "var(--foreground)" }}
        >
          Spreadsheet:
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          disabled={isProcessing}
          className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold disabled:opacity-50"
          style={{ color: "var(--muted-foreground)" }}
          aria-label="Select spreadsheet file"
        />
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="text-sm font-semibold inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 transition-colors"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--accent-foreground)",
          }}
        >
          Download Template
        </button>
        {isProcessing && (
          <div className="flex items-center gap-2" style={{ color: "var(--primary)" }}>
            <div
              className="animate-spin rounded-full h-4 w-4 border-b-2"
              style={{ borderColor: "var(--primary)" }}
            />
            <span className="text-xs">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}
