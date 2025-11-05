/**
 * 학생 목록 및 검색 컴포넌트
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { useStore } from "../store/store";

export function StudentList({
  blackoutBetweenIdx,
  pendingDirection,
}: { blackoutBetweenIdx?: number; pendingDirection?: "next" | "prev" } = {}) {
  const { students, selectedStudentId, setSelectedStudent, isPresenterMode, isBlackout, setBlackout } =
    useStore();
  const [searchQuery, setSearchQuery] = useState("");
  
  // 선택된 학생 항목의 ref를 저장할 Map
  const studentRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  
  // 선택된 학생이 변경되면 자동 스크롤 (발표 모드일 때만)
  useEffect(() => {
    if (isPresenterMode && selectedStudentId && !isBlackout) {
      const studentElement = studentRefs.current.get(selectedStudentId);
      if (studentElement) {
        // 부드러운 스크롤로 선택된 학생을 화면 중앙에 표시
        studentElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [selectedStudentId, isPresenterMode, isBlackout]);
  
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const query = searchQuery.toLowerCase();
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        `${student.grade}학년 ${student.class}반 ${student.number}번`
          .toLowerCase()
          .includes(query) ||
        `${student.grade}-${student.class}-${student.number}`.includes(query)
    );
  }, [students, searchQuery]);

  return (
    <div
      className="h-full flex flex-col"
      style={isPresenterMode ? {
        backgroundColor: 'var(--sidebar)',
        color: 'var(--sidebar-foreground)'
      } : {
        backgroundColor: 'var(--card)'
      }}
    >
      {!isPresenterMode && (
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold mb-3">
            학생 목록 ({students.length}명)
          </h2>
          <input
            type="text"
            placeholder="이름 또는 학년 반 번호 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
            style={{ 
              borderColor: 'var(--input)'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--ring)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--input)';
            }}
            aria-label="학생 검색"
          />
        </div>
      )}
      <div
        className={`flex-1 ${
          isPresenterMode ? "" : "overflow-y-auto custom-scrollbar"
        }`}
      >
        {filteredStudents.length === 0 ? (
          <div
            className="p-4 text-center"
            style={{ 
              color: isPresenterMode 
                ? 'var(--muted-foreground)' 
                : 'var(--muted-foreground)' 
            }}
          >
            {students.length === 0
              ? "학생 데이터가 없습니다."
              : "검색 결과가 없습니다."}
          </div>
        ) : (
          <ul
            className="divide-y"
            style={{
              borderColor: isPresenterMode ? 'var(--sidebar-border)' : 'var(--border)'
            }}
          >
            {filteredStudents.map((student, idx) => {
              let isInBlackout =
                isPresenterMode && typeof blackoutBetweenIdx === "number";
              let isSelected =
                !isInBlackout && selectedStudentId === student.id;
              
              // 화이트아웃 시작 시 첫 번째 학생 위에 마커 표시
              let items: JSX.Element[] = [];
              if (
                isPresenterMode &&
                typeof blackoutBetweenIdx === "number" &&
                blackoutBetweenIdx === -1 &&
                (pendingDirection === "next" || pendingDirection === "prev") &&
                idx === 0
              ) {
                items.push(
                  <li
                    key={`blackout-start-${idx}`}
                    aria-label="화이트아웃 마커"
                    className="flex items-center justify-center my-0 py-0"
                    style={{ lineHeight: 0, padding: 0 }}
                  >
                    <div 
                      className="relative w-5/6 h-0.5 rounded-full border opacity-60 flex items-center justify-center"
                      style={{
                        backgroundColor: 'var(--primary)',
                        borderColor: 'var(--ring)'
                      }}
                    >
                      <span 
                        className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs select-none leading-none"
                        style={{ color: 'var(--primary)' }}
                      >
                        ▲
                      </span>
                      <span 
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs select-none leading-none"
                        style={{ color: 'var(--primary)' }}
                      >
                        ▼
                      </span>
                    </div>
                  </li>
                );
              }
              
              items.push(
                <li
                  ref={(el) => {
                    if (el) {
                      studentRefs.current.set(student.id, el);
                    } else {
                      studentRefs.current.delete(student.id);
                    }
                  }}
                  key={student.id}
                  onClick={(e) => {
                    // 발표 모드에서 화이트아웃 상태일 때 클릭하면 화이트아웃 해제하고 해당 학생으로 이동
                    if (isPresenterMode && isBlackout) {
                      setBlackout(false);
                    }
                    setSelectedStudent(student.id);
                    // 클릭 후 포커스 제거 (검은 네모 박스 제거)
                    e.currentTarget.blur();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      // 발표 모드에서 화이트아웃 상태일 때 키보드로 선택하면 화이트아웃 해제하고 해당 학생으로 이동
                      if (isPresenterMode && isBlackout) {
                        setBlackout(false);
                      }
                      setSelectedStudent(student.id);
                      // 키보드 선택 후 포커스 제거
                      e.currentTarget.blur();
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${student.grade}학년 ${student.class}반 ${student.number}번 ${student.name}`}
                  className={`p-3 cursor-pointer transition-colors py-2 my-0 outline-none focus:outline-none ${
                    isSelected
                      ? "font-semibold"
                      : ""
                  }`}
                  style={isSelected
                    ? isPresenterMode
                      ? {
                          backgroundColor: 'var(--sidebar-primary)',
                          color: 'var(--sidebar-primary-foreground)'
                        }
                      : {
                          backgroundColor: 'var(--accent)',
                          color: 'var(--accent-foreground)'
                        }
                    : isPresenterMode
                    ? {
                        color: 'var(--sidebar-foreground)'
                      }
                    : undefined}
                  onMouseEnter={!isSelected ? (e) => {
                    if (isPresenterMode) {
                      e.currentTarget.style.backgroundColor = 'var(--sidebar-accent)';
                    } else {
                      e.currentTarget.style.backgroundColor = 'var(--accent)';
                    }
                  } : undefined}
                  onMouseLeave={!isSelected ? (e) => {
                    e.currentTarget.style.backgroundColor = '';
                  } : undefined}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {student.grade}학년 {student.class}반 {student.number}번
                    </span>
                    <span className="text-sm">{student.name}</span>
                  </div>
                  {student.evaluations.length > 0 && (
                    <div
                      className="text-xs mt-1"
                      style={{ 
                        color: 'var(--muted-foreground)' 
                      }}
                    >
                      평가 영역: {student.evaluations.length}개
                    </div>
                  )}
                </li>
              );
              // 다음/이전 방향에 따라 마커 위치 다르게 (화이트아웃 시작은 위에서 처리)
              if (
                isPresenterMode &&
                typeof blackoutBetweenIdx === "number" &&
                blackoutBetweenIdx !== -1 && // 화이트아웃 시작(-1)은 제외
                ((pendingDirection === "next" && blackoutBetweenIdx === idx) ||
                  (pendingDirection === "prev" &&
                    blackoutBetweenIdx === idx + 1)) &&
                idx < filteredStudents.length - 1
              ) {
                items.push(
                  <li
                    key={`blackout-${idx}`}
                    aria-label="블랙아웃 마커"
                    className="flex items-center justify-center my-0 py-0"
                    style={{ lineHeight: 0, padding: 0 }}
                  >
                    <div 
                      className="relative w-5/6 h-0.5 rounded-full border opacity-60 flex items-center justify-center"
                      style={{
                        backgroundColor: 'var(--primary)',
                        borderColor: 'var(--ring)'
                      }}
                    >
                      <span 
                        className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs select-none leading-none"
                        style={{ color: 'var(--primary)' }}
                      >
                        ▲
                      </span>
                      <span 
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs select-none leading-none"
                        style={{ color: 'var(--primary)' }}
                      >
                        ▼
                      </span>
                    </div>
                  </li>
                );
              }
              return items;
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
