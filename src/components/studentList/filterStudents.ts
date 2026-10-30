import type { Student } from "../../types";

/**
 * 이름, "N학년 N반 N번", "학년-반-번호"로 학생을 찾습니다.
 */
export function filterStudents(students: Student[], searchQuery: string): Student[] {
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
}
