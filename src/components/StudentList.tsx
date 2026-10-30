/**
 * 학생 목록 및 검색 컴포넌트
 */

import { Fragment, useState, useMemo } from "react";
import { useStore } from "../store/store";
import { BlackoutMarker } from "./studentList/BlackoutMarker";
import { StudentRow } from "./studentList/StudentRow";
import { filterStudents } from "./studentList/filterStudents";
import { useScrollSelectedIntoView } from "./studentList/useScrollSelectedIntoView";

export function StudentList({
  blackoutBetweenIdx,
  pendingDirection,
}: { blackoutBetweenIdx?: number; pendingDirection?: "next" | "prev" } = {}) {
  const { students, selectedStudentId, setSelectedStudent, isPresenterMode, isBlackout, setBlackout } =
    useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const studentRefs = useScrollSelectedIntoView(selectedStudentId, isPresenterMode, isBlackout);

  const filteredStudents = useMemo(
    () => filterStudents(students, searchQuery),
    [students, searchQuery]
  );

  const isInBlackout = isPresenterMode && typeof blackoutBetweenIdx === "number";

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
          <div className="p-4 text-center" style={{ color: 'var(--muted-foreground)' }}>
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
              // 화이트아웃 시작 시 첫 번째 학생 위에 마커 표시
              const showStartMarker =
                isInBlackout &&
                blackoutBetweenIdx === -1 &&
                (pendingDirection === "next" || pendingDirection === "prev") &&
                idx === 0;
              // 다음/이전 방향에 따라 마커 위치 다르게 (화이트아웃 시작은 위에서 처리)
              const showBetweenMarker =
                isInBlackout &&
                blackoutBetweenIdx !== -1 &&
                ((pendingDirection === "next" && blackoutBetweenIdx === idx) ||
                  (pendingDirection === "prev" &&
                    blackoutBetweenIdx === idx + 1)) &&
                idx < filteredStudents.length - 1;

              // 순번을 key로 두어 검색으로 순번이 바뀐 줄은 새로 만들어지게 합니다.
              return (
                <Fragment key={idx}>
                  {showStartMarker && (
                    <BlackoutMarker key={`blackout-start-${idx}`} label="화이트아웃 마커" />
                  )}
                  <StudentRow
                    key={student.id}
                    student={student}
                    isSelected={!isInBlackout && selectedStudentId === student.id}
                    isPresenterMode={isPresenterMode}
                    rowRef={(el) => {
                      if (el) {
                        studentRefs.current.set(student.id, el);
                      } else {
                        studentRefs.current.delete(student.id);
                      }
                    }}
                    onSelect={() => {
                      // 발표 모드에서 화이트아웃 상태일 때 선택하면 화이트아웃 해제하고 해당 학생으로 이동
                      if (isPresenterMode && isBlackout) {
                        setBlackout(false);
                      }
                      setSelectedStudent(student.id);
                    }}
                  />
                  {showBetweenMarker && (
                    <BlackoutMarker key={`blackout-${idx}`} label="블랙아웃 마커" />
                  )}
                </Fragment>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
