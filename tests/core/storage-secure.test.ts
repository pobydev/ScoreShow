import CryptoJS from "crypto-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearStorage, loadStudents, saveStudents } from "../../src/core/storage-secure";
import type { Student } from "../../src/types";

const idb = vi.hoisted(() => new Map<string, unknown>());

vi.mock("idb-keyval", () => ({
  get: async (key: string) => idb.get(key),
  set: async (key: string, value: unknown) => {
    idb.set(key, value);
  },
  clear: async () => {
    idb.clear();
  },
}));

const DATA_KEY = "scoreshow-data";
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

function decrypt(cipher: unknown, key: string) {
  return CryptoJS.AES.decrypt(cipher as string, key).toString(CryptoJS.enc.Utf8);
}

beforeEach(() => {
  idb.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("암호화 저장", () => {
  it("저장한 값은 AES 암호문이고 이름과 점수가 평문으로 드러나지 않는다", async () => {
    stubWindow();
    await saveStudents(STUDENTS);
    const stored = idb.get(DATA_KEY) as string;
    expect(stored.startsWith("U2FsdGVk")).toBe(true);
    expect(stored).not.toContain("가상");
    expect(stored).not.toContain("듣기");
  });

  it("저장한 값을 그대로 다시 읽는다", async () => {
    stubWindow();
    await saveStudents(STUDENTS);
    expect(await loadStudents()).toEqual(STUDENTS);
  });

  it("처음 저장할 때 임의 키를 만들어 localStorage에 두고 계속 쓴다", async () => {
    const local = stubWindow();
    await saveStudents(STUDENTS);
    const key = local.get(SECRET_KEY) as string;
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.parse(decrypt(idb.get(DATA_KEY), key))).toEqual(STUDENTS);
    await saveStudents(STUDENTS);
    expect(local.get(SECRET_KEY)).toBe(key);
  });

  it("저장된 값이 없으면 null이다", async () => {
    stubWindow();
    expect(await loadStudents()).toBeNull();
  });

  it("이전 고정 키로 암호화된 값은 읽은 뒤 현재 키로 다시 암호화한다", async () => {
    const local = stubWindow();
    idb.set(DATA_KEY, CryptoJS.AES.encrypt(JSON.stringify(STUDENTS), LEGACY_KEY).toString());
    expect(await loadStudents()).toEqual(STUDENTS);
    expect(JSON.parse(decrypt(idb.get(DATA_KEY), local.get(SECRET_KEY) as string))).toEqual(STUDENTS);
  });

  it("어떤 키로도 풀리지 않거나 값이 손상되면 null이다", async () => {
    stubWindow();
    idb.set(DATA_KEY, CryptoJS.AES.encrypt(JSON.stringify(STUDENTS), "다른 키").toString());
    expect(await loadStudents()).toBeNull();
    idb.set(DATA_KEY, "손상된 값");
    expect(await loadStudents()).toBeNull();
  });

  it("clearStorage는 저장된 데이터를 지운다", async () => {
    stubWindow();
    await saveStudents(STUDENTS);
    await clearStorage();
    expect(idb.size).toBe(0);
    expect(await loadStudents()).toBeNull();
  });
});

describe("암호화 저장의 이상 동작", () => {
  it("[Q-31] 복호화 키가 암호문과 같은 브라우저 저장소에 평문으로 있다", async () => {
    const local = stubWindow();
    await saveStudents(STUDENTS);
    expect(decrypt(idb.get(DATA_KEY), local.get(SECRET_KEY) as string)).toContain("김가상");
  });

  it("[Q-31] clearStorage는 localStorage의 암호화 키도 지운다", async () => {
    const local = stubWindow();
    await saveStudents(STUDENTS);
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

  it("[Q-31] localStorage를 쓸 수 없으면 코드에 적힌 고정 키로 암호화한다", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("차단됨");
        },
      },
    });
    await saveStudents(STUDENTS);
    expect(JSON.parse(decrypt(idb.get(DATA_KEY), LEGACY_KEY))).toEqual(STUDENTS);
  });
});
