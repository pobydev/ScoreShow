/**
 * 학생 목록 및 검색 컴포넌트
 */

import { MagnifyingGlass } from "@phosphor-icons/react";
import { Fragment, useState, useMemo } from "react";
import { waitNeighbors } from "../core/waitFlow";
import { useStore } from "../store/store";
import { BlackoutMarker } from "./studentList/BlackoutMarker";
import { StudentRow } from "./studentList/StudentRow";
import { filterStudents } from "./studentList/filterStudents";
import { useScrollSelectedIntoView } from "./studentList/useScrollSelectedIntoView";

export function StudentList() {
  const { students, selectedStudentId, isBlackout, waitGap, showStudent } = useStore();
  const [searchQuery, setSearchQuery] = useState("");

  const { above, below } = waitNeighbors(students, waitGap);
  const activeId = isBlackout ? (below ?? above)?.id ?? null : selectedStudentId;
  const { studentRefs, listRef } = useScrollSelectedIntoView(activeId, isBlackout);

  const filteredStudents = useMemo(
    () => filterStudents(students, searchQuery),
    [students, searchQuery]
  );

  // 한 반만 있으면 줄에는 번호만 적고, 여러 반이 섞여 있으면 반까지 적습니다.
  const showClass = useMemo(
    () => new Set(students.map((s) => `${s.grade}-${s.class}`)).size > 1,
    [students]
  );

  // 막대는 아래 학생 줄 앞에 끼웁니다. 아래 학생이 없으면 마지막 학생 줄 뒤입니다.
  const markerBeforeId = isBlackout ? below?.id : undefined;
  const markerAfterId = isBlackout && !below ? above?.id : undefined;

  return (
    <div className="h-full flex flex-col gap-2 text-ink">
      <div className="relative flex-shrink-0">
        <MagnifyingGlass
          size={15}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-soft"
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="이름 또는 번호 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 pl-8 pr-2.5 text-small bg-card border border-control rounded-input"
          aria-label="학생 검색"
        />
      </div>
      <div className="section-label flex-shrink-0 mt-1">STUDENTS</div>
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto">
        {filteredStudents.length === 0 ? (
          <div className="p-4 text-center text-body text-soft">검색 결과가 없습니다.</div>
        ) : (
          <ul className="flex flex-col gap-1 pt-1.5 pb-3" aria-label="학생 목록">
            {filteredStudents.map((student) => (
              <Fragment key={student.id}>
                {markerBeforeId === student.id && <BlackoutMarker />}
                <StudentRow
                  student={student}
                  showClass={showClass}
                  isSelected={!isBlackout && selectedStudentId === student.id}
                  rowRef={(el) => {
                    if (el) {
                      studentRefs.current.set(student.id, el);
                    } else {
                      studentRefs.current.delete(student.id);
                    }
                  }}
                  onSelect={() => showStudent(student.id)}
                />
                {markerAfterId === student.id && <BlackoutMarker />}
              </Fragment>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
