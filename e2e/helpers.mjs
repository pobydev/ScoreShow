/**
 * 동작 시험 공통 도구: 정적 서버, 지어낸 시험 자료, 화면 찾기.
 * 학생 이름과 점수는 모두 지어낸 값입니다.
 *
 * 찾기(ui)는 지금 화면과 새 화면을 모두 받도록 이름을 넓게 잡았습니다.
 * 시험 본문은 화면 구조를 모릅니다. 그래서 같은 시험을 두 화면에 그대로 돌립니다.
 */

import { createServer } from "node:http";
import { createRequire } from "node:module";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import CryptoJS from "crypto-js";
import * as XLSX from "xlsx";

const pw = createRequire(join(resolve(process.env.PW_DIR), "x.js"))("@playwright/test");
export const expect = pw.expect;

const DIST = resolve(process.env.E2E_DIST || "dist");
const SECRET = "e2e-fixed-key";
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".otf": "font/otf",
  ".webmanifest": "application/manifest+json",
  ".xlsx": "application/octet-stream",
};

export const test = pw.test.extend({
  origin: [
    async ({}, use) => {
      const server = createServer((req, res) => {
        const pathname = new URL(req.url, "http://localhost").pathname;
        let file = join(DIST, pathname === "/" ? "index.html" : pathname);
        if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, "index.html");
        res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
        res.end(readFileSync(file));
      });
      await new Promise((done) => server.listen(0, "127.0.0.1", done));
      await use(`http://127.0.0.1:${server.address().port}`);
      server.close();
    },
    { scope: "worker" },
  ],

  // 페이지 오류가 나면 어떤 시험이든 실패합니다. 대화상자는 confirmAnswer대로 답합니다.
  app: async ({ page, origin }, use) => {
    const pageErrors = [];
    const external = [];
    const dialogs = [];
    const app = {
      page,
      origin,
      external,
      dialogs,
      confirmAnswer: false,
      ui: ui(page),
      goto: () => page.goto(origin),
      seed: (students) => seed(page, origin, students),
      key: (name) => page.keyboard.press(name),
      upload: (file) => page.locator('input[type="file"]').setInputFiles(file),
      /** 파일을 넣고 저장 창에서 이름을 정해 저장합니다. */
      uploadAndSave: async (file, name) => {
        await page.locator('input[type="file"]').setInputFiles(file);
        const input = page.getByLabel("목록 이름");
        await input.waitFor();
        if (name) await input.fill(name);
        await page.getByRole("button", { name: "저장", exact: true }).click();
        await page.getByRole("heading", { name: "이름을 정해 저장해 주세요" }).waitFor({ state: "detached" });
      },
    };
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("request", (request) => {
      const url = request.url();
      if (!url.startsWith(origin) && !url.startsWith("data:") && !url.startsWith("blob:")) external.push(url);
    });
    page.on("dialog", async (dialog) => {
      dialogs.push(dialog.message());
      if (app.confirmAnswer) await dialog.accept();
      else await dialog.dismiss();
    });
    await use(app);
    expect(pageErrors, "페이지 오류").toEqual([]);
  },
});

// ---- 지어낸 자료 ----

const FAMILY = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
export const fakeName = (i) => `${FAMILY[i % FAMILY.length]}가상${i + 1}`;
const AREAS = ["쓰기1", "쓰기2", "말하기", "듣기", "읽기", "문법", "발표"];

export function makeStudent(number, evaluations, classNumber = 1) {
  return {
    id: `2-${classNumber}-${number}`,
    grade: 2,
    class: classNumber,
    number,
    name: fakeName(number - 1),
    evaluations,
  };
}

export function evals(count) {
  return Array.from({ length: count }, (_, i) => ({ area: AREAS[i], score: i * 2 + 3, maxScore: 20 }));
}

/**
 * 1~7번은 평가 수가 번호와 같고, 3번의 둘째 평가는 미입력, 8번은 평가 없음,
 * 9번은 만점 0, 10~40번은 평가 3개입니다.
 */
export function mixedStudents() {
  const students = [1, 2, 3, 4, 5, 6, 7].map((count) => makeStudent(count, evals(count)));
  students[2].evaluations[1].score = null;
  students.push(makeStudent(8, []));
  students.push(makeStudent(9, [{ area: "쓰기1", score: 0, maxScore: 0 }]));
  for (let number = 10; number <= 40; number++) students.push(makeStudent(number, evals(3)));
  return students;
}

function niceSheet(count, classNumber = 1) {
  const rows = [
    [`2025학년도   1학기   중학교   2학년   ${classNumber} 과학`, "", "", "", "", "", ""],
    ["과목 : 과학", "", "", "", "", "", ""],
    ["반/번호", "성명", "쓰기1 (서·논술)", "", "말하기", "듣기", "비고"],
    ["", "", "만점 10.00", "", "만점 20.00", "만점 5", ""],
  ];
  for (let i = 0; i < count; i++) {
    rows.push([`${classNumber}/${i + 1}`, fakeName(i), (i % 10) + 0.5, "", (i * 3) % 21, i % 6, ""]);
  }
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!merges"] = ["A1:G1", "A2:G2", "C3:D3", "C4:D4"].map((r) => XLSX.utils.decode_range(r));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Sheet1");
  return book;
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function xlsxFile(count, name = "가상 수행평가.xlsx", classNumber = 1) {
  return {
    name,
    mimeType: XLSX_MIME,
    buffer: Buffer.from(XLSX.write(niceSheet(count, classNumber), { type: "array", bookType: "xlsx" })),
  };
}

export function xlsFile(count, name = "가상 수행평가.xls") {
  return {
    name,
    mimeType: "application/vnd.ms-excel",
    buffer: Buffer.from(XLSX.write(niceSheet(count), { type: "array", bookType: "biff8" })),
  };
}

const CSV_BODY =
  "﻿※ 사용 방법 안내\n학년,반,번호,이름,영역1 이름,영역1 만점,영역2 이름,영역2 만점\n" +
  ["2,1,1,김가상1,9,10,8,10", "2,1,2,이가상2,7,10,9,10", "2,1,3,박가상3,6,10,5,10"].join("\n") +
  "\n";

export function csvFile(name = "가상 수행평가.csv", mimeType = "text/csv") {
  return { name, mimeType, buffer: Buffer.from(CSV_BODY) };
}

/** 학생을 찾을 수 없는 파일 */
export function noStudentsXlsx() {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["가", "나", "다"], ["라", "마", "바"]]), "Sheet1");
  return {
    name: "빈 파일.xlsx",
    mimeType: XLSX_MIME,
    buffer: Buffer.from(XLSX.write(book, { type: "array", bookType: "xlsx" })),
  };
}

export function writeTempFile(testInfo, file) {
  const path = testInfo.outputPath(file.name);
  writeFileSync(path, file.buffer);
  return path;
}

// ---- 페이지 ----

const encrypt = (data) => CryptoJS.AES.encrypt(JSON.stringify(data), SECRET).toString();

async function writeStorage(page, cipher) {
  await page.evaluate(
    async ({ key, cipher }) => {
      localStorage.setItem("scoreshow-encryption-key", key);
      await new Promise((resolveOpen, rejectOpen) => {
        const open = indexedDB.open("keyval-store");
        open.onupgradeneeded = () => open.result.createObjectStore("keyval");
        open.onerror = () => rejectOpen(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction("keyval", "readwrite");
          tx.objectStore("keyval").clear();
          if (cipher) tx.objectStore("keyval").put(cipher, "scoreshow-data");
          tx.oncomplete = () => {
            open.result.close();
            resolveOpen();
          };
        };
      });
    },
    { key: SECRET, cipher }
  );
}

async function seed(page, origin, students) {
  await page.goto(origin);
  await writeStorage(page, students ? encrypt(students) : null);
  await page.reload();
  if (students?.length) {
    // 1.1.2 자리에 넣은 자료는 목록 하나로 옮겨집니다. 열면 대기 화면으로 시작합니다.
    await page.getByRole("button", { name: /이전에 저장한 점수.*저장/ }).click();
    await page.getByText(/대기 중입니다|모든 학생을 보여 주었습니다/).waitFor();
  }
}

/** 저장해 둔 목록을 그대로 넣습니다. savedAt으로 오래된 목록을 만들 수 있습니다. */
export async function seedLists(page, origin, lists) {
  await page.goto(origin);
  const entries = lists.map((list, index) => ({
    id: `seed-${index}`,
    cipher: encrypt({ name: list.name, savedAt: list.savedAt ?? Date.now(), students: list.students }),
  }));
  await page.evaluate(
    async ({ key, entries }) => {
      localStorage.setItem("scoreshow-encryption-key", key);
      await new Promise((resolveOpen, rejectOpen) => {
        const open = indexedDB.open("keyval-store");
        open.onupgradeneeded = () => open.result.createObjectStore("keyval");
        open.onerror = () => rejectOpen(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction("keyval", "readwrite");
          tx.objectStore("keyval").clear();
          tx.objectStore("keyval").put(entries, "scoreshow-lists");
          tx.oncomplete = () => {
            open.result.close();
            resolveOpen();
          };
        };
      });
    },
    { key: SECRET, entries }
  );
  await page.reload();
}

export async function seedRaw(page, origin, cipher) {
  await page.goto(origin);
  await writeStorage(page, cipher);
  await page.reload();
}

export function readStoredCipher(page) {
  return page.evaluate(
    () =>
      new Promise((done, fail) => {
        const open = indexedDB.open("keyval-store");
        open.onerror = () => fail(open.error);
        open.onsuccess = () => {
          const request = open.result.transaction("keyval").objectStore("keyval").get("scoreshow-lists");
          request.onsuccess = () => {
            open.result.close();
            done(request.result ?? null);
          };
        };
      })
  );
}

/** 브라우저에 진짜 파일 끌어다 놓기 신호를 보냅니다. 경로는 하나나 여럿(폴더 포함)을 줍니다. */
export async function dropFileAt(page, paths, x, y) {
  const cdp = await page.context().newCDPSession(page);
  const data = { items: [], files: [paths].flat(), dragOperationsMask: 1 };
  await cdp.send("Input.dispatchDragEvent", { type: "dragEnter", x, y, data });
  await cdp.send("Input.dispatchDragEvent", { type: "dragOver", x, y, data });
  // 사람이 끌 때는 dragover가 계속 옵니다. 놓는 칸이 커지며 다시 그려진 뒤의 dragover도 한 번 보냅니다.
  await new Promise((done) => setTimeout(done, 50));
  await cdp.send("Input.dispatchDragEvent", { type: "dragOver", x, y, data });
  await cdp.send("Input.dispatchDragEvent", { type: "drop", x, y, data });
  await cdp.detach();
}

/** 파일을 쥐고 창 위에 멈춰 있게 합니다. 돌려받은 함수로 놓지 않고 끝냅니다. */
export async function holdFilesAt(page, paths, x, y) {
  const cdp = await page.context().newCDPSession(page);
  const data = { items: [], files: [paths].flat(), dragOperationsMask: 1 };
  await cdp.send("Input.dispatchDragEvent", { type: "dragEnter", x, y, data });
  await cdp.send("Input.dispatchDragEvent", { type: "dragOver", x, y, data });
  // 사람이 쥐고 있을 때처럼 dragover를 계속 보냅니다.
  const timer = setInterval(() => {
    cdp.send("Input.dispatchDragEvent", { type: "dragOver", x, y, data }).catch(() => {});
  }, 200);
  return async () => {
    clearInterval(timer);
    await cdp.send("Input.dispatchDragEvent", { type: "dragCancel", x, y, data });
    await cdp.detach();
  };
}

export function ui(page) {
  const button = (name) => page.getByRole("button", { name });
  return {
    fileInput: page.locator('input[type="file"]'),
    filePick: button("파일 선택"),
    dropTarget: page.locator('[data-dropzone="true"]'),
    template: button("표준 서식 받기"),
    guide: button(/^스코어쇼 사용 가이드$/).first(),
    search: page.getByLabel("학생 검색"),
    rows: page.locator("[data-student-row]"),
    row: (number, classNumber = 1) =>
      button(new RegExp(`^2학년 ${classNumber}반 ${number}번 `)).filter({ hasText: fakeName(number - 1) }),
    wait: button("대기 화면", { exact: true }),
    waitText: page.getByText(/대기 중입니다|모든 학생을 보여 주었습니다/),
    showNumber: (number) => page.getByRole("button", { name: `${number}번 점수 보기`, exact: true }),
    marker: page.locator('li[aria-label="대기 위치"]'),
    edit: button(/^(점수 수정|수정 마침)/),
    removeList: button("이 목록 삭제"),
    removeAll: button("모두 지우기"),
    confirmDelete: page.getByRole("dialog").getByRole("button", { name: /^(삭제|모두 지우기)$/ }),
    switcher: page.locator('button[aria-haspopup="menu"]'),
    collapse: button("목록 접기", { exact: true }),
    expand: button("목록 펼치기", { exact: true }),
    exitFullscreen: button("전체화면 해제", { exact: true }),
    alert: page.getByRole("alert"),
    presenterTitle: page.getByRole("heading", { level: 1, name: /학년/ }),
    areaInputs: page.getByPlaceholder("평가 영역 이름"),
    score: (number, area) => page.getByLabel(`${number}번 ${area} 점수`, { exact: true }),
    max: (area) => page.getByLabel(`${area} 만점`, { exact: true }),
  };
}

/** 사용 가이드 창을 엽니다. 다시 읽은 직후에는 메뉴가 그려지기를 기다립니다. */
export async function openGuideIfAny(app) {
  await app.ui.guide.click();
}

export const bodyText = async (page) => {
  // 많이 돌릴 때 화면이 그려지기 전에 읽지 않도록 기다립니다.
  await page.waitForFunction(() => document.body.innerText.trim().length > 0);
  return page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
};

export const isFullscreen = (page) => page.evaluate(() => !!document.fullscreenElement);

/** 요소의 글자색이 CSS 변수 값과 같은지 비교할 수 있게 둘 다 돌려줍니다. */
export function colorAgainstVar(locator, variable) {
  return locator.evaluate((el, name) => {
    const probe = document.createElement("span");
    probe.style.color = `var(${name})`;
    document.body.appendChild(probe);
    const expected = getComputedStyle(probe).color;
    probe.remove();
    return { actual: getComputedStyle(el).color, expected };
  }, variable);
}

/** 가장 가까운 세로 스크롤 부모의 scrollTop */
export function scrollTopOf(locator) {
  return locator.evaluate((el) => {
    let node = el.parentElement;
    while (node) {
      const { overflowY } = getComputedStyle(node);
      if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
        return node.scrollTop;
      }
      node = node.parentElement;
    }
    return 0;
  });
}
