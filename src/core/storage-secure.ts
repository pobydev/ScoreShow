import { get, set, clear } from "idb-keyval";
import CryptoJS from "crypto-js";
import type { Student } from "../types";

const STORAGE_KEY = "scoreshow-data";
const KEY_STORAGE_KEY = "scoreshow-encryption-key";
const LEGACY_ENCRYPTION_KEY = "scoreshow-default-key";

function getOrCreateEncryptionKey(): string {
  if (typeof window === "undefined") {
    return LEGACY_ENCRYPTION_KEY;
  }

  try {
    const existing = window.localStorage.getItem(KEY_STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const nextKey = CryptoJS.lib.WordArray.random(32).toString();
    window.localStorage.setItem(KEY_STORAGE_KEY, nextKey);
    return nextKey;
  } catch {
    return LEGACY_ENCRYPTION_KEY;
  }
}

function encrypt(data: Student[], key: string): string {
  return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
}

function decrypt(encrypted: string, key: string): Student[] {
  const bytes = CryptoJS.AES.decrypt(encrypted, key);
  const json = bytes.toString(CryptoJS.enc.Utf8);
  if (!json) {
    throw new Error("Invalid encrypted payload");
  }
  return JSON.parse(json) as Student[];
}

export async function saveStudents(students: Student[]): Promise<void> {
  const key = getOrCreateEncryptionKey();
  await set(STORAGE_KEY, encrypt(students, key));
}

export async function loadStudents(): Promise<Student[] | null> {
  const encrypted = await get<string>(STORAGE_KEY);
  if (!encrypted) {
    return null;
  }

  const activeKey = getOrCreateEncryptionKey();
  const candidateKeys = [activeKey, LEGACY_ENCRYPTION_KEY].filter(
    (value, index, arr) => arr.indexOf(value) === index
  );

  for (const key of candidateKeys) {
    try {
      const students = decrypt(encrypted, key);
      if (key !== activeKey) {
        await set(STORAGE_KEY, encrypt(students, activeKey));
      }
      return students;
    } catch {
      // Try next key.
    }
  }

  return null;
}

export async function clearStorage(): Promise<void> {
  await clear();
}
