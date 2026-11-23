/**
 * 파일 올리기와 표준 서식 받기
 * 입력칸은 App에 하나만 두고, 시작 화면과 사이드바의 버튼과 놓는 칸이 함께 씁니다.
 * 파일이 하나면 이름을 정해 저장하는 창을, 여럿이면 목록마다 한 줄씩 보여 주는 창을 띄웁니다.
 */

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useStore } from "../../store/store";
import type { ColumnMapping, Student } from "../../types";
import type { ScoreIssue } from "../../core/normalize";
import { distinctNames, fileStem } from "../../core/batch";
import type { CollectedFiles } from "../../core/droppedFiles";
import { sortFiles } from "../../core/droppedFiles";
import { suggestListName } from "../../core/parser/listName";
import type { NameHint } from "../../core/parser/listName";
import { TEMPLATE_FILE_NAME } from "../../core/template";
import { loadedMessage, uploadRejection, warningText } from "./loadMessages";

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

/** 여러 파일 가운데 하나. 읽은 파일은 이름을 받고, 못 읽은 파일은 이유만 보여 줍니다. */
export type BatchItem =
  | { kind: "read"; fileName: string; students: Student[]; suggestedName: string; warning: string | null }
  | { kind: "failed"; fileName: string; reason: string };

export interface BatchUpload {
  items: BatchItem[];
  skippedInFolders: number;
}

type ParseResult =
  | {
      success: true;
      students: Student[];
      mapping: ColumnMapping | null;
      scoreIssues: ScoreIssue[];
      areasWithoutMax: string[];
      nameHint?: NameHint;
    }
  | { success: false; error: string };

/** 파일 하나를 Web Worker에서 읽습니다. 실패해도 던지지 않고 이유를 돌려줍니다. */
function parseFile(file: File): Promise<ParseResult> {
  const rejection = uploadRejection(file);
  if (rejection) return Promise.resolve({ success: false, error: rejection });

  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("../../core/parseExcel.worker.ts", import.meta.url), { type: "module" });
    } catch (error) {
      resolve({ success: false, error: readableError(error instanceof Error ? error.message : undefined) });
      return;
    }
    worker.onmessage = (e) => {
      const data = e.data as {
        success: boolean;
        students: Student[];
        mapping: ColumnMapping | null;
        error?: string;
        scoreIssues?: ScoreIssue[];
        areasWithoutMax?: string[];
        nameHint?: NameHint;
      };
      worker.terminate();
      resolve(
        data.success
          ? {
              success: true,
              students: data.students,
              mapping: data.mapping ?? null,
              scoreIssues: data.scoreIssues ?? [],
              areasWithoutMax: data.areasWithoutMax ?? [],
              nameHint: data.nameHint,
            }
          : { success: false, error: readableError(data.error) }
      );
    };
    worker.onerror = (error) => {
      worker.terminate();
      resolve({ success: false, error: readableError(error.message) });
    };
    worker.postMessage({ file });
  });
}

/** 나이스 제목 줄에서 이름을 찾지 못하면 파일 이름을 씁니다. */
function nameFor(file: File, students: Student[], hint?: NameHint) {
  return suggestListName(students, hint) || fileStem(file.name);
}

export function useFileUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [batch, setBatch] = useState<BatchUpload | null>(null);
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

  const start = () => {
    setIsProcessing(true);
    setLoading(true);
    setError(null);
  };

  const finish = () => {
    setIsProcessing(false);
    setLoading(false);
  };

  const handleFile = async (file: File) => {
    const rejection = uploadRejection(file);
    if (rejection) {
      setError(rejection);
      return;
    }

    start();
    const result = await parseFile(file);
    if (result.success) {
      setMapping(result.mapping);
      const hasWarnings = result.scoreIssues.length > 0 || result.areasWithoutMax.length > 0;
      setPending({
        students: result.students,
        suggestedName: nameFor(file, result.students, result.nameHint),
        message: loadedMessage(result.students.length, result.scoreIssues, result.areasWithoutMax),
        // 교사가 학생 번호와 영역을 읽고 찾아볼 수 있도록 오래 보여 줍니다.
        messageDurationMs: hasWarnings ? 15000 : 3000,
      });
    } else {
      setError(result.error);
    }
    finish();
  };

  /** 파일 여러 개를 차례로 읽어 한 창에 모읍니다. 하나가 실패해도 나머지는 계속 읽습니다. */
  const handleFiles = async ({ files, skippedInFolders }: CollectedFiles) => {
    if (files.length === 0) {
      setError(
        skippedInFolders > 0
          ? "폴더 안에 엑셀 파일이 없습니다. .xlsx, .xls 파일을 넣어 주세요."
          : "넣을 파일을 찾지 못했습니다."
      );
      return;
    }
    if (files.length === 1) {
      await handleFile(files[0]);
      return;
    }

    start();
    const items: BatchItem[] = [];
    for (const file of files) {
      const result = await parseFile(file);
      items.push(
        result.success
          ? {
              kind: "read",
              fileName: file.name,
              students: result.students,
              suggestedName: nameFor(file, result.students, result.nameHint),
              warning: warningText(result.scoreIssues, result.areasWithoutMax),
            }
          : { kind: "failed", fileName: file.name, reason: result.error }
      );
    }
    const read = items.filter((item) => item.kind === "read");
    const names = distinctNames(read.map((item) => item.suggestedName));
    read.forEach((item, index) => {
      item.suggestedName = names[index];
    });
    setBatch({ items, skippedInFolders });
    finish();
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = sortFiles(Array.from(event.target.files ?? []));
    // 같은 파일을 다시 골라도 변경으로 알아채도록 비웁니다.
    event.target.value = "";
    if (files.length > 0) {
      void handleFiles({ files, skippedInFolders: 0 });
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
    batch,
    clearBatch: () => setBatch(null),
    handleFile,
    handleFiles,
    handleInputChange,
    openFilePicker: () => inputRef.current?.click(),
    downloadTemplate,
  };
}

export type FileUpload = ReturnType<typeof useFileUpload>;
