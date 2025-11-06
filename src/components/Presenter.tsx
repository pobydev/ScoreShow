/**
 * 발표 모드 컴포넌트
 * 학생을 한 명씩 개별적으로 보여주어 비밀을 보호하면서 점수를 확인할 수 있도록 합니다.
 * 큰 폰트를 사용하여 정보를 확실하게 파악할 수 있도록 하며,
 * 출력물을 가려가며 보여주던 번거로운 과정을 해결합니다.
 */

import { useEffect, useState } from "react";
import { useStore } from "../store/store";
import { StudentList } from "./StudentList";

export function Presenter() {
  const {
    students,
    selectedStudentId,
    isBlackout,
    nextStudent,
    prevStudent,
    setBlackout,
    setPresenterMode,
    setSelectedStudent,
  } = useStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isListExpanded, setIsListExpanded] = useState(true);
  const [pendingDirection, setPendingDirection] = useState<null | 'next' | 'prev'>(null);

  // 학생이 선택되고 화이트아웃이 해제되면 pendingDirection 초기화
  useEffect(() => {
    if (selectedStudentId && !isBlackout && pendingDirection !== null) {
      setPendingDirection(null);
    }
  }, [selectedStudentId, isBlackout, pendingDirection]);

  const currentIndex = selectedStudentId 
    ? students.findIndex((s) => s.id === selectedStudentId)
    : -1; // 화이트아웃 상태에서는 -1
  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const evaluations = selectedStudent?.evaluations || [];

  // 영역 개수에 따른 글씨 크기 결정
  const getTextSize = (count: number) => {
    if (count === 1) {
      return {
        areaName: "text-3xl md:text-5xl",
        score: "text-8xl md:text-9xl",
        studentName: "text-5xl md:text-7xl",
        studentInfo: "text-6xl md:text-8xl",
      };
    } else if (count === 2 || count === 3) {
      return {
        areaName: "text-2xl md:text-3xl",
        score: "text-5xl md:text-6xl",
        studentName: "text-4xl md:text-5xl",
        studentInfo: "text-5xl md:text-6xl",
      };
    } else if (count === 4 || count === 5) {
      return {
        areaName: "text-xl md:text-2xl",
        score: "text-4xl md:text-5xl",
        studentName: "text-3xl md:text-4xl",
        studentInfo: "text-4xl md:text-5xl",
      };
    } else {
      return {
        areaName: "text-lg md:text-xl",
        score: "text-3xl md:text-4xl",
        studentName: "text-2xl md:text-3xl",
        studentInfo: "text-3xl md:text-4xl",
      };
    }
  };

  const textSize = getTextSize(evaluations.length);

  // 키보드 이벤트 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPresenterMode(false);
        if (isFullscreen && document.exitFullscreen) document.exitFullscreen();
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
        return;
      }
      if (["ArrowRight", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        // 첫 번째 학생 전 화이트아웃 상태에서 오른쪽 키를 누르면 첫 번째 학생으로 이동
        if (isBlackout && !selectedStudentId) {
          nextStudent();
          setBlackout(false);
          setPendingDirection(null);
          return;
        }
        // 화이트아웃 상태에서 오른쪽 키 처리
        if (isBlackout) {
          if (pendingDirection === 'next') {
            nextStudent();
            setBlackout(false);
            setPendingDirection(null);
          } else {
            // 반대 방향 화이트아웃: 마지막 학생이면 그 학생으로 돌아가고, 아니면 다음 학생으로
            if (currentIndex >= students.length - 1 && currentIndex >= 0) {
              // 마지막 학생이면 그 학생으로 돌아가기
              setBlackout(false);
              setPendingDirection(null);
            } else {
              nextStudent();
              setBlackout(false);
              setPendingDirection(null);
            }
          }
          return;
        }
        // 마지막 학생에서 오른쪽 키는 무시 (순환 방지, 화이트아웃 상태로도 들어가지 않음)
        if (currentIndex >= students.length - 1 && currentIndex >= 0) {
          return; // 아무 동작도 하지 않음
        }
        // 화이트아웃이 아닐 때 오른쪽 키 처리
        setBlackout(true);
        setPendingDirection('next');
        return;
      }
      if (["ArrowLeft", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        // 첫 번째 학생 전 화이트아웃 상태에서는 왼쪽 화살표 무시 (순환 방지)
        if (isBlackout && !selectedStudentId) {
          return; // 아무 동작도 하지 않음
        }
        // 첫 번째 학생에서 왼쪽 화살표는 무시 (순환 방지)
        if (!isBlackout && currentIndex === 0) {
          return; // 아무 동작도 하지 않음
        }
        if (!isBlackout) {
          setBlackout(true);
          setPendingDirection('prev');
        } else if (pendingDirection === 'prev') {
          prevStudent();
          setBlackout(false);
          setPendingDirection(null);
        } else {
          setBlackout(false);
          setPendingDirection(null);
        }
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBlackout, isFullscreen, nextStudent, prevStudent, setBlackout, setPresenterMode, pendingDirection, selectedStudentId, currentIndex, setSelectedStudent]);

  // 전체화면 토글
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error("Failed to enter fullscreen:", err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error("Failed to exit fullscreen:", err);
      }
    }
  };

  // 전체화면 변경 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  if (isBlackout) {
    return (
      <div className="fixed inset-0 z-50 flex" style={{ backgroundColor: 'var(--background)' }}>
        {/* 우측 상단 종료 버튼 (블랙아웃 상태에서도 표시) */}
        <button
          onClick={() => {
            setPresenterMode(false);
            setBlackout(false);
            if (isFullscreen && document.exitFullscreen) {
              document.exitFullscreen();
            }
          }}
          className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium transition-all backdrop-blur-sm flex items-center gap-2 shadow-lg"
          style={{ 
            backgroundColor: 'var(--card)',
            color: 'var(--foreground)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--card)';
          }}
          aria-label="발표 모드 종료"
          type="button"
        >
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span>발표모드 종료</span>
        </button>

        {/* 좌측: 학생 리스트 */}
        <div className="relative flex-shrink-0">
          <div
            className={`border-r flex flex-col transition-all duration-300 h-full ${
              isListExpanded ? "w-64" : "w-0"
            } overflow-hidden`}
            style={{ 
              backgroundColor: 'var(--sidebar)',
              borderColor: 'var(--sidebar-border)'
            }}
          >
            {/* 접힌 상태일 때도 보이는 토글 버튼 */}
            {!isListExpanded && (
              <button
                onClick={() => setIsListExpanded(true)}
                className="absolute left-0 top-0 bottom-0 w-8 border-r flex items-center justify-center transition-colors z-10"
                style={{ 
                  backgroundColor: 'var(--sidebar)',
                  borderColor: 'var(--sidebar-border)',
                  color: 'var(--muted-foreground)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--sidebar-accent)';
                  e.currentTarget.style.color = 'var(--sidebar-foreground)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--sidebar)';
                  e.currentTarget.style.color = 'var(--muted-foreground)';
                }}
                aria-label="목록 펼치기"
                type="button"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}

            {isListExpanded && (
              <>
                <div className="p-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--sidebar-border)' }}>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--sidebar-foreground)' }}>학생 목록</h2>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsListExpanded(false);
                    }}
                    className="transition-colors flex-shrink-0"
                    style={{ color: 'var(--muted-foreground)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--sidebar-foreground)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--muted-foreground)';
                    }}
                    aria-label="목록 접기"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <StudentList blackoutBetweenIdx={currentIndex} pendingDirection={pendingDirection ?? undefined} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* 우측: 화이트아웃 메시지 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xl md:text-2xl opacity-70" style={{ color: 'var(--foreground)' }}>
            {!selectedStudentId 
              ? "화살표 키(←→↑↓)를 누르면 다음 학생으로 이동"
              : "화살표 키(←→↑↓)를 누르면 전후 학생으로 이동"}
          </div>
        </div>
      </div>
    );
  }

  if (!selectedStudent || evaluations.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
      {/* 우측 상단 종료 버튼 */}
      <button
        onClick={() => {
          setPresenterMode(false);
          if (isFullscreen && document.exitFullscreen) {
            document.exitFullscreen();
          }
        }}
        className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium transition-all backdrop-blur-sm flex items-center gap-2 shadow-lg"
        style={{ 
          backgroundColor: 'var(--card)',
          color: 'var(--foreground)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--accent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--card)';
        }}
        aria-label="발표 모드 종료"
        type="button"
      >
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
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        <span>발표모드 종료</span>
      </button>
        <p className="text-xl" style={{ color: 'var(--foreground)' }}>표시할 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex" style={{ backgroundColor: 'var(--background)' }}>
      {/* 우측 상단 버튼들 */}
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        {/* 전체화면 해제 버튼 (전체화면일 때만 표시) */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all backdrop-blur-sm flex items-center gap-2 shadow-lg"
            style={{ 
              backgroundColor: 'var(--card)',
              color: 'var(--foreground)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card)';
            }}
            aria-label="전체화면 해제"
            type="button"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span>전체화면 해제</span>
          </button>
        )}
        {/* 발표 모드 종료 버튼 */}
        <button
          onClick={() => {
            setPresenterMode(false);
            if (isFullscreen && document.exitFullscreen) {
              document.exitFullscreen();
            }
          }}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all backdrop-blur-sm flex items-center gap-2 shadow-lg"
          style={{ 
            backgroundColor: 'var(--card)',
            color: 'var(--foreground)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--card)';
          }}
          aria-label="발표 모드 종료"
          type="button"
        >
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span>발표모드 종료</span>
        </button>
      </div>

      {/* 좌측: 학생 리스트 */}
      <div className="relative flex-shrink-0">
        <div
          className={`border-r flex flex-col transition-all duration-300 h-full ${
            isListExpanded ? "w-64" : "w-0"
          } overflow-hidden`}
          style={{ 
            backgroundColor: 'var(--sidebar)',
            borderColor: 'var(--sidebar-border)'
          }}
        >
          {/* 접힌 상태일 때도 보이는 토글 버튼 */}
          {!isListExpanded && (
            <button
              onClick={() => setIsListExpanded(true)}
              className="absolute left-0 top-0 bottom-0 w-8 border-r flex items-center justify-center transition-colors z-10"
              style={{ 
                backgroundColor: 'var(--sidebar)',
                borderColor: 'var(--sidebar-border)',
                color: 'var(--muted-foreground)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--sidebar-accent)';
                e.currentTarget.style.color = 'var(--sidebar-foreground)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--sidebar)';
                e.currentTarget.style.color = 'var(--muted-foreground)';
              }}
              aria-label="목록 펼치기"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          {isListExpanded && (
            <>
              <div className="p-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--sidebar-border)' }}>
                <h2 className="text-sm font-bold" style={{ color: 'var(--sidebar-foreground)' }}>학생 목록</h2>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsListExpanded(false);
                    }}
                    className="transition-colors flex-shrink-0"
                    style={{ color: 'var(--muted-foreground)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--sidebar-foreground)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--muted-foreground)';
                    }}
                    aria-label="목록 접기"
                    type="button"
                  >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <StudentList />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 우측: 학생 정보 */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-8 animate-fade-in w-full max-w-6xl mx-auto" style={{ color: 'var(--foreground)' }}>
            {/* 학생 정보 */}
            <div className="mb-8 md:mb-12">
              <h1 className={`${textSize.studentInfo} font-bold mb-2 md:mb-4`}>
                {selectedStudent.grade}학년 {selectedStudent.class}반{" "}
                {selectedStudent.number}번
              </h1>
              <h2 className={`${textSize.studentName} font-semibold`}>
                {selectedStudent.name}
              </h2>
            </div>

            {/* 평가 영역들 */}
            <div className="mb-12">
              <div
                className={`grid gap-4 md:gap-6 ${
                  evaluations.length <= 2
                    ? 'grid-cols-1 md:grid-cols-1'
                    : evaluations.length <= 4
                    ? 'grid-cols-2'
                    : evaluations.length <= 6
                    ? 'grid-cols-2 md:grid-cols-3'
                    : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                }`}
              >
                {evaluations.map((eval_, index) => (
                  <div
                    key={index}
                    className="rounded-lg p-6 border flex flex-col items-center"
                    style={{ 
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)'
                    }}
                  >
                    <div className={`${evaluations.length === 1 ? 'text-3xl md:text-5xl' : 'text-xl md:text-2xl'} font-medium mb-4`} style={{ color: 'var(--card-foreground)' }}>
                      {eval_.area}
                    </div>
                    <div className={`${evaluations.length === 1 ? 'text-8xl md:text-9xl' : 'text-4xl md:text-5xl'} font-bold mb-2`}>
                      {eval_.score === null ? '미입력' : `${eval_.score} / ${eval_.maxScore}`}
                    </div>
                    {eval_.maxScore > 0 && eval_.score !== null && (
                      <div className={`${evaluations.length === 1 ? 'text-xl' : 'text-lg'}`} style={{ color: 'var(--muted-foreground)' }}>
                        {((eval_.score / eval_.maxScore) * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 하단 단축키 안내 - 고정 위치 */}
        <div
          className={`absolute bottom-8 right-0 text-sm flex justify-center gap-4 flex-wrap pointer-events-none transition-all duration-300 ${
            isListExpanded ? "left-64" : "left-0"
          }`}
          style={{ color: 'var(--muted-foreground)' }}
        >
          <span>← → ↑ ↓ : 이동</span>
          <span>F : {isFullscreen ? "전체화면 해제" : "전체화면"}</span>
          <span>Esc : 종료</span>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}


