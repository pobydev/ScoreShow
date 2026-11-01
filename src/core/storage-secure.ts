/**
 * 저장 목록 암호화 저장
 * 목록마다 따로 암호화하므로 하나가 손상되어도 나머지는 읽습니다.
 * 복호화 키가 같은 브라우저 저장소에 있어 앱을 켜는 사람은 읽을 수 있습니다. 저장 파일을 직접 여는 것만 막습니다.
 */

import { clear, del, get, update } from "idb-keyval";
import CryptoJS from "crypto-js";
import type { SavedList, Student, StoredList } from "../types";

const LISTS_KEY = "scoreshow-lists";
/** 1.1.2까지 학생 하나의 묶음만 저장하던 자리 */
const OLD_DATA_KEY = "scoreshow-data";
const KEY_STORAGE_KEY = "scoreshow-encryption-key";
const LEGACY_ENCRYPTION_KEY = "scoreshow-default-key";

export const MIGRATED_LIST_NAME = "이전에 저장한 점수";

interface StoredCipher {
  id: string;
  cipher: string;
}

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

function candidateKeys(): string[] {
  const activeKey = getOrCreateEncryptionKey();
  return activeKey === LEGACY_ENCRYPTION_KEY ? [activeKey] : [activeKey, LEGACY_ENCRYPTION_KEY];
}

function encrypt(data: unknown): string {
  return CryptoJS.AES.encrypt(JSON.stringify(data), getOrCreateEncryptionKey()).toString();
}

function decrypt(encrypted: string): unknown {
  for (const key of candidateKeys()) {
    try {
      const json = CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
      if (json) return JSON.parse(json);
    } catch {
      // 다음 키로 시도합니다.
    }
  }
  return null;
}

function createListId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readEntry({ id, cipher }: StoredCipher): StoredList {
  const data = decrypt(cipher) as Omit<SavedList, "id"> | null;
  if (data && typeof data.name === "string" && Array.isArray(data.students)) {
    return { id, name: data.name, savedAt: data.savedAt, students: data.students };
  }
  return { id, unreadable: true };
}

/** 1.1.2의 자료를 목록 하나로 옮깁니다. 풀 수 없는 값은 지우지 않고 읽을 수 없는 목록으로 남깁니다. */
async function migrateOldData(): Promise<void> {
  const old = await get<string>(OLD_DATA_KEY);
  if (!old) return;

  const students = decrypt(old) as Student[] | null;
  let cipher: string | null = old;
  if (Array.isArray(students)) {
    cipher =
      students.length > 0
        ? encrypt({ name: MIGRATED_LIST_NAME, savedAt: Date.now(), students })
        : null;
  }
  if (cipher) {
    const entry = { id: createListId(), cipher };
    await update<StoredCipher[]>(LISTS_KEY, (entries = []) => [...entries, entry]);
  }
  await del(OLD_DATA_KEY);
}

export async function loadLists(): Promise<StoredList[]> {
  await migrateOldData();
  const entries = (await get<StoredCipher[]>(LISTS_KEY)) ?? [];
  return entries.map(readEntry);
}

/** 새 목록을 저장합니다. id를 주면 그 목록을 덮어씁니다. */
export async function putList(
  list: Omit<SavedList, "id"> & { id?: string }
): Promise<SavedList> {
  const saved: SavedList = { ...list, id: list.id ?? createListId() };
  const { id, ...data } = saved;
  const entry = { id, cipher: encrypt(data) };
  await update<StoredCipher[]>(LISTS_KEY, (entries = []) =>
    entries.some((item) => item.id === id)
      ? entries.map((item) => (item.id === id ? entry : item))
      : [...entries, entry]
  );
  return saved;
}

export async function removeLists(ids: string[]): Promise<void> {
  let left = 0;
  await update<StoredCipher[]>(LISTS_KEY, (entries = []) => {
    const kept = entries.filter((item) => !ids.includes(item.id));
    left = kept.length;
    return kept;
  });
  if (left === 0) {
    await clearStorage();
  }
}

export async function clearStorage(): Promise<void> {
  await clear();
  // 데이터를 지우면 그 데이터를 풀던 키도 남길 이유가 없습니다.
  try {
    window.localStorage.removeItem(KEY_STORAGE_KEY);
  } catch {
    // localStorage를 쓸 수 없으면 지울 키도 없습니다.
  }
}
