/**
 * 파일 올리기와 표준 서식 받기
 * 입력칸은 App에 하나만 두고, 시작 화면과 사이드바의 버튼이 함께 씁니다.
 */

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useStore } from "../../store/store";
import type { ColumnMapping, Student } from "../../types";
import type { ScoreIssue } from "../../core/normalize";
import { suggestListName } from "../../core/parser/listName";
import type { NameHint } from "../../core/parser/listName";
import { TEMPLATE_FILE_NAME } from "../../core/template";
import { loadedMessage, uploadRejection } from "./loadMessages";

/** 파일 해석 라이브러리나 브라우저의 영어 오류를 그대로 보이지 않습니다. */
function readableError(message: string | undefined) {
  return message && /[가-힣]/.test(message)
    ? message
    : "파일을 읽지 못했습니다. 파일이 손상되지 않았는지 확인해 주세요.";
}

/** 읽었지만 아직 저장하지 않은 파일. 저장 창에서 이름을 받습니다. */
export interface PendingUpload {
  students: Student[];
  suggestedName: string;
  message: string;
  messageDurationMs: number;
}

export function useFileUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const { setLoading, setError, setMapping } = useStore();

  // 외부 통신 없이 앱에 들어 있는 파일을 받습니다.
  const fetchBundledTemplate = async (): Promise<Blob> => {
    // 빌드가 상대 경로(base: "./")이므로 현재 위치를 기준으로 주소를 만듭니다.
    const response = await fetch(new URL(TEMPLATE_FILE_NAME, document.baseURI).pathname);
    if (!response.ok) {
      throw new Error("Bundled template file is missing.");
    }
    return response.blob();
  };

  const handleFile = async (file: File) => {
    const rejection = uploadRejection(file);
    if (rejection) {
      setError(rejection);
      return;
    }

    setIsProcessing(true);
    setLoading(true);
    setError(null);

    try {
      const worker = new Worker(
        new URL("../../core/parseExcel.worker.ts", import.meta.url),
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
          nameHint,
        } = e.data as {
          success: boolean;
          students: Student[];
          mapping: ColumnMapping | null;
          error?: string;
          scoreIssues?: ScoreIssue[];
          areasWithoutMax?: string[];
          nameHint?: NameHint;
        };

        if (success) {
          setMapping(mapping ?? null);
          const hasWarnings = scoreIssues.length > 0 || areasWithoutMax.length > 0;
          setPending({
            students,
            suggestedName: suggestListName(students, nameHint),
            message: loadedMessage(students.length, scoreIssues, areasWithoutMax),
            // 교사가 학생 번호와 영역을 읽고 찾아볼 수 있도록 오래 보여 줍니다.
            messageDurationMs: hasWarnings ? 15000 : 3000,
          });
        } else {
          setError(readableError(error));
        }

        setIsProcessing(false);
        setLoading(false);
        worker.terminate();
      };

      worker.onerror = (error) => {
        setError(readableError(error.message));
        setIsProcessing(false);
        setLoading(false);
        worker.terminate();
      };
    } catch (error) {
      setError(readableError(error instanceof Error ? error.message : undefined));
      setIsProcessing(false);
      setLoading(false);
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 같은 파일을 다시 골라도 변경으로 알아채도록 비웁니다.
    event.target.value = "";
    if (file) {
      handleFile(file);
    }
  };

  const downloadTemplate = async () => {
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
        blob = await fetchBundledTemplate();
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
      setError("표준 서식을 받지 못했습니다.");
    }
  };

  return {
    inputRef,
    isProcessing,
    pending,
    clearPending: () => setPending(null),
    handleFile,
    handleInputChange,
    openFilePicker: () => inputRef.current?.click(),
    downloadTemplate,
  };
}

export type FileUpload = ReturnType<typeof useFileUpload>;
