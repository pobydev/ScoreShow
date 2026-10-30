/**
 * 새 화면의 주요 상태를 지어낸 자료로 찍습니다.
 * 구조가 바뀌어 픽셀 비교에는 쓰지 않습니다. 사람이 눈으로 보는 증거입니다.
 *
 * 사용: PW_DIR=<폴더> node docs/refactor/shots/capture-rebuild.mjs <dist 폴더> <결과 폴더>
 */

import { createServer } from "node:http";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fakeName, mixedStudents, xlsxFile } from "../../../e2e/helpers.mjs";
import CryptoJS from "crypto-js";

const [distArg, outArg] = process.argv.slice(2);
const dist = resolve(distArg);
const out = resolve(outArg);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const { chromium } = createRequire(join(resolve(process.env.PW_DIR), "x.js"))("@playwright/test");

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".ttf": "font/ttf" };
const server = createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  let file = join(dist, pathname === "/" ? "index.html" : pathname);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, "index.html");
  res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-lcd-text", "--disable-gpu", "--force-color-profile=srgb"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: "ko-KR", serviceWorkers: "block" });
const page = await context.newPage();

const SECRET = "shots-fixed-key";
async function seed(students) {
  await page.goto(origin);
  await page.evaluate(
    async ({ key, cipher }) => {
      localStorage.setItem("scoreshow-encryption-key", key);
      await new Promise((done) => {
        const open = indexedDB.open("keyval-store");
        open.onupgradeneeded = () => open.result.createObjectStore("keyval");
        open.onsuccess = () => {
          const tx = open.result.transaction("keyval", "readwrite");
          if (cipher) tx.objectStore("keyval").put(cipher, "scoreshow-data");
          else tx.objectStore("keyval").clear();
          tx.oncomplete = () => {
            open.result.close();
            done();
          };
        };
      });
    },
    { key: SECRET, cipher: students ? CryptoJS.AES.encrypt(JSON.stringify(students), SECRET).toString() : null }
  );
  await page.reload();
  await page.waitForTimeout(250);
}

async function shot(name) {
  await page.mouse.move(0, 0);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, `${name}.png`), animations: "disabled" });
}

const size = (width, height) => page.setViewportSize({ width, height });
const row = (number) => page.getByRole("button", { name: `2학년 1반 ${number}번 ${fakeName(number - 1)}` });
const button = (name) => page.getByRole("button", { name });
const key = (name) => page.keyboard.press(name);

// 시작 화면
await seed(null);
await shot("01-start");
await button("사용 안내").click();
await shot("01-start-guide");
await key("Escape");
await page.locator('input[type="file"]').setInputFiles({ name: "memo.txt", mimeType: "text/plain", buffer: Buffer.from("가상") });
await shot("01-start-error");

// 작업 화면
await page.locator('input[type="file"]').setInputFiles(xlsxFile(30, "2학년 1반 가상 수행평가.xlsx"));
await page.locator('li[role="button"]').first().waitFor();
await shot("02-workspace-upload-message");
await seed(mixedStudents());
await row(3).click();
await shot("02-workspace");
await row(7).click();
await shot("02-workspace-7-evals");
await row(8).click();
await shot("02-workspace-no-evals");
await page.getByLabel("학생 검색").fill("이가상");
await shot("02-workspace-search");
await page.getByLabel("학생 검색").fill("");
await row(3).click();
await button("점수 수정").click();
await shot("02-workspace-edit-confirm");
await button("해제하기").click();
await page.waitForTimeout(150);
await shot("02-workspace-edit");
await button("수정 마침").click();
await button("사용 안내").click();
await shot("02-workspace-guide");
await key("Escape");

// 발표 화면
await seed(mixedStudents());
await button("발표 시작").click();
await shot("03-presenter-1-eval");
for (const [number, name] of [
  [3, "03-presenter-3-evals"],
  [7, "03-presenter-7-evals"],
  [8, "03-presenter-no-data"],
]) {
  await row(number).click();
  await shot(name);
}
await row(5).click();
await key("ArrowRight");
await shot("03-presenter-whiteout-marker");
await key("ArrowLeft");
await button("목록 접기").click();
await shot("03-presenter-collapsed");
await key("f");
await page.waitForTimeout(300);
await shot("03-presenter-fullscreen");
await key("f");
await key("Escape");

// 좁은 창
for (const [width, height] of [
  [787, 538],
  [640, 700],
  [480, 700],
]) {
  const tag = `${width}x${height}`;
  await size(width, height);
  await seed(null);
  await shot(`04-narrow-start-${tag}`);
  await seed(mixedStudents());
  await row(3).click();
  await shot(`04-narrow-workspace-${tag}`);
  await button("점수 수정").click();
  await button("해제하기").click();
  await page.waitForTimeout(150);
  await shot(`04-narrow-workspace-edit-${tag}`);
  await button("수정 마침").click();
  await button("발표 시작").click();
  await shot(`04-narrow-presenter-1-eval-${tag}`);
  if (width === 787) {
    await row(7).click();
    await shot(`04-narrow-presenter-7-evals-${tag}`);
  }
  await key("Escape");
}

await browser.close();
server.close();
