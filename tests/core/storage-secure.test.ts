import CryptoJS from "crypto-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearStorage,
  loadLists,
  MIGRATED_LIST_NAME,
  putList,
  removeLists,
} from "../../src/core/storage-secure";
import type { Student } from "../../src/types";

const idb = vi.hoisted(() => new Map<string, unknown>());

vi.mock("idb-keyval", () => ({
  get: async (key: string) => idb.get(key),
  del: async (key: string) => {
    idb.delete(key);
  },
  update: async (key: string, fn: (value: unknown) => unknown) => {
    idb.set(key, fn(idb.get(key)));
  },
  clear: async () => {
    idb.clear();
  },
}));

const LISTS_KEY = "scoreshow-lists";
const OLD_DATA_KEY = "scoreshow-data";
const SECRET_KEY = "scoreshow-encryption-key";
const LEGACY_KEY = "scoreshow-default-key";

const STUDENTS: Student[] = [
  {
    id: "2-1-1",
    grade: 2,
    class: 1,
    number: 1,
    name: "김가상",
    evaluations: [{ area: "듣기", score: 8, maxScore: 10 }],
  },
];
const LIST = { name: "2학년 1반", savedAt: 1000, students: STUDENTS };

function stubWindow() {
  const local = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => local.get(key) ?? null,
      setItem: (key: string, value: string) => local.set(key, value),
      removeItem: (key: string) => local.delete(key),
    },
  });
  return local;
}

function decrypt(cipher: string, key: string) {
  return CryptoJS.AES.decrypt(cipher, key).toString(CryptoJS.enc.Utf8);
}

const stored = () => idb.get(LISTS_KEY) as { id: string; cipher: string }[];

beforeEach(() => {
  idb.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("암호화 저장", () => {
  it("목록 이름과 학생과 점수가 평문으로 드러나지 않는다", async () => {
    stubWindow();
    await putList(LIST);
    const [{ cipher }] = stored();
    expect(cipher.startsWith("U2FsdGVk")).toBe(true);
    const raw = JSON.stringify(stored());
    expect(raw).not.toContain("가상");
    expect(raw).not.toContain("듣기");
    expect(raw).not.toContain("2학년");
  });

  it("저장한 값을 그대로 다시 읽는다", async () => {
    stubWindow();
    const saved = await putList(LIST);
    expect(await loadLists()).toEqual([{ ...LIST, id: saved.id }]);
  });

  it("id를 주면 덮어쓰고, 없으면 새로 더한다", async () => {
    stubWindow();
    const first = await putList(LIST);
    await putList({ ...LIST, name: "다른 반" });
    await putList({ ...LIST, id: first.id, name: "바꾼 반" });
    const names = (await loadLists()).map((list) => ("name" in list ? list.name : null));
    expect(names).toEqual(["바꾼 반", "다른 반"]);
  });

  it("처음 저장할 때 임의 키를 만들어 localStorage에 두고 계속 쓴다", async () => {
    const local = stubWindow();
    await putList(LIST);
    const key = local.get(SECRET_KEY) as string;
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.parse(decrypt(stored()[0].cipher, key)).students).toEqual(STUDENTS);
    await putList(LIST);
    expect(local.get(SECRET_KEY)).toBe(key);
  });

  it("저장된 값이 없으면 빈 목록이다", async () => {
    stubWindow();
    expect(await loadLists()).toEqual([]);
  });

  it("목록 하나가 손상되어도 나머지는 읽는다", async () => {
    stubWindow();
    const saved = await putList(LIST);
    idb.set(LISTS_KEY, [...stored(), { id: "broken", cipher: "손상된 값" }]);
    expect(await loadLists()).toEqual([
      { ...LIST, id: saved.id },
      { id: "broken", unreadable: true },
    ]);
  });

  it("[Q-31] 복호화 키가 암호문과 같은 브라우저 저장소에 평문으로 있다", async () => {
    const local = stubWindow();
    await putList(LIST);
    expect(decrypt(stored()[0].cipher, local.get(SECRET_KEY) as string)).toContain("김가상");
  });

  it("[Q-31] localStorage를 쓸 수 없으면 코드에 적힌 고정 키로 암호화한다", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("차단됨");
        },
      },
    });
    await putList(LIST);
    expect(JSON.parse(decrypt(stored()[0].cipher, LEGACY_KEY)).students).toEqual(STUDENTS);
  });
});

describe("1.1.2 자료 옮기기", () => {
  it("현재 키로 암호화된 자료를 목록 하나로 옮기고 옛 자리를 비운다", async () => {
    const local = stubWindow();
    local.set(SECRET_KEY, "현재 키");
    idb.set(OLD_DATA_KEY, CryptoJS.AES.encrypt(JSON.stringify(STUDENTS), "현재 키").toString());
    const lists = await loadLists();
    expect(lists).toHaveLength(1);
    expect(lists[0]).toMatchObject({ name: MIGRATED_LIST_NAME, students: STUDENTS });
    expect(idb.has(OLD_DATA_KEY)).toBe(false);
    expect(await loadLists()).toHaveLength(1);
  });

  it("이전 고정 키로 암호화된 자료도 옮기고 현재 키로 다시 암호화한다", async () => {
    const local = stubWindow();
    idb.set(OLD_DATA_KEY, CryptoJS.AES.encrypt(JSON.stringify(STUDENTS), LEGACY_KEY).toString());
    const lists = await loadLists();
    expect(lists[0]).toMatchObject({ students: STUDENTS });
    expect(decrypt(stored()[0].cipher, local.get(SECRET_KEY) as string)).toContain("김가상");
  });

  it("풀리지 않는 자료는 지우지 않고 읽을 수 없는 목록으로 남긴다", async () => {
    stubWindow();
    idb.set(OLD_DATA_KEY, CryptoJS.AES.encrypt(JSON.stringify(STUDENTS), "다른 키").toString());
    const lists = await loadLists();
    expect(lists).toHaveLength(1);
    expect(lists[0]).toMatchObject({ unreadable: true });
    expect(idb.has(OLD_DATA_KEY)).toBe(false);
  });

  it("학생이 없는 자료는 목록을 만들지 않는다", async () => {
    stubWindow();
    idb.set(OLD_DATA_KEY, CryptoJS.AES.encrypt("[]", LEGACY_KEY).toString());
    expect(await loadLists()).toEqual([]);
    expect(idb.has(OLD_DATA_KEY)).toBe(false);
  });
});

describe("삭제", () => {
  it("removeLists는 고른 목록만 지우고 키를 남긴다", async () => {
    const local = stubWindow();
    const first = await putList(LIST);
    const second = await putList({ ...LIST, name: "다른 반" });
    await removeLists([first.id]);
    expect(stored().map((entry) => entry.id)).toEqual([second.id]);
    expect(local.has(SECRET_KEY)).toBe(true);
  });

  it("마지막 목록을 지우면 저장소와 키까지 비운다", async () => {
    const local = stubWindow();
    const only = await putList(LIST);
    await removeLists([only.id]);
    expect(idb.size).toBe(0);
    expect(local.has(SECRET_KEY)).toBe(false);
  });

  it("clearStorage는 저장된 데이터를 지운다", async () => {
    stubWindow();
    await putList(LIST);
    await clearStorage();
    expect(idb.size).toBe(0);
    expect(await loadLists()).toEqual([]);
  });

  it("[Q-31] clearStorage는 localStorage의 암호화 키도 지운다", async () => {
    const local = stubWindow();
    await putList(LIST);
    await clearStorage();
    expect(local.has(SECRET_KEY)).toBe(false);
  });

  it("[Q-31] localStorage를 쓸 수 없어도 clearStorage는 실패하지 않는다", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        removeItem: () => {
          throw new Error("차단됨");
        },
      },
    });
    await expect(clearStorage()).resolves.toBeUndefined();
  });
});
