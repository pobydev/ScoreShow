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
  ".ttf": "font/ttf",
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

/** 첫 학생 id가 비어 고른 학생이 없는 상태 */
export function noSelectionStudents() {
  const students = mixedStudents().slice(0, 3);
  students[0].id = "";
  return students;
}

function niceSheet(count) {
  const rows = [
    ["2025학년도 1학기 수행평가 일람표", "", "", "", "", "", ""],
    ["2학년 1강의실", "", "", "", "", "", ""],
    ["반/번호", "성명", "쓰기1 (서·논술)", "", "말하기", "듣기", "비고"],
    ["", "", "만점 10.00", "", "만점 20.00", "만점 5", ""],
  ];
  for (let i = 0; i < count; i++) {
    rows.push([`1/${i + 1}`, fakeName(i), (i % 10) + 0.5, "", (i * 3) % 21, i % 6, ""]);
  }
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!merges"] = ["A1:G1", "A2:G2", "C3:D3", "C4:D4"].map((r) => XLSX.utils.decode_range(r));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Sheet1");
  return book;
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function xlsxFile(count, name = "가상 수행평가.xlsx") {
  return {
    name,
    mimeType: XLSX_MIME,
    buffer: Buffer.from(XLSX.write(niceSheet(count), { type: "array", bookType: "xlsx" })),
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

const encrypt = (students) => CryptoJS.AES.encrypt(JSON.stringify(students), SECRET).toString();

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
          if (cipher) tx.objectStore("keyval").put(cipher, "scoreshow-data");
          else tx.objectStore("keyval").clear();
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
  if (students?.length) await page.locator('li[role="button"]').first().waitFor();
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
          const request = open.result.transaction("keyval").objectStore("keyval").get("scoreshow-data");
          request.onsuccess = () => {
            open.result.close();
            done(request.result ?? null);
          };
        };
      })
  );
}

/** 브라우저에 진짜 파일 끌어다 놓기 신호를 보냅니다. */
export async function dropFileAt(page, path, x, y) {
  const cdp = await page.context().newCDPSession(page);
  const data = { items: [], files: [path], dragOperationsMask: 1 };
  await cdp.send("Input.dispatchDragEvent", { type: "dragEnter", x, y, data });
  await cdp.send("Input.dispatchDragEvent", { type: "dragOver", x, y, data });
  await cdp.send("Input.dispatchDragEvent", { type: "drop", x, y, data });
  await cdp.detach();
}

export function ui(page) {
  const button = (name) => page.getByRole("button", { name });
  return {
    fileInput: page.locator('input[type="file"]'),
    /** 파일 선택 창을 여는 것: 지금 화면은 입력칸, 새 화면은 버튼 */
    filePick: button(/파일 선택|다른 파일 열기/).or(page.getByLabel("Select spreadsheet file")).first(),
    /** 파일을 놓는 곳: 새 화면의 놓는 칸, 없으면 파일 입력칸 */
    dropTarget: page.locator('[data-dropzone="true"]').or(page.getByLabel("Select spreadsheet file")).first(),
    /** 안내 창이 열려 있으면 창 안의 것이 뒤에 옵니다. */
    template: button(/Download Template|표준 서식 받기/).last(),
    guide: button(/^사용 안내$/).first(),
    search: page.getByLabel("학생 검색"),
    rows: page.locator('li[role="button"]'),
    row: (number, classNumber = 1) =>
      button(new RegExp(`^2학년 ${classNumber}반 ${number}번 `)).filter({ hasText: fakeName(number - 1) }),
    start: button(/^발표( 모드)? 시작$/),
    stop: button(/^발표\s?(모드)?\s?종료$/),
    edit: button(/^(점수 편집 모드 전환|점수 수정|수정 마침)/),
    remove: button(/데이터 삭제/),
    collapse: button("목록 접기", { exact: true }),
    expand: button("목록 펼치기", { exact: true }),
    exitFullscreen: button("전체화면 해제", { exact: true }),
    alert: page.getByRole("alert"),
    markers: page.locator('li[aria-label$="마커"]'),
    presenterTitle: page.getByRole("heading", { level: 1, name: /학년/ }),
    areaInputs: page.getByPlaceholder("평가 영역 이름"),
    numberInputs: page.locator('input[type="number"]'),
  };
}

/** 사용 안내가 창 안에 있는 화면이면 열고, 항상 보이는 화면이면 그대로 둡니다. */
export async function openGuideIfAny(app) {
  if (await app.ui.guide.count()) await app.ui.guide.click();
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
