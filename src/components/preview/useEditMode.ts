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

  // 입력할 때마다 학생 객체가 새로 만들어지므로 객체 대신 id를 봅니다.
  // 객체를 보면 점수를 치는 도중 포커스가 첫 입력칸으로 옮겨 갑니다.
  const focusStudentId =
    isEditMode && selectedStudent && selectedStudent.evaluations.length > 0
      ? selectedStudent.id
      : null;

  useEffect(() => {
    if (focusStudentId) {
      // 약간의 지연 후 포커스
      setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus();
        }
      }, 50);
    }
  }, [focusStudentId]);

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
