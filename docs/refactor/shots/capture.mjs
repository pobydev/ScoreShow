/**
 * 빌드 결과(dist)를 실제 Chrome으로 열어 주요 화면을 같은 순서, 같은 데이터로 재현하고
 * 단계마다 PNG와 DOM 스냅샷(입력값, 포커스, 스크롤, 전체화면 포함)을 남깁니다.
 * 학생 이름과 점수는 모두 지어낸 값입니다.
 *
 * 사용: node docs/refactor/shots/capture.mjs <dist 폴더> <결과 폴더>
 * 필요: 저장소 밖에 설치한 playwright-core (PW_DIR 환경 변수에 그 폴더 경로), 설치된 Chrome.
 * 앱 의존성에 넣지 않으려고 저장소의 package.json에는 추가하지 않았습니다.
 */

import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import CryptoJS from "crypto-js";
import * as XLSX from "xlsx";

const [distArg, outArg] = process.argv.slice(2);
const dist = resolve(distArg);
const out = resolve(outArg);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const { chromium } = createRequire(join(resolve(process.env.PW_DIR), "x.js"))("playwright-core");
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";

const SECRET = "capture-fixed-key";
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".xlsx": "application/octet-stream",
};

const server = createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  let file = join(dist, pathname === "/" ? "index.html" : pathname);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, "index.html");
  res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;

// ---- 데이터 ----

const FAMILY = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
const fakeName = (i) => `${FAMILY[i % FAMILY.length]}가상${i + 1}`;

function niceMultiWorkbook(count) {
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
  return Buffer.from(XLSX.write(book, { type: "array", bookType: "xlsx" }));
}

const AREAS = ["쓰기1", "쓰기2", "말하기", "듣기", "읽기", "문법", "발표"];

function makeStudent(number, evaluations) {
  return {
    id: `2-1-${number}`,
    grade: 2,
    class: 1,
    number,
    name: fakeName(number - 1),
    evaluations,
  };
}

function evals(count) {
  return Array.from({ length: count }, (_, i) => ({
    area: AREAS[i],
    score: i * 2 + 3,
    maxScore: 20,
  }));
}

/** 평가 수 1~7개, 0개, 미입력, 만점 0을 차례로 포함한 학생 40명 */
function mixedStudents() {
  const students = [1, 2, 3, 4, 5, 6, 7].map((count) => makeStudent(count, evals(count)));
  students[2].evaluations[1].score = null;
  students.push(makeStudent(8, []));
  students.push(makeStudent(9, [{ area: "쓰기1", score: 0, maxScore: 0 }]));
  for (let number = 10; number <= 40; number++) students.push(makeStudent(number, evals(3)));
  return students;
}

const encrypt = (students) => CryptoJS.AES.encrypt(JSON.stringify(students), SECRET).toString();

// ---- 브라우저 ----

// 글자 안티앨리어싱이 실행마다 달라지지 않도록 렌더링 방식을 고정합니다.
const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--disable-lcd-text", "--disable-gpu", "--force-color-profile=srgb"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  locale: "ko-KR",
  timezoneId: "Asia/Seoul",
  serviceWorkers: "block",
});
const page = await context.newPage();

const trace = [];
let consoleEntries = [];
let answerConfirm = false;
const dialogs = [];

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) {
    consoleEntries.push(`${message.type()}: ${message.text().replaceAll(origin, "")}`);
  }
});
page.on("pageerror", (error) => consoleEntries.push(`pageerror: ${error.message}`));
page.on("dialog", async (dialog) => {
  dialogs.push(dialog.message());
  if (answerConfirm) await dialog.accept();
  else await dialog.dismiss();
});

const snapshotInPage = () => {
  const serialize = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const attrs = [...node.attributes]
      .map((a) => `${a.name}="${a.value}"`)
      .sort()
      .join(" ");
    const live = node.tagName === "INPUT" ? ` live-value="${node.value}"` : "";
    const hover = node.matches(":hover") ? " :hover" : "";
    const body = [...node.childNodes].map(serialize).join("");
    return `<${node.tagName.toLowerCase()} ${attrs}${live}${hover}>${body}</>\n`;
  };
  const active = document.activeElement;
  const describe = active && active !== document.body
    ? `${active.tagName} ${active.getAttribute("aria-label") || active.getAttribute("placeholder") || active.getAttribute("type") || ""}`
    : "body";
  const scrolls = [...document.querySelectorAll(".overflow-y-auto")].map((el) => Math.round(el.scrollTop));
  return {
    dom: serialize(document.getElementById("root")),
    active: describe,
    scrolls,
    fullscreen: !!document.fullscreenElement,
    width: window.innerWidth,
  };
};

async function settle() {
  let last = "";
  for (let i = 0; i < 40; i++) {
    const now = await page.evaluate(() =>
      [...document.querySelectorAll(".overflow-y-auto, .overflow-hidden")].map((el) => el.scrollTop).join()
    );
    if (now === last && i >= 3) return;
    last = now;
    await page.waitForTimeout(80);
  }
}

async function step(name, { shot = false } = {}) {
  await settle();
  const snapshot = await page.evaluate(snapshotInPage);
  snapshot.dom = snapshot.dom.replaceAll(origin, "");
  trace.push({ name, ...snapshot, console: consoleEntries, dialogs: dialogs.splice(0) });
  consoleEntries = [];
  if (shot) {
    // 포인터 이동 뒤 hover 전환이 끝나기를 기다려 찍을 때마다 같은 픽셀이 나오게 합니다.
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(out, `${name}.png`), animations: "disabled" });
  }
}

async function seed(students) {
  await page.goto(origin);
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
    { key: SECRET, cipher: students ? encrypt(students) : null }
  );
  await page.reload();
  await page.waitForTimeout(150);
}

const row = (label) => page.locator(`li[role="button"][aria-label="${label}"]`);
const rowOf = (number) => row(`2학년 1반 ${number}번 ${fakeName(number - 1)}`);
const key = async (name) => {
  await page.keyboard.press(name);
  await page.waitForTimeout(60);
};
const button = (text) => page.getByRole("button", { name: text, exact: false });
const waitNoAlert = () => page.waitForFunction(() => !document.querySelector('[role="alert"]'), null, { timeout: 8000 });

// ---- 1. 파일 선택과 학생 목록 ----

await seed(null);
await step("01-file-picker-empty", { shot: true });
await page.setViewportSize({ width: 800, height: 900 });
await step("01-file-picker-empty-narrow", { shot: true });
await page.setViewportSize({ width: 1440, height: 900 });

const fileInput = page.locator('input[type="file"]');
await fileInput.setInputFiles({ name: "memo.txt", mimeType: "text/plain", buffer: Buffer.from("가상") });
await page.waitForSelector('[role="alert"]');
await step("01-file-picker-unsupported", { shot: true });
await waitNoAlert();

await fileInput.setInputFiles({
  name: "nice.xlsx",
  mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  buffer: niceMultiWorkbook(30),
});
await page.waitForSelector('[role="alert"]');
await step("02-upload-message", { shot: true });
await waitNoAlert();
await step("02-student-list", { shot: true });
await page.setViewportSize({ width: 800, height: 900 });
await step("02-student-list-narrow", { shot: true });
await page.setViewportSize({ width: 1440, height: 900 });

await page.reload();
await page.waitForTimeout(150);
await step("02-after-reload");

const search = page.getByLabel("학생 검색");
await search.focus();
await step("02-search-focus");
await search.fill("이가상");
await step("02-search-by-name", { shot: true });
await search.fill("2학년 1반 3번");
await step("02-search-by-class");
await search.fill("2-1-12");
await step("02-search-by-id");
await search.fill("없는학생");
await step("02-search-empty", { shot: true });
await search.fill("");
await page.locator("h2").first().click();
await step("02-search-cleared");

const uploadedRow = (number) => row(`2학년 1반 ${number}번 ${fakeName(number - 1)}`);
await uploadedRow(3).click();
await page.mouse.move(0, 0);
await step("03-preview-selected", { shot: true });
await uploadedRow(5).focus();
await key("Enter");
await step("03-row-enter");
await uploadedRow(6).focus();
await key(" ");
await step("03-row-space");
await uploadedRow(7).focus();
await key("a");
await step("03-row-other-key");
await page.locator("h2").first().click();
await uploadedRow(8).hover();
await step("02-list-row-hover", { shot: true });
await page.mouse.move(0, 0);
await step("02-list-row-leave");

await button("발표 모드 시작").hover();
await step("03-start-button-hover");
await page.locator('button[aria-label="모든 데이터 삭제"]').hover();
await step("03-delete-button-hover");
await page.mouse.move(0, 0);

answerConfirm = false;
await page.locator('button[aria-label="모든 데이터 삭제"]').click();
await page.mouse.move(0, 0);
await step("03-delete-dismissed");
answerConfirm = true;
await page.locator('button[aria-label="모든 데이터 삭제"]').click();
await page.mouse.move(0, 0);
await step("03-delete-accepted", { shot: true });
await page.reload();
await page.waitForTimeout(150);
await step("03-delete-after-reload");

// ---- 2. 미리보기와 편집 ----

await seed(mixedStudents());
await step("04-preview-1-eval", { shot: true });
await rowOf(3).click();
await page.mouse.move(0, 0);
await step("04-preview-3-evals-null", { shot: true });
await rowOf(7).click();
await page.mouse.move(0, 0);
await step("04-preview-7-evals", { shot: true });
await rowOf(8).click();
await page.mouse.move(0, 0);
await step("04-preview-no-evals", { shot: true });
await rowOf(9).click();
await page.mouse.move(0, 0);
await step("04-preview-zero-max", { shot: true });

await rowOf(3).click();
const unlock = page.locator('button[aria-label="점수 편집 모드 전환"]');
await unlock.click();
await page.mouse.move(0, 0);
await step("05-edit-dialog", { shot: true });
await page.getByRole("heading", { name: "점수 잠금 해제" }).click();
await step("05-edit-dialog-inner-click");
await page.mouse.click(5, 5);
await step("05-edit-dialog-backdrop-cancel");
await unlock.click();
await page.getByRole("button", { name: "취소" }).hover();
await step("05-edit-dialog-cancel-hover");
await page.getByRole("button", { name: "취소" }).click();
await step("05-edit-dialog-cancelled");
await unlock.click();
await page.getByRole("button", { name: "해제하기" }).click();
await page.mouse.move(0, 0);
await page.waitForTimeout(120);
await step("05-edit-mode", { shot: true });

const numberInputs = page.locator('input[type="number"]');
await page.getByPlaceholder("평가 영역 이름").first().click();
await page.keyboard.press("End");
await page.keyboard.type("A");
await page.waitForTimeout(120);
await step("05-edit-area-typed");
await numberInputs.nth(0).click();
await step("05-edit-score-clicked");
await page.keyboard.press("Control+A");
await page.keyboard.type("7");
await page.waitForTimeout(120);
await step("05-edit-score-typed");
await numberInputs.nth(0).click();
await page.keyboard.press("Control+A");
await page.keyboard.press("Delete");
await page.waitForTimeout(120);
await step("05-edit-score-cleared");
await numberInputs.nth(1).click();
await page.keyboard.press("Control+A");
await page.keyboard.press("Delete");
await page.waitForTimeout(120);
await step("05-edit-max-cleared");
await numberInputs.nth(1).click();
await page.keyboard.press("Control+A");
await page.keyboard.type("0");
await page.waitForTimeout(120);
await step("05-edit-max-zero");
await numberInputs.nth(3).click();
await page.keyboard.press("Control+A");
await page.keyboard.type("30");
await page.waitForTimeout(120);
await step("05-edit-max-valid");
await numberInputs.nth(2).focus();
await page.keyboard.press("ArrowRight");
await page.keyboard.press("Tab");
await page.waitForTimeout(120);
await step("05-edit-tab");
await rowOf(2).click();
await page.mouse.move(0, 0);
await page.waitForTimeout(120);
await step("05-edit-switch-student");
await rowOf(8).click();
await page.mouse.move(0, 0);
await page.waitForTimeout(120);
await step("05-edit-no-evals");
await rowOf(3).click();
await unlock.click();
await page.mouse.move(0, 0);
await step("05-edit-locked", { shot: true });
await page.reload();
await page.waitForTimeout(150);
await rowOf(3).click();
await page.mouse.move(0, 0);
await step("05-edit-persisted");

// 첫 학생 id가 비어 선택이 없는 상태
const noSelection = mixedStudents().slice(0, 3);
noSelection[0].id = "";
await seed(noSelection);
await step("04-preview-no-selection", { shot: true });
await button("발표 모드 시작").hover();
await step("04-no-selection-start-hover");
await page.mouse.move(0, 0);
answerConfirm = false;
await page.locator('button[aria-label="모든 데이터 삭제"]').click();
await page.mouse.move(0, 0);
await step("04-no-selection-delete-dismissed");
await button("발표 모드 시작").click();
await page.mouse.move(0, 0);
await step("06-presenter-no-selection-start");
await key("Escape");
await step("06-presenter-no-selection-exit");

// ---- 3. 발표 ----

await seed(mixedStudents());
await button("발표 모드 시작").click();
await page.mouse.move(0, 0);
await step("06-presenter-1-eval", { shot: true });
await page.setViewportSize({ width: 700, height: 900 });
await step("06-presenter-1-eval-narrow", { shot: true });
await page.setViewportSize({ width: 1440, height: 900 });

await key("ArrowLeft");
await step("06-first-left-ignored");
await key("ArrowRight");
await step("06-blackout-next", { shot: true });
await key("ArrowRight");
await step("06-presenter-2-evals", { shot: true });
await key("ArrowLeft");
await step("06-blackout-prev", { shot: true });
await key("ArrowLeft");
await step("06-back-to-first");
await key("ArrowRight");
await key("ArrowLeft");
await step("06-next-then-left-cancels");
await key("ArrowDown");
await step("06-down-blackout");
await key("ArrowDown");
await step("06-down-moves");
await key("ArrowUp");
await step("06-up-blackout");
await key("ArrowRight");
await step("06-prev-then-right");
for (const [number, name] of [
  [3, "06-presenter-3-evals"],
  [4, "06-presenter-4-evals"],
  [5, "06-presenter-5-evals"],
  [6, "06-presenter-6-evals"],
  [7, "06-presenter-7-evals"],
  [8, "06-presenter-no-data"],
  [9, "06-presenter-zero-max"],
]) {
  await rowOf(number).click();
  await page.mouse.move(0, 0);
  await step(name, { shot: true });
  if (number === 8) {
    // 데이터 없음 화면에는 목록이 없으므로 키로 넘어갑니다.
    await key("ArrowRight");
    await step("06-no-data-blackout", { shot: true });
    await key("ArrowRight");
    await step("06-no-data-next");
    await key("ArrowLeft");
    await key("ArrowLeft");
    await step("06-back-to-no-data");
    await key("ArrowRight");
    await key("ArrowRight");
    await step("06-forward-again");
  }
}
await page.setViewportSize({ width: 1000, height: 800 });
await step("06-presenter-medium");
await page.setViewportSize({ width: 1440, height: 900 });

await key("ArrowRight");
await rowOf(20).click();
await page.mouse.move(0, 0);
await step("06-blackout-click-row", { shot: true });
await key("ArrowRight");
await page.locator('li[role="button"]').first().waitFor();
await step("06-blackout-scroll-kept");
await key("ArrowRight");
await step("06-blackout-scroll-next");

await rowOf(40).click();
await page.mouse.move(0, 0);
await step("06-last-student", { shot: true });
await key("ArrowRight");
await step("06-last-right-ignored");
await key("ArrowLeft");
await step("06-last-blackout-prev", { shot: true });
await key("ArrowRight");
await step("06-last-blackout-right-returns");
await key("ArrowLeft");
await key("ArrowLeft");
await step("06-last-moves-back");

await page.locator('button[aria-label="목록 접기"]').hover();
await step("07-collapse-hover");
await page.locator('button[aria-label="목록 접기"]').click();
await page.mouse.move(0, 0);
await step("07-list-collapsed", { shot: true });
await page.waitForTimeout(350);
await page.locator('button[aria-label="목록 펼치기"]').hover({ force: true }).catch(() => undefined);
await step("07-expand-hover");
await page.mouse.move(0, 0);
await key("ArrowRight");
await step("07-blackout-collapsed", { shot: true });
await page.locator('button[aria-label="목록 펼치기"]').click({ force: true }).catch(() => undefined);
await page.mouse.move(0, 0);
await step("07-blackout-expanded");
await page.locator('button[aria-label="목록 접기"]').click();
await page.mouse.move(0, 0);
await step("07-blackout-collapse-again");
await page.waitForTimeout(350);
await page.locator('button[aria-label="목록 펼치기"]').click({ force: true }).catch(() => undefined);
await page.mouse.move(0, 0);
await step("07-blackout-expand-again");
await key("ArrowRight");
await step("07-after-blackout");

await page.locator('button[aria-label="발표 모드 종료"]').hover();
await step("08-exit-hover", { shot: true });
await page.mouse.move(0, 0);
await step("08-exit-leave");

await key("f");
await page.waitForTimeout(300);
await step("08-fullscreen-on", { shot: true });
await page.locator('button[aria-label="전체화면 해제"]').hover().catch(() => undefined);
await step("08-fullscreen-button-hover");
await page.mouse.move(0, 0);
await page.locator('button[aria-label="전체화면 해제"]').click().catch(() => undefined);
await page.waitForTimeout(300);
await step("08-fullscreen-off-button");
await key("F");
await page.waitForTimeout(300);
await step("08-fullscreen-on-again");
await key("ArrowLeft");
await step("08-fullscreen-blackout", { shot: true });
await page.locator('button[aria-label="발표 모드 종료"]').click();
await page.mouse.move(0, 0);
await page.waitForTimeout(300);
await step("08-exit-from-blackout-fullscreen", { shot: true });

await button("발표 모드 시작").click();
await page.mouse.move(0, 0);
await step("08-reenter");
await key("f");
await page.waitForTimeout(300);
await key("Escape");
await page.waitForTimeout(300);
await step("08-escape-fullscreen");

await button("발표 모드 시작").click();
await page.mouse.move(0, 0);
await key("ArrowRight");
await key("Escape");
await step("08-escape-from-blackout");

await button("발표 모드 시작").click();
await page.mouse.move(0, 0);
await rowOf(8).click();
await page.mouse.move(0, 0);
await page.locator('button[aria-label="발표 모드 종료"]').click();
await page.mouse.move(0, 0);
await step("08-exit-from-no-data");

await button("발표 모드 시작").click();
await page.mouse.move(0, 0);
await page.locator('button[aria-label="발표 모드 종료"]').click();
await page.mouse.move(0, 0);
await step("08-exit-button");

// 화이트아웃에서 전체화면 없이 버튼으로 종료
await button("발표 모드 시작").click();
await page.mouse.move(0, 0);
await key("ArrowRight");
await page.locator('button[aria-label="발표 모드 종료"]').click();
await page.mouse.move(0, 0);
await step("08-exit-from-blackout-button");
await button("발표 모드 시작").click();
await page.mouse.move(0, 0);
await step("08-reenter-after-blackout-exit");
await key("Escape");

// Electron에서 버전 표시
await page.addInitScript(() => {
  window.electronAPI = { getVersion: () => "9.9.9" };
});
await page.reload();
await page.waitForTimeout(150);
await step("09-electron-version", { shot: true });

writeFileSync(join(out, "trace.json"), JSON.stringify(trace, null, 1));
await browser.close();
server.close();
console.log(`${trace.length} steps, ${trace.filter((t) => t.console.length).length} steps with console output`);
