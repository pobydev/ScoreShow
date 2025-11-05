/**
 * IndexedDB 저장소 관리 및 암호화
 */

import { get, set, clear } from "idb-keyval";
import CryptoJS from "crypto-js";
import type { Student } from "../types";

const STORAGE_KEY = "scoreshow-data";
const ENCRYPTION_KEY = "scoreshow-default-key"; // 실제 사용 시 사용자가 설정한 키 사용

/**
 * 데이터 암호화
 */
function encrypt(data: Student[]): string {
  const json = JSON.stringify(data);
  return CryptoJS.AES.encrypt(json, ENCRYPTION_KEY).toString();
}

/**
 * 데이터 복호화
 */
function decrypt(encrypted: string): Student[] {
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  const json = bytes.toString(CryptoJS.enc.Utf8);
  return JSON.parse(json);
}

/**
 * 학생 데이터를 IndexedDB에 저장합니다.
 */
export async function saveStudents(students: Student[]): Promise<void> {
  try {
    const encrypted = encrypt(students);
    await set(STORAGE_KEY, encrypted);
    if (import.meta.env.DEV) {
      console.log("[Storage] Students saved:", students.length);
    }
  } catch (error) {
    console.error("[Storage] Failed to save:", error);
    throw error;
  }
}

/**
 * IndexedDB에서 학생 데이터를 불러옵니다.
 */
export async function loadStudents(): Promise<Student[] | null> {
  try {
    const encrypted = await get<string>(STORAGE_KEY);
    if (!encrypted) return null;
    const students = decrypt(encrypted);
    if (import.meta.env.DEV) {
      console.log("[Storage] Students loaded:", students.length);
    }
    return students;
  } catch (error) {
    console.error("[Storage] Failed to load:", error);
    return null;
  }
}

/**
 * IndexedDB의 모든 데이터를 삭제합니다.
 */
export async function clearStorage(): Promise<void> {
  try {
    await clear();
    if (import.meta.env.DEV) {
      console.log("[Storage] All data cleared");
    }
  } catch (error) {
    console.error("[Storage] Failed to clear:", error);
    throw error;
  }
}

/**
 * 데이터를 JSON으로 내보냅니다.
 */
export function exportData(students: Student[]): string {
  const encrypted = encrypt(students);
  return JSON.stringify({ encrypted, version: "1.0" }, null, 2);
}

/**
 * JSON 데이터를 가져옵니다.
 */
export function importData(json: string): Student[] {
  const parsed = JSON.parse(json);
  if (parsed.encrypted) {
    return decrypt(parsed.encrypted);
  }
  // 암호화되지 않은 형식도 지원 (마이그레이션)
  return parsed as Student[];
}
