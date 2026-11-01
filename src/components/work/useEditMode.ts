import { useState } from "react";
import { useStore } from "../../store/store";

/**
 * 점수 잠금 해제 흐름: 켤 때는 확인을 받습니다.
 */
export function useEditMode() {
  const isEditMode = useStore((state) => state.isEditMode);
  const setEditMode = useStore((state) => state.setEditMode);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  return {
    isEditMode,
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
