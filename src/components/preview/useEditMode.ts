import { useEffect, useRef, useState } from "react";
import { useStore } from "../../store/store";
import type { Student } from "../../types";

/**
 * 점수 잠금 해제 흐름: 켤 때는 확인을 받고, 켜지면 첫 입력칸에 포커스를 줍니다.
 */
export function useEditMode(selectedStudent: Student | undefined) {
  const isEditMode = useStore((state) => state.isEditMode);
  const setEditMode = useStore((state) => state.setEditMode);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // 편집 모드 활성화 시 첫 번째 input 필드에 포커스를 주기 위한 ref
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditMode && selectedStudent && selectedStudent.evaluations.length > 0) {
      // 약간의 지연 후 포커스
      setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus();
        }
      }, 50);
    }
  }, [isEditMode, selectedStudent]);

  return {
    isEditMode,
    firstInputRef,
    showConfirmDialog,
    toggleEditMode: () => {
      if (!isEditMode) {
        setShowConfirmDialog(true);
      } else {
        setEditMode(false);
      }
    },
    confirmEditMode: () => {
      setShowConfirmDialog(false);
      setEditMode(true);
    },
    cancelEditMode: () => {
      setShowConfirmDialog(false);
    },
  };
}
