/**
 * 파일을 놓는 칸과, 창 위로 파일을 끌고 오는 중인지 알아채기
 * 칸 밖에 놓은 파일은 useBlockStrayFileDrop이 막습니다.
 */

import { useEffect, useState } from "react";
import type { DragEvent } from "react";
import { collectDroppedFiles } from "../../core/droppedFiles";
import type { FileUpload } from "./useFileUpload";

const hasFiles = (dataTransfer: DataTransfer | null) => !!dataTransfer?.types.includes("Files");

/** 놓는 칸에 붙이는 처리기. enabled가 false면 놓아도 받지 않습니다. */
export function useFileDropTarget(upload: FileUpload, enabled = true) {
  const [isOver, setIsOver] = useState(false);
  const accepts = enabled && !upload.isProcessing;

  const props = {
    "data-dropzone": "true",
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!accepts || !hasFiles(event.dataTransfer)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setIsOver(true);
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setIsOver(false);
      }
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      setIsOver(false);
      if (!accepts || !hasFiles(event.dataTransfer)) return;
      event.preventDefault();
      // 폴더 항목은 놓기 처리 안에서만 읽을 수 있어 여기서 바로 모읍니다.
      void collectDroppedFiles(event.dataTransfer).then(upload.handleFiles);
    },
  };

  return { isOver, props };
}

// 파일을 멈춰 쥐고 있어도 dragover는 0.35초(±0.2초)마다 옵니다. 그보다 길게 기다립니다.
const DRAG_IDLE_MS = 700;

/** 창 위로 파일을 끌고 오는 동안 true입니다. 놓거나 창 밖으로 나가면 false가 됩니다. */
export function useWindowFileDrag(): boolean {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      clearTimeout(timer);
      setIsDragging(false);
    };
    const over = (event: globalThis.DragEvent) => {
      if (!hasFiles(event.dataTransfer)) return;
      setIsDragging(true);
      clearTimeout(timer);
      timer = setTimeout(stop, DRAG_IDLE_MS);
    };
    // 놓기 처리가 이벤트를 막아도 알 수 있게 잡는 단계에서 듣습니다.
    window.addEventListener("dragover", over, true);
    window.addEventListener("drop", stop, true);
    window.addEventListener("dragend", stop, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("dragover", over, true);
      window.removeEventListener("drop", stop, true);
      window.removeEventListener("dragend", stop, true);
    };
  }, []);

  return isDragging;
}
