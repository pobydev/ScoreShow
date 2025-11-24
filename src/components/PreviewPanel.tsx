/**
 * 학생 정보 미리보기 패널
 */

import { useStore } from "../store/store";

export function PreviewPanel() {
  const {
    students,
    selectedStudentId,
    clearAllData,
    isEditMode,
    setEditMode,
    updateEvaluation,
  } = useStore();

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const handleToggleEditMode = () => {
    if (!isEditMode) {
      const confirmed = confirm(
        "점수 수정 모드를 켜면 업로드된 데이터를 직접 수정할 수 있습니다. 변경 사항은 자동 저장됩니다. 잠금을 해제할까요?"
      );
      if (!confirmed) {
        return;
      }
    }
    setEditMode(!isEditMode);
  };

  if (!selectedStudent) {
    return (
      <div className="rounded-lg shadow p-8 h-full flex flex-col" style={{ backgroundColor: 'var(--card)' }}>
        {/* 버튼 영역 - 학생이 없을 때도 표시 */}
        {students.length > 0 && (
          <div className="mb-4 pb-4 border-b flex justify-end gap-2" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => useStore.getState().setPresenterMode(true)}
              className="group relative px-6 py-2.5 text-[var(--primary-foreground)] text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 overflow-hidden"
              style={{ 
                backgroundColor: 'var(--primary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span className="relative z-10">발표 모드 시작</span>
            </button>
            <button
              onClick={async () => {
                if (confirm("모든 데이터를 삭제하시겠습니까?")) {
                  await clearAllData();
                }
              }}
              className="group px-5 py-2.5 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-red-50 hover:border-red-300 transition-all duration-200 flex items-center gap-2"
              aria-label="모든 데이터 삭제"
            >
              <svg
                className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>데이터 삭제</span>
            </button>
          </div>
        )}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <svg
            className="w-16 h-16 mb-4"
            style={{ color: 'var(--muted-foreground)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <p className="text-lg mb-2" style={{ color: 'var(--muted-foreground)' }}>학생을 선택하세요</p>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            좌측 목록에서 학생을 클릭하여 점수를 확인하세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg shadow p-4 h-full flex flex-col" style={{ backgroundColor: 'var(--card)' }}>
      {/* 버튼 영역 */}
      {students.length > 0 && (
        <div className="mb-4 pb-4 border-b flex flex-wrap justify-end gap-2" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={handleToggleEditMode}
            className="px-4 py-2 text-sm font-semibold rounded-lg border flex items-center gap-2 transition-colors"
            style={{
              borderColor: isEditMode ? 'var(--primary)' : 'var(--border)',
              color: isEditMode ? 'var(--primary)' : 'var(--foreground)',
            }}
            aria-label="점수 편집 모드 전환"
          >
            {isEditMode ? "🔓 편집 중 (잠그기)" : "🔒 점수 잠금 해제"}
          </button>
          <button
            onClick={() => useStore.getState().setPresenterMode(true)}
            className="group relative px-6 py-2.5 text-[var(--primary-foreground)] text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 overflow-hidden"
            style={{ 
              backgroundColor: 'var(--primary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            aria-label="발표 모드 시작"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span className="relative z-10">발표 모드 시작</span>
          </button>
          <button
            onClick={async () => {
              if (confirm("모든 데이터를 삭제하시겠습니까?")) {
                await clearAllData();
              }
            }}
            className="group px-5 py-2.5 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-red-50 hover:border-red-300 transition-all duration-200 flex items-center gap-2"
            aria-label="모든 데이터 삭제"
          >
            <svg
              className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span>데이터 삭제</span>
          </button>
        </div>
      )}

      {/* 학생 정보 */}
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-1">
          {selectedStudent.grade}학년 {selectedStudent.class}반{" "}
          {selectedStudent.number}번
        </h2>
        <p className="text-lg" style={{ color: 'var(--foreground)' }}>{selectedStudent.name}</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <h3 className="text-base font-semibold mb-2">평가 결과</h3>
        {isEditMode && (
          <p className="text-xs mb-3" style={{ color: 'var(--muted-foreground)' }}>
            편집 모드에서는 영역 이름, 점수, 만점을 직접 수정할 수 있습니다. 변경 사항은 자동 저장되며, 다시 잠그면 실수 입력을 방지할 수 있습니다.
          </p>
        )}
        {selectedStudent.evaluations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <svg
              className="w-12 h-12 mb-3"
              style={{ color: 'var(--muted-foreground)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>평가 데이터가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedStudent.evaluations.map((eval_, index) => (
              <div
                key={index}
                className="border rounded-lg p-3 hover:shadow-md transition-shadow"
                style={{ borderColor: 'var(--border)' }}
              >
                {isEditMode ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={eval_.area}
                      onChange={(event) =>
                        updateEvaluation(selectedStudent.id, index, {
                          area: event.target.value,
                        })
                      }
                      onKeyDown={(e) => {
                        // Electron에서 키보드 이벤트가 전파되지 않도록 방지
                        e.stopPropagation();
                      }}
                      className="w-full text-sm font-semibold border rounded px-2 py-1"
                      style={{ borderColor: 'var(--border)', color: 'var(--foreground)', backgroundColor: 'var(--card)' }}
                      placeholder="평가 영역 이름"
                      autoComplete="off"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                          점수
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min={0}
                          value={eval_.score ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (value === "") {
                              updateEvaluation(selectedStudent.id, index, {
                                score: null,
                              });
                              return;
                            }
                            const parsed = Number(value);
                            if (Number.isFinite(parsed)) {
                              updateEvaluation(selectedStudent.id, index, {
                                score: parsed,
                              });
                            }
                          }}
                          onKeyDown={(e) => {
                            // Electron에서 키보드 이벤트가 전파되지 않도록 방지
                            e.stopPropagation();
                          }}
                          className="w-full border rounded px-2 py-1"
                          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
                          autoComplete="off"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                          만점
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={eval_.maxScore}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (value === "") {
                              return;
                            }
                            const parsed = Number(value);
                            if (Number.isFinite(parsed) && parsed > 0) {
                              updateEvaluation(selectedStudent.id, index, {
                                maxScore: parsed,
                              });
                            }
                          }}
                          onKeyDown={(e) => {
                            // Electron에서 키보드 이벤트가 전파되지 않도록 방지
                            e.stopPropagation();
                          }}
                          className="w-full border rounded px-2 py-1"
                          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="font-semibold text-sm mb-1">{eval_.area}</div>
                    <div className="text-xl font-bold mb-2" style={{ color: 'var(--primary)' }}>
                      {eval_.score === null ? '미입력' : `${eval_.score} / ${eval_.maxScore}`}
                    </div>
                    {eval_.maxScore > 0 && eval_.score !== null && (
                      <div>
                        <div className="w-full rounded-full h-1.5 mb-1" style={{ backgroundColor: 'var(--secondary)' }}>
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ 
                              backgroundColor: 'var(--primary)',
                              width: `${(eval_.score / eval_.maxScore) * 100}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          {((eval_.score / eval_.maxScore) * 100).toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
