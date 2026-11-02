import { readFileSync } from "node:fs";
import { resolve } from "node:path";
/**
 * docs/refactor/06-feature-inventory.md의 기능을 시험합니다. 시험 제목의 ID가 목록의 ID입니다.
 * 2026-10-31에 발표 화면을 작업 화면에 합쳤습니다. 바뀐 동작은 docs/refactor/07-lists-and-shell.md에 있습니다.
 */

import {
  bodyText,
  colorAgainstVar,
  csvFile,
  dropFileAt,
  evals,
  expect,
  fakeName,
  isFullscreen,
  makeStudent,
  mixedStudents,
  noStudentsXlsx,
  openGuideIfAny,
  readStoredCipher,
  seedRaw,
  test,
  writeTempFile,
  xlsFile,
  xlsxFile,
} from "./helpers.mjs";

const title = (n) => `2학년 1반 ${n}번`;

async function selected(app, n) {
  await expect(app.page.getByRole("heading", { name: title(n), exact: true })).toBeVisible();
}

/** 목록을 열고 화살표 키로 첫 학생을 보여 줍니다. */
async function showFirst(app, students = mixedStudents()) {
  await app.seed(students);
  await app.key("ArrowRight");
  await selected(app, 1);
  await app.page.mouse.move(0, 0);
}

async function waiting(app) {
  await expect(app.ui.presenterTitle).toHaveCount(0);
  await expect(app.ui.waitText).toBeVisible();
  // 점수는 어디에도 보이지 않습니다. C-04로 목록의 이름은 남습니다.
  await expect(app.page.getByText(/\d+ \/ \d+/)).toHaveCount(0);
}

async function unlock(app) {
  await app.ui.edit.click();
  await app.page.getByRole("button", { name: "해제하기" }).click();
  await expect(app.ui.areaInputs.first()).toBeVisible();
}

const isSelectedRow = (locator) => locator.evaluate((el) => el.getAttribute("aria-current") === "true");

// ---- 파일 올리기 ----

test.describe("파일 올리기", () => {
  test("UP-01 파일 고르기", async ({ app }) => {
    await app.seed(null);
    await expect(app.ui.fileInput).toHaveAttribute("accept", ".xlsx,.xls");
    const chooser = app.page.waitForEvent("filechooser");
    await app.ui.filePick.click();
    const opened = await chooser;
    expect(opened.isMultiple()).toBe(false);
  });

  test("UP-02 xlsx 올리기", async ({ app }) => {
    await app.seed(null);
    await app.uploadAndSave(xlsxFile(30));
    await expect(app.ui.rows).toHaveCount(30);
    await waiting(app);
    await app.key("ArrowRight");
    await selected(app, 1);
    await expect(app.page.getByText("쓰기1", { exact: false }).first()).toBeVisible();
  });

  test("UP-03 xls 올리기", async ({ app }) => {
    await app.seed(null);
    await app.uploadAndSave(xlsFile(12));
    await expect(app.ui.rows).toHaveCount(12);
  });

  test("UP-04 csv는 엑셀로 저장하라고 안내", async ({ app }) => {
    await app.seed(mixedStudents());
    await app.upload(csvFile());
    await expect(app.ui.alert).toContainText("CSV는 읽지 않습니다");
    await expect(app.ui.rows).toHaveCount(40);
  });

  test("UP-05 지원하지 않는 형식", async ({ app }) => {
    await app.seed(mixedStudents());
    await app.upload({ name: "memo.txt", mimeType: "text/plain", buffer: Buffer.from("가상") });
    await expect(app.ui.alert).toContainText(/xlsx/);
    await expect(app.ui.rows).toHaveCount(40);
    const { actual, expected } = await colorAgainstVar(app.ui.alert, "--danger");
    expect(actual).toBe(expected);
  });

  test("UP-06 형식 판별", async ({ app }) => {
    await app.seed(null);
    await app.upload(csvFile("점수.dat", "text/csv"));
    await expect(app.ui.alert).toContainText("CSV는 읽지 않습니다");
    await app.upload(csvFile("점수.csv", "application/octet-stream"));
    await expect(app.ui.alert).toContainText("CSV는 읽지 않습니다");
    await expect(app.ui.rows).toHaveCount(0);
  });

  test("UP-07 처리 중 표시", async ({ app, page }) => {
    await page.addInitScript(() => {
      const post = Worker.prototype.postMessage;
      Worker.prototype.postMessage = function (...args) {
        setTimeout(() => post.apply(this, args), 900);
      };
    });
    await app.seed(null);
    await app.upload(xlsxFile(3));
    await expect(page.getByText("데이터를 처리하고 있습니다...")).toBeVisible();
    await expect(page.locator(".animate-spin").first()).toBeVisible();
    await expect(app.ui.fileInput).toBeDisabled();
    await expect(page.getByLabel("목록 이름")).toBeVisible();
    await expect(app.ui.fileInput).toBeEnabled();
  });

  test("UP-08 성공 메시지", async ({ app }) => {
    await app.seed(null);
    await app.uploadAndSave(xlsxFile(30));
    await expect(app.ui.alert).toContainText("30");
    const { actual, expected } = await colorAgainstVar(app.ui.alert, "--accent-ink");
    expect(actual).toBe(expected);
    await expect(app.ui.alert).toBeHidden({ timeout: 4500 });
  });

  test("UP-09 학생이 없는 파일", async ({ app, page }) => {
    await app.seed(mixedStudents());
    await app.upload(noStudentsXlsx());
    await expect(app.ui.alert).toContainText("파일에서 학생을 찾지 못했습니다");
    const { actual, expected } = await colorAgainstVar(app.ui.alert, "--danger");
    expect(actual).toBe(expected);
    await expect(app.ui.rows).toHaveCount(40);
    await expect(app.ui.alert).toBeHidden({ timeout: 6500 });
    await page.reload();
    await expect(page.getByRole("button", { name: /이전에 저장한 점수.*저장/ })).toBeVisible();
  });

  test("UP-10 깨진 파일", async ({ app }) => {
    await app.seed(mixedStudents());
    await app.upload({
      name: "깨진 파일.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6, 7, 8]),
    });
    await expect(app.ui.alert).toBeVisible();
    await expect(app.ui.rows).toHaveCount(40);
    await app.ui.row(2).click();
    await selected(app, 2);
  });

  test("UP-11 파일 처리 오류", async ({ app, page }) => {
    await page.addInitScript(() => {
      window.Worker = class {
        constructor() {
          setTimeout(() => this.onerror?.({ message: "대역 오류" }), 50);
        }
        postMessage() {}
        terminate() {}
      };
    });
    await app.seed(null);
    await app.upload(xlsxFile(3));
    await expect(app.ui.alert).toContainText("대역 오류");
    await expect(app.ui.fileInput).toBeEnabled();

    await page.evaluate(() => {
      window.Worker = class {
        constructor() {
          throw new Error("대역 생성 실패");
        }
      };
    });
    await app.upload(xlsxFile(3));
    await expect(app.ui.alert).toContainText("대역 생성 실패");
    await expect(app.ui.fileInput).toBeEnabled();
  });

  test("UP-12 같은 파일 다시 고르기", async ({ app, page }) => {
    await app.seed(null);
    await app.upload(xlsxFile(5));
    await expect(page.getByLabel("목록 이름")).toBeVisible();
    await expect.poll(() => page.locator('input[type="file"]').inputValue()).toBe("");
  });

  test("UP-13 새 파일은 새 목록으로", async ({ app, page }) => {
    await app.seed(mixedStudents());
    await app.ui.row(5).click();
    await app.uploadAndSave(xlsxFile(30), "새 목록");
    await expect(app.ui.rows).toHaveCount(30);
    await waiting(app);
    // 앞의 목록은 그대로 남습니다.
    await app.ui.switcher.click();
    await expect(page.getByRole("menuitem", { name: /이전에 저장한 점수/ })).toBeVisible();
  });

  test("UP-14 끌어다 놓기", async ({ app, page }, testInfo) => {
    await app.seed(null);
    const path = writeTempFile(testInfo, xlsxFile(7));
    const box = await app.ui.dropTarget.boundingBox();
    await dropFileAt(page, path, box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByLabel("목록 이름")).toBeVisible();
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(app.ui.rows).toHaveCount(7);
  });
});

// ---- 표준 서식 ----

test.describe("표준 서식", () => {
  async function downloadTemplate(app) {
    const waitingDownload = app.page.waitForEvent("download");
    await app.ui.template.click();
    const download = await waitingDownload;
    expect(download.suggestedFilename()).toBe("ScoreShow_Template.xlsx");
  }

  test("TP-01 웹에서 받기", async ({ app }) => {
    await app.seed(null);
    await openGuideIfAny(app);
    await downloadTemplate(app);
    expect(app.external).toEqual([]);
  });

  test("TP-02 앱 안의 파일과 같음", async ({ app }) => {
    await app.seed(null);
    await openGuideIfAny(app);
    const started = app.page.waitForEvent("download");
    await app.ui.template.click();
    const download = await started;
    const saved = readFileSync(await download.path());
    expect(saved.equals(readFileSync(resolve("public/ScoreShow_Template.xlsx")))).toBe(true);
  });

  test("TP-03 웹 실패", async ({ app, page }) => {
    await page.route("**/ScoreShow_Template.xlsx", (route) => route.abort());
    await app.seed(null);
    await openGuideIfAny(app);
    await app.ui.template.click();
    await expect(app.ui.alert).toBeAttached();
    await expect(app.ui.alert).toContainText("표준 서식");
  });

  test("TP-04 Electron에서 받기", async ({ app, page }) => {
    await page.addInitScript(() => {
      window.electronAPI = {
        getVersion: () => "9.9.9",
        getTemplateFile: async () => ({ success: true, data: btoa("template") }),
      };
    });
    await app.seed(null);
    await openGuideIfAny(app);
    await downloadTemplate(app);
    expect(app.external).toEqual([]);
  });

  test("TP-05 Electron 실패", async ({ app, page }) => {
    await page.addInitScript(() => {
      window.electronAPI = {
        getVersion: () => "9.9.9",
        getTemplateFile: async () => ({ success: false, error: "없음" }),
      };
    });
    await app.seed(null);
    await openGuideIfAny(app);
    await app.ui.template.click();
    await expect(app.ui.alert).toBeAttached();
    await expect(app.ui.alert).toContainText(/표준 서식/);
  });

  test("TP-06 학생이 있어도 받기", async ({ app }) => {
    await app.seed(mixedStudents());
    await openGuideIfAny(app);
    await downloadTemplate(app);
  });
});

// ---- 안내 문구: 자료가 없을 때와 있을 때 모두 ----

for (const [state, students] of [
  ["자료 없음", null],
  ["자료 있음", mixedStudents()],
]) {
  test.describe(`안내 문구 (${state})`, () => {
    const guideText = async (app) => {
      await app.seed(students);
      await openGuideIfAny(app);
      return bodyText(app.page);
    };

    test(`GD-01 학생 정보 (${state})`, async ({ app }) => {
      const text = await guideText(app);
      expect(text).toContain("학생 정보는 이 컴퓨터 밖으로 나가지 않습니다.");
    });

    test(`GD-02 끝난 뒤 삭제 권장 (${state})`, async ({ app }) => {
      const text = await guideText(app);
      expect(text).toContain("저장된 점수를 지워 주세요");
      expect(text).toContain("스코어쇼를 여는 사람은 누구나 점수를 볼 수 있습니다");
      expect(text).toContain("다음에 이 컴퓨터를 쓰는 분이");
      expect(text).toContain("아직 확인하지 못한 학생이 있으면 그 반은 남겨 두었다가");
      expect(text).toContain("처음 화면의 목록 아래 모두 지우기");
      expect(text).not.toContain("엑셀 파일도 지");
    });

    test(`GD-03 나이스 받는 방법 (${state})`, async ({ app }) => {
      const text = await guideText(app);
      expect(text).toContain("교과담임 → 수행평가조회/통계 → 수행평가조회");
      expect(text).toContain("교과목별일람표조회-강의실별");
      expect(text).toContain("강의실별일람표조회-전체영역");
      expect(text).toContain("저장 아이콘");
      expect(text).toContain("xls 형식");
    });

    test(`GD-04 표준 서식은 문제가 있을 때 (${state})`, async ({ app }) => {
      const text = await guideText(app);
      expect(text).toContain("문제가 있을 때");
      expect(text).toContain("평가 영역이 하나만 읽히면 표준 서식");
    });

    test(`GD-05 TV 끄기와 학생 행동 (${state})`, async ({ app }) => {
      const text = await guideText(app);
      expect(text).toContain("TV와 프로젝터를 끄거나 연결을 해제해 주세요");
      expect(text).toContain("대기 화면에서 학생 한 명을 불러");
      expect(text).not.toContain("건너뛰기");
      expect(text).toContain("학생은 자리로 돌아가고, 다음 학생이 나옵니다");
      expect(text).not.toContain("화이트아웃");
      expect(text).not.toContain("발표");
    });

    test(`GD-06 앱 소개 (${state})`, async ({ app, page }) => {
      await app.seed(students);
      const text = await bodyText(page);
      expect(text).toContain("ScoreShow");
      expect(text).toContain("스코어쇼");
      expect(text).toContain("수행평가 점수 확인,");
      expect(text).toContain("한 명씩 손쉽고 안전하게");
      expect(text).not.toContain("발표도구");
      await expect(page.locator('img[src*="scoreshow"]').first()).toBeVisible();
    });
  });
}

// ---- 저장과 오프라인 ----

test.describe("저장과 오프라인", () => {
  test("ST-01 다시 열어도 유지하되 점수는 바로 보이지 않음", async ({ app, page }) => {
    await app.seed(null);
    await app.uploadAndSave(xlsxFile(30), "가상 목록");
    await expect(app.ui.rows).toHaveCount(30);
    await page.reload();
    const list = page.getByRole("button", { name: /가상 목록.*저장/ });
    await expect(list).toBeVisible();
    await expect(app.ui.rows).toHaveCount(0);
    await expect(page.getByText(/\d+ \/ \d+/)).toHaveCount(0);
    await list.click();
    await expect(app.ui.rows).toHaveCount(30);
    await waiting(app);
  });

  test("ST-02 AES 암호화 저장", async ({ app, page }) => {
    await app.seed(null);
    await app.uploadAndSave(xlsxFile(30), "2학년 가상반");
    await expect(app.ui.rows).toHaveCount(30);
    await expect.poll(() => readStoredCipher(page)).not.toBeNull();
    const entries = await readStoredCipher(page);
    expect(entries).toHaveLength(1);
    expect(entries[0].cipher).toMatch(/^U2FsdGVk/);
    const stored = JSON.stringify(entries);
    expect(stored).not.toContain(fakeName(0));
    expect(stored).not.toContain("가상반");
    const local = await page.evaluate(() => JSON.stringify(localStorage));
    expect(local).not.toContain(fakeName(0));
    expect(local).not.toContain("가상반");
  });

  test("ST-03 풀 수 없는 저장값", async ({ app, page, origin }) => {
    await seedRaw(page, origin, "풀 수 없는 값");
    await expect(page.getByText("읽을 수 없는 자료")).toBeVisible();
    await expect(app.ui.rows).toHaveCount(0);
    await app.uploadAndSave(xlsxFile(3));
    await expect(app.ui.rows).toHaveCount(3);
  });

  test("ST-04 네트워크 차단", async ({ app, page }) => {
    await app.seed(null);
    const result = await page.evaluate(async () => {
      const fetchBlocked = await fetch("https://example.invalid/").then(
        () => false,
        (error) => error.message.includes("offline")
      );
      let xhrBlocked = false;
      try {
        new XMLHttpRequest().open("GET", "https://example.invalid/");
      } catch {
        xhrBlocked = true;
      }
      let socketBlocked = false;
      try {
        new WebSocket("wss://example.invalid/");
      } catch {
        socketBlocked = true;
      }
      return { fetchBlocked, xhrBlocked, socketBlocked };
    });
    expect(result).toEqual({ fetchBlocked: true, xhrBlocked: true, socketBlocked: true });
  });

  test("ST-05 외부 요청 0건", async ({ app, page }) => {
    await app.seed(null);
    await app.uploadAndSave(xlsxFile(30));
    await expect(app.ui.rows).toHaveCount(30);
    await app.ui.row(2).click();
    await unlock(app);
    await app.ui.edit.click();
    await app.key("ArrowRight");
    await app.key("ArrowRight");
    await app.key("Escape");
    await page.reload();
    await expect(page.getByRole("button", { name: /2학년 1반.*저장/ })).toBeVisible();
    expect(app.external).toEqual([]);
  });

  test("ST-06 오프라인 실행", async ({ browser, origin }) => {
    const context = await browser.newContext({ serviceWorkers: "allow", viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(origin);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => page.reload());
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText("수행평가 점수 확인,").first()).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => [...document.fonts].some((f) => f.family.includes("Pretendard") && f.status === "loaded"))
      )
      .toBe(true);
    await context.close();
  });

  test("ST-07 자료 없는 시작", async ({ app }) => {
    await app.seed(null);
    await expect(app.ui.filePick).toBeVisible();
    await expect(app.ui.edit).toHaveCount(0);
    await expect(app.ui.removeList).toHaveCount(0);
    await expect(app.ui.removeAll).toHaveCount(0);
    await expect(app.ui.rows).toHaveCount(0);
    await expect(app.page.getByText("아직 저장한 점수가 없습니다.")).toBeVisible();
  });
});

// ---- 학생 목록 ----

test.describe("학생 목록", () => {
  test.beforeEach(async ({ app }) => {
    await app.seed(mixedStudents());
  });

  test("LS-01 목록과 인원", async ({ app, page }) => {
    await expect(app.ui.rows).toHaveCount(40);
    expect(await bodyText(page)).toContain("40명");
  });

  test("LS-02 줄 내용", async ({ app, page }) => {
    // 슬로건의 '확인'은 학생 상태 표시가 아닙니다.
    await expect(page.getByText(/확인|못 봄/).filter({ hasNotText: "수행평가 점수 확인," })).toHaveCount(0);
    const row = app.ui.row(3);
    await expect(row).toContainText("3");
    await expect(row).not.toContainText("번");
    await expect(row).toContainText(fakeName(2));
    await expect(row).not.toContainText("영역");
  });

  test("LS-03 클릭 선택", async ({ app, page }) => {
    await app.ui.row(1).click();
    await selected(app, 1);
    expect(await isSelectedRow(app.ui.row(1))).toBe(true);
    await app.ui.row(3).click();
    await page.mouse.move(0, 0);
    await selected(app, 3);
    expect(await isSelectedRow(app.ui.row(3))).toBe(true);
    expect(await isSelectedRow(app.ui.row(1))).toBe(false);
    await expect(app.ui.row(3)).toHaveCSS("font-weight", /^[67]00$/);
    // 왼쪽 막대는 쓰지 않습니다.
    await expect(app.ui.row(3)).toHaveCSS("box-shadow", "none");
  });

  test("LS-04 키보드 선택", async ({ app, page }) => {
    await app.ui.search.focus();
    await page.keyboard.press("Tab");
    await expect(app.ui.row(1)).toBeFocused();
    await app.ui.row(5).focus();
    await app.key("Enter");
    await selected(app, 5);
    await app.ui.row(6).focus();
    await app.key(" ");
    await selected(app, 6);
    await app.ui.row(7).focus();
    await app.key("a");
    await selected(app, 6);
  });

  test("LS-05 고른 뒤 포커스", async ({ app, page }) => {
    const focused = () => page.evaluate(() => document.activeElement === document.body);
    await app.ui.row(3).click();
    expect(await focused()).toBe(true);
    await app.ui.row(4).focus();
    await app.key("Enter");
    expect(await focused()).toBe(true);
  });

  test("LS-06 긴 목록", async ({ app, page }) => {
    await app.ui.row(40).scrollIntoViewIfNeeded();
    await app.ui.row(40).click();
    await selected(app, 40);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(app.ui.row(40)).toBeInViewport();
  });

  test("LS-07 여러 반", async ({ app }) => {
    await app.seed([makeStudent(1, evals(1), 1), makeStudent(1, evals(1), 2)]);
    await expect(app.ui.row(1, 1)).toContainText("1반");
    await expect(app.ui.row(1, 2)).toContainText("2반");
  });

  test("LS-08 스크롤바는 마우스를 올린 곳에서만", async ({ app, page }) => {
    await expect(app.ui.rows).toHaveCount(40);
    const result = await page.evaluate(() => {
      const list = document.querySelector('ul[aria-label="학생 목록"]');
      const thumb = (pseudoHover) =>
        [...document.styleSheets]
          .flatMap((sheet) => [...sheet.cssRules])
          .find((rule) => rule.selectorText?.includes("::-webkit-scrollbar-thumb") && rule.selectorText.includes(":hover") === pseudoHover)
          ?.style.background;
      return {
        // scrollbar-width가 있으면 아래 규칙이 무시됩니다.
        width: getComputedStyle(list).scrollbarWidth,
        idle: thumb(false),
        hover: thumb(true),
      };
    });
    expect(result.width).toBe("auto");
    expect(result.idle).toContain("transparent");
    expect(result.hover).toContain("--hairline");
  });
});

// ---- 검색 ----

test.describe("검색", () => {
  test.beforeEach(async ({ app }) => {
    await app.seed(mixedStudents());
  });

  test("SR-01 이름", async ({ app }) => {
    await app.ui.search.fill("이가상");
    await expect(app.ui.rows).toHaveCount(4);
    await expect(app.ui.row(2)).toBeVisible();
  });

  test("SR-02 학년 반 번호", async ({ app }) => {
    await app.ui.search.fill("2학년 1반 3번");
    await expect(app.ui.rows).toHaveCount(1);
    await expect(app.ui.row(3)).toBeVisible();
  });

  test("SR-03 짧은 표기", async ({ app }) => {
    await app.ui.search.fill("2-1-12");
    await expect(app.ui.rows).toHaveCount(1);
    await expect(app.ui.row(12)).toBeVisible();
  });

  test("SR-04 대소문자", async ({ app, page }) => {
    await app.seed([{ ...makeStudent(1, evals(1)), name: "Gasang Kim" }, makeStudent(2, evals(1))]);
    await app.ui.search.fill("gasang KIM");
    await expect(app.ui.rows).toHaveCount(1);
    await expect(page.getByRole("button", { name: "2학년 1반 1번 Gasang Kim" })).toBeVisible();
  });

  test("SR-05 결과 없음", async ({ app, page }) => {
    await app.ui.search.fill("없는학생");
    await expect(app.ui.rows).toHaveCount(0);
    await expect(page.getByText("검색 결과가 없습니다.")).toBeVisible();
  });

  test("SR-06 지우기와 공백", async ({ app }) => {
    await app.ui.search.fill("없는학생");
    await app.ui.search.fill("");
    await expect(app.ui.rows).toHaveCount(40);
    await app.ui.search.fill("   ");
    await expect(app.ui.rows).toHaveCount(40);
  });

  test("SR-07 고른 학생 유지", async ({ app }) => {
    await app.ui.row(3).click();
    await app.ui.search.fill("없는학생");
    await selected(app, 3);
  });

  test("SR-08 검색칸에서 친 키로 화면이 넘어가지 않음", async ({ app }) => {
    await app.ui.search.click();
    await app.key("f");
    await app.key("ArrowRight");
    await app.key("Escape");
    await expect(app.ui.search).toHaveValue("f");
    await expect.poll(() => isFullscreen(app.page)).toBe(false);
    await waiting(app);
  });
});

// ---- 점수 보기 ----

test.describe("학생 점수 보기", () => {
  test.beforeEach(async ({ app }) => {
    await showFirst(app);
  });

  test("PV-01 제목", async ({ app, page }) => {
    await app.ui.row(4).click();
    await selected(app, 4);
    // 목록 줄 밖에 보이는 이름이 제목 쪽 이름입니다.
    const outsideList = await page.getByText(fakeName(3), { exact: true }).evaluateAll(
      (els) => els.filter((el) => !el.closest("[data-student-row]")).length
    );
    expect(outsideList).toBe(1);
  });

  test("PV-02 점수 카드", async ({ page }) => {
    await expect(page.getByText("쓰기1", { exact: true })).toBeVisible();
    await expect(page.getByText("3 / 20", { exact: true })).toBeVisible();
    await expect(page.getByText(/^\d+(\.\d+)?%$/)).toHaveCount(0);
  });

  test("PV-03 미입력", async ({ app, page }) => {
    await app.ui.row(3).click();
    await expect(page.getByText("미입력", { exact: true })).toBeVisible();
    await expect(page.getByText(/^\d+ \/ 20$/)).toHaveCount(2);
  });

  test("PV-04 만점 0", async ({ app, page }) => {
    await app.ui.row(9).click();
    await expect(page.getByText("0 / 0", { exact: true })).toBeVisible();
    await expect(page.getByText(/^\d+\.\d%$/)).toHaveCount(0);
  });

  test("PV-05 평가 없음", async ({ app, page }) => {
    await app.ui.row(8).click();
    await expect(page.getByText("표시할 데이터가 없습니다.")).toBeVisible();
    await expect(app.ui.row(1)).toBeAttached();
    await app.ui.row(1).click();
    await selected(app, 1);
  });

  test("PV-07 평가 많음", async ({ app, page }) => {
    await app.ui.row(7).click();
    for (const area of ["쓰기1", "쓰기2", "말하기", "듣기", "읽기", "문법", "발표"]) {
      const card = page.getByText(area, { exact: true });
      await card.scrollIntoViewIfNeeded();
      await expect(card).toBeInViewport();
    }
  });
});

// ---- 점수 수정: 전체 점수표 ----

test.describe("점수 수정", () => {
  test.beforeEach(async ({ app }) => {
    await app.seed(mixedStudents());
  });

  test("ED-01 확인 창", async ({ app, page }) => {
    const dialog = page.getByRole("heading", { name: "점수 잠금 해제" });
    await app.ui.edit.click();
    await expect(dialog).toBeVisible();
    await dialog.click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(dialog).toBeHidden();
    await expect(app.ui.areaInputs).toHaveCount(0);
    await app.ui.edit.click();
    await page.getByRole("button", { name: "취소" }).click();
    await expect(dialog).toBeHidden();
    await expect(app.ui.areaInputs).toHaveCount(0);
    await app.ui.edit.click();
    await page.getByRole("button", { name: "해제하기" }).click();
    await expect(dialog).toBeHidden();
    await expect(app.ui.areaInputs).toHaveCount(7);
  });

  test("ED-02 첫 점수 칸 포커스", async ({ app }) => {
    await unlock(app);
    await expect(app.ui.score(1, "쓰기1")).toBeFocused();
  });

  test("ED-03 수정 안내", async ({ app, page }) => {
    const help = page.getByText("고친 내용은 자동으로 저장됩니다");
    await expect(help).toHaveCount(0);
    await unlock(app);
    await expect(help).toBeVisible();
    await app.ui.edit.click();
    await expect(help).toHaveCount(0);
  });

  test("ED-04 영역 이름", async ({ app, page }) => {
    await unlock(app);
    await app.ui.areaInputs.first().click();
    await page.keyboard.press("End");
    await page.keyboard.type("A");
    await page.keyboard.press("Enter");
    await expect(app.ui.areaInputs.first()).toHaveValue("쓰기1A");
    await app.ui.edit.click();
    await app.ui.row(1).click();
    await expect(page.getByText("쓰기1A", { exact: true })).toBeVisible();
  });

  test("ED-04b 다른 영역과 같은 이름은 되돌림", async ({ app, page }) => {
    await unlock(app);
    const first = app.ui.areaInputs.first();
    await first.fill("쓰기2");
    await page.keyboard.press("Enter");
    await expect(first).toHaveValue("쓰기1");
    await expect(app.ui.areaInputs).toHaveCount(7);
  });

  test("ED-05 점수 연속 입력", async ({ app, page }) => {
    await unlock(app);
    const score = app.ui.score(1, "쓰기1");
    await score.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("12", { delay: 150 });
    await expect(score).toHaveValue("12");
    await expect(score).toBeFocused();
  });

  test("ED-06 소수 점수", async ({ app, page }) => {
    await unlock(app);
    const score = app.ui.score(1, "쓰기1");
    await expect(score).toHaveAttribute("step", "0.5");
    await expect(score).toHaveAttribute("min", "0");
    await score.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("12.5", { delay: 60 });
    await expect(score).toHaveValue("12.5");
    await app.ui.edit.click();
    await app.ui.row(1).click();
    await expect(page.getByText("12.5 / 20", { exact: true })).toBeVisible();
  });

  test("ED-07 점수 비우기", async ({ app, page }) => {
    await unlock(app);
    await app.ui.score(2, "쓰기1").click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await app.ui.edit.click();
    await app.ui.row(2).click();
    await expect(page.getByText("미입력", { exact: true })).toHaveCount(1);
  });

  test("ED-08 만점 잘못 입력", async ({ app, page }) => {
    await unlock(app);
    const max = app.ui.max("쓰기1");
    await max.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await expect(max).toHaveValue("20");
    await page.keyboard.press("Control+A");
    await page.keyboard.type("0");
    await expect(max).toHaveValue("20");
    await app.ui.edit.click();
    await app.ui.row(1).click();
    await expect(page.getByText("3 / 20", { exact: true })).toBeVisible();
  });

  test("ED-09 만점 바꾸기는 그 영역 전체에", async ({ app, page }) => {
    await unlock(app);
    const max = app.ui.max("쓰기1");
    await max.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("30");
    await expect(max).toHaveValue("30");
    await app.ui.edit.click();
    await app.ui.row(1).click();
    await expect(page.getByText("3 / 30", { exact: true })).toBeVisible();
    await app.ui.row(2).click();
    await expect(page.getByText("3 / 30", { exact: true })).toBeVisible();
  });

  test("ED-10 다시 잠그기", async ({ app }) => {
    await expect(app.ui.edit).toContainText("점수 수정");
    await unlock(app);
    await expect(app.ui.edit).toContainText("수정 마침");
    await app.ui.edit.click();
    await expect(app.ui.areaInputs).toHaveCount(0);
    await expect(app.ui.edit).toContainText("점수 수정");
  });

  test("ED-11 학생을 누르면 표가 닫힘", async ({ app }) => {
    await unlock(app);
    await app.ui.row(2).click();
    await expect(app.ui.areaInputs).toHaveCount(0);
    await selected(app, 2);
  });

  test("ED-12 평가 없는 학생과 다른 칸", async ({ app, page }) => {
    await unlock(app);
    await expect(page.locator("tr", { hasText: fakeName(7) }).getByText("없음").first()).toBeVisible();
    await expect(app.ui.score(8, "쓰기1")).toHaveCount(0);
    // 만점 0처럼 이 학생만 만점이 다르면 칸 옆에 적습니다.
    await expect(page.locator("tr", { hasText: fakeName(8) })).toContainText("/ 0");
  });

  test("ED-13 자동 저장", async ({ app, page }) => {
    await unlock(app);
    await app.ui.score(2, "쓰기1").click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("11");
    await page.waitForTimeout(200);
    await page.reload();
    await page.getByRole("button", { name: /이전에 저장한 점수.*저장/ }).click();
    await app.ui.row(2).click();
    await expect(page.getByText("11 / 20", { exact: true })).toBeVisible();
  });

  test("ED-14 입력칸의 키는 칸의 것", async ({ app, page }) => {
    await unlock(app);
    await page.evaluate(() => {
      window.__keys = 0;
      window.addEventListener("keydown", () => window.__keys++);
    });
    // 영역 이름을 고치면 점수 칸의 이름도 바뀌므로 순서로 찾습니다.
    const score = page.locator('input[aria-label$="점수"]').first();
    await app.ui.areaInputs.first().click();
    await expect(app.ui.areaInputs.first()).toBeFocused();
    await page.keyboard.type("가a1");
    await score.click();
    await expect(score).toBeFocused();
    await page.keyboard.type("1");
    expect(await page.evaluate(() => window.__keys)).toBe(0);
    await expect(app.ui.areaInputs.first()).toHaveAttribute("autocomplete", "off");
    await expect(score).toHaveAttribute("autocomplete", "off");
  });

  test("ED-15 화살표 키와 Esc는 표를 닫고 대기 화면으로", async ({ app, page }) => {
    await unlock(app);
    await page.evaluate(() => document.activeElement.blur());
    await app.key("ArrowRight");
    await expect(app.ui.areaInputs).toHaveCount(0);
    await waiting(app);

    await unlock(app);
    // 입력칸 안에서 누른 Esc도 표를 닫습니다.
    await expect(app.ui.score(1, "쓰기1")).toBeFocused();
    await app.key("Escape");
    await expect(app.ui.areaInputs).toHaveCount(0);
    await waiting(app);
  });

  test("ED-16 입력칸 안의 화살표는 표를 닫지 않음", async ({ app }) => {
    await unlock(app);
    await expect(app.ui.score(1, "쓰기1")).toBeFocused();
    await app.key("ArrowUp");
    await expect(app.ui.areaInputs).toHaveCount(7);
  });
});

// ---- 삭제 ----

test.describe("삭제", () => {
  test("DL-01 확인 후 취소", async ({ app, page }) => {
    await app.seed(mixedStudents());
    await app.ui.removeList.click();
    await expect(page.getByRole("heading", { name: "이 목록을 지울까요?" })).toBeVisible();
    await page.getByRole("button", { name: "취소" }).click();
    await expect(app.ui.rows).toHaveCount(40);
    await page.reload();
    await expect(page.getByRole("button", { name: /이전에 저장한 점수.*저장/ })).toBeVisible();
    expect(app.dialogs).toEqual([]);
  });

  test("DL-02 삭제", async ({ app, page }) => {
    await app.seed(mixedStudents());
    await app.ui.removeList.click();
    await app.ui.confirmDelete.click();
    await expect(app.ui.rows).toHaveCount(0);
    await expect.poll(() => readStoredCipher(page)).toBeNull();
    await page.reload();
    await expect(app.ui.filePick).toBeVisible();
    await expect(page.getByText("아직 저장한 점수가 없습니다.")).toBeVisible();
    // 마지막 목록을 지우면 복호화 키도 지웁니다.
    expect(await page.evaluate(() => localStorage.getItem("scoreshow-encryption-key"))).toBeNull();
  });
});

// ---- 학생 점수 화면 ----

test.describe("학생 점수 화면", () => {
  test("PR-01 목록을 열면 대기 화면", async ({ app }) => {
    await app.seed(mixedStudents());
    await waiting(app);
  });

  // 평가 수별 글자 단계와 칸 수를 고정합니다.
  for (const [count, sizes, columns] of [
    [1, { info: "96px", name: "72px", area: "48px", score: "180px" }, 1],
    [2, { info: "60px", name: "48px", area: "30px", score: "88px" }, 1],
    [3, { info: "60px", name: "48px", area: "28px", score: "72px" }, 2],
    [4, { info: "48px", name: "36px", area: "28px", score: "72px" }, 2],
    [5, { info: "48px", name: "36px", area: "24px", score: "64px" }, 3],
    [6, { info: "36px", name: "30px", area: "24px", score: "64px" }, 3],
    [7, { info: "36px", name: "30px", area: "22px", score: "56px" }, 4],
  ]) {
    test(`PR-02 큰 글씨 (평가 ${count}개)`, async ({ app, page }) => {
      await showFirst(app, [makeStudent(1, evals(count)), makeStudent(2, evals(1))]);
      const area = page.getByText("쓰기1", { exact: true });
      const score = page.getByText("3 / 20", { exact: true });
      await expect(app.ui.presenterTitle).toHaveCSS("font-size", sizes.info);
      await expect(page.getByRole("heading", { level: 2, name: fakeName(0) })).toHaveCSS("font-size", sizes.name);
      await expect(area).toHaveCSS("font-size", sizes.area);
      await expect(score).toHaveCSS("font-size", sizes.score);
      const xs = await page
        .getByText(/^\d+ \/ 20$/)
        .evaluateAll((els) => els.map((el) => Math.round(el.parentElement.getBoundingClientRect().x)));
      expect(new Set(xs).size).toBe(columns);
    });
  }

  test("PR-03 평가 수별 표시", async ({ app, page }) => {
    await showFirst(app);
    for (const number of [1, 2, 4, 5, 6, 7]) {
      await app.ui.row(number).click();
      await selected(app, number);
      await expect(page.getByText(/^\d+ \/ 20$/)).toHaveCount(number);
    }
    await app.ui.row(3).click();
    await expect(page.getByText("미입력", { exact: true })).toBeVisible();
    await app.ui.row(9).click();
    await expect(page.getByText("0 / 0", { exact: true })).toBeVisible();
    await expect(page.getByText(/^\d+\.\d%$/)).toHaveCount(0);
  });

  test("PR-05 목록으로 이동", async ({ app }) => {
    await showFirst(app);
    await app.ui.row(30).scrollIntoViewIfNeeded();
    await app.ui.row(30).click();
    await selected(app, 30);
    await app.page.waitForTimeout(600);
    await expect(app.ui.row(30)).toBeInViewport();
    expect(await app.page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("PR-06 단축키 안내", async ({ app, page }) => {
    await showFirst(app);
    const text = await bodyText(page);
    expect(text).toMatch(/화살표 키 : 이동/);
    expect(text).toMatch(/F : 전체화면/);
    expect(text).toMatch(/Esc : 대기 화면/);
    await app.key("f");
    await expect(page.getByText("F : 전체화면 해제")).toBeVisible();
  });

  test("PR-07 Esc는 바로 대기 화면", async ({ app }) => {
    await showFirst(app);
    await app.key("Escape");
    await waiting(app);
  });

  test("PR-08 대기 화면 버튼", async ({ app }) => {
    await showFirst(app);
    await expect(app.ui.wait).toBeVisible();
    await app.ui.wait.click();
    await waiting(app);
    await expect(app.ui.wait).toHaveCount(0);
  });

  test("PR-09 대기 화면 뒤 다음 학생", async ({ app }) => {
    await showFirst(app);
    await app.key("Escape");
    await app.key("ArrowRight");
    await selected(app, 2);
  });

  test("PR-10 목록 다른 학생 이름", async ({ app }) => {
    await showFirst(app);
    await expect(app.ui.row(5)).toContainText(fakeName(4));
    await app.key("ArrowRight");
    await expect(app.ui.row(5)).toContainText(fakeName(4));
  });
});

// ---- 대기 화면 ----

test.describe("대기 화면", () => {
  test("WO-01 비우기", async ({ app }) => {
    await showFirst(app);
    await app.key("ArrowRight");
    await waiting(app);
  });

  test("WO-02 다음 학생", async ({ app }) => {
    await showFirst(app);
    await app.key("ArrowRight");
    await app.key("ArrowRight");
    await selected(app, 2);
  });

  test("WO-03 아래 화살표", async ({ app }) => {
    await showFirst(app);
    await app.key("ArrowDown");
    await waiting(app);
    await app.key("ArrowDown");
    await selected(app, 2);
  });

  test("WO-04 이전 학생", async ({ app }) => {
    await showFirst(app);
    await app.ui.row(3).click();
    await app.key("ArrowLeft");
    await waiting(app);
    await app.key("ArrowLeft");
    await selected(app, 2);
  });

  test("WO-05 위 화살표", async ({ app }) => {
    await showFirst(app);
    await app.ui.row(3).click();
    await app.key("ArrowUp");
    await waiting(app);
    await app.key("ArrowUp");
    await selected(app, 2);
  });

  test("WO-06 다음 방향 뒤 반대", async ({ app }) => {
    await showFirst(app);
    await app.ui.row(3).click();
    await app.key("ArrowRight");
    await waiting(app);
    await app.key("ArrowLeft");
    await selected(app, 3);
  });

  test("WO-07 이전 방향 뒤 반대는 그 학생으로 돌아감", async ({ app }) => {
    await showFirst(app);
    await app.ui.row(3).click();
    await app.key("ArrowLeft");
    await waiting(app);
    await app.key("ArrowRight");
    await selected(app, 3);

    await app.ui.row(40).scrollIntoViewIfNeeded();
    await app.ui.row(40).click();
    await app.key("ArrowLeft");
    await waiting(app);
    await app.key("ArrowRight");
    await selected(app, 40);
  });

  test("WO-08 첫 학생과 마지막 학생", async ({ app }) => {
    await showFirst(app);
    // 첫 학생도 왼쪽 키로 점수를 가립니다.
    await app.key("ArrowLeft");
    await waiting(app);
    await app.key("ArrowUp");
    await waiting(app);
    await app.key("ArrowRight");
    await selected(app, 1);
    await app.ui.row(40).scrollIntoViewIfNeeded();
    await app.ui.row(40).click();
    // 마지막 학생도 확인이 끝나면 점수를 가립니다.
    await app.key("ArrowRight");
    await waiting(app);
    await app.key("ArrowRight");
    await waiting(app);
    await app.key("ArrowLeft");
    await selected(app, 40);
  });

  test("WO-09 줄 클릭", async ({ app }) => {
    await showFirst(app);
    await app.key("ArrowRight");
    await waiting(app);
    await app.ui.row(20).scrollIntoViewIfNeeded();
    await app.ui.row(20).click();
    await selected(app, 20);
  });

  test("WO-10 열자마자 왼쪽 키는 무시", async ({ app }) => {
    await app.seed(mixedStudents());
    await app.key("ArrowLeft");
    await waiting(app);
    await app.key("ArrowRight");
    await selected(app, 1);
  });

  test("WO-11 평가 없는 학생", async ({ app }) => {
    await showFirst(app);
    await app.ui.row(8).click();
    await app.key("ArrowRight");
    await waiting(app);
    await app.key("ArrowRight");
    await selected(app, 9);
    await app.key("ArrowLeft");
    await app.key("ArrowLeft");
    await expect(app.page.getByText("표시할 데이터가 없습니다.")).toBeVisible();
  });
});

// ---- 줄 사이 막대 ----

test.describe("줄 사이 막대", () => {
  const center = async (locator) => {
    const box = await locator.boundingBox();
    return box.y + box.height / 2;
  };

  test("MK-01 앞으로 가면 지금 학생 아래에 끼움", async ({ app }) => {
    await showFirst(app);
    await app.ui.row(3).click();
    await expect(app.ui.marker).toHaveCount(0);
    await app.key("ArrowRight");
    await expect(app.ui.marker).toHaveCount(1);
    const y = await center(app.ui.marker);
    expect(y).toBeGreaterThan(await center(app.ui.row(3)));
    expect(y).toBeLessThan(await center(app.ui.row(4)));
    await app.key("ArrowRight");
    await expect(app.ui.marker).toHaveCount(0);
  });

  test("MK-02 뒤로 가면 지금 학생 위에 끼움", async ({ app }) => {
    await showFirst(app);
    await app.ui.row(3).click();
    await app.key("ArrowLeft");
    const y = await center(app.ui.marker);
    expect(y).toBeGreaterThan(await center(app.ui.row(2)));
    expect(y).toBeLessThan(await center(app.ui.row(3)));
  });

  test("MK-03 대기 화면에서는 선택 표시가 없음", async ({ app }) => {
    await showFirst(app);
    await app.ui.row(3).click();
    expect(await isSelectedRow(app.ui.row(3))).toBe(true);
    await app.key("ArrowRight");
    await expect(app.ui.marker).toHaveCount(1);
    expect(await isSelectedRow(app.ui.row(3))).toBe(false);
  });

  test("MK-04 막대가 생겨도 줄이 움직이지 않음", async ({ app }) => {
    await showFirst(app);
    await app.ui.row(3).click();
    await app.page.waitForTimeout(300);
    const before = await app.ui.row(4).boundingBox();
    await app.key("ArrowRight");
    await expect(app.ui.marker).toHaveCount(1);
    const after = await app.ui.row(4).boundingBox();
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  });

  test("MK-05 처음과 끝", async ({ app }) => {
    await app.seed(mixedStudents());
    expect(await center(app.ui.marker)).toBeLessThan(await center(app.ui.rows.first()));
    await app.ui.row(40).scrollIntoViewIfNeeded();
    await app.ui.row(40).click();
    await app.key("ArrowRight");
    expect(await center(app.ui.marker)).toBeGreaterThan(await center(app.ui.row(40)));
  });

  test("MK-06 대기 화면 버튼은 앞뒤 학생을 보여 줌", async ({ app }) => {
    await showFirst(app);
    await app.ui.row(10).click();
    await app.ui.wait.click();
    await expect(app.ui.showNumber(10)).toBeVisible();
    await expect(app.ui.showNumber(11)).toBeVisible();
    await app.ui.showNumber(11).click();
    await selected(app, 11);
    await app.key("ArrowLeft");
    await expect(app.ui.showNumber(10)).toBeVisible();
    await expect(app.ui.showNumber(11)).toBeVisible();
    await app.ui.showNumber(10).click();
    await selected(app, 10);
  });
});

// ---- 목록 접기 ----

test.describe("목록 접기", () => {
  test("CL-01 접고 펼치기", async ({ app }) => {
    await showFirst(app);
    await expect(app.ui.row(1)).toBeVisible();
    await app.ui.collapse.click();
    await expect(app.ui.rows).toHaveCount(0);
    await app.page.waitForTimeout(350);
    await app.ui.expand.click();
    await expect(app.ui.row(1)).toBeVisible();
  });

  test("CL-02 대기 화면 중", async ({ app }) => {
    await showFirst(app);
    await app.ui.collapse.click();
    await app.key("ArrowRight");
    await waiting(app);
    await expect(app.ui.rows).toHaveCount(0);
    await app.page.waitForTimeout(350);
    await app.ui.expand.click();
    await expect(app.ui.row(1)).toBeVisible();
    await app.ui.collapse.click();
    await expect(app.ui.rows).toHaveCount(0);
    await app.key("ArrowRight");
    await selected(app, 2);
    await expect(app.ui.rows).toHaveCount(0);
  });

  test("CL-03 다음 학생이 보이도록 스크롤", async ({ app }) => {
    await showFirst(app);
    await app.ui.row(25).scrollIntoViewIfNeeded();
    await app.ui.row(25).click();
    await app.key("ArrowRight");
    await waiting(app);
    await app.page.waitForTimeout(500);
    await expect(app.ui.row(26)).toBeInViewport();
  });
});

// ---- 전체 화면 ----

test.describe("전체 화면", () => {
  test("FS-01 F 키", async ({ app, page }) => {
    await showFirst(app);
    await app.key("f");
    await expect.poll(() => isFullscreen(page)).toBe(true);
    await app.key("F");
    await expect.poll(() => isFullscreen(page)).toBe(false);
    // 앱이 직접 해제하면 학생 화면을 그대로 둡니다.
    await selected(app, 1);
  });

  test("FS-02 해제 버튼", async ({ app, page }) => {
    await showFirst(app);
    await expect(app.ui.exitFullscreen).toHaveCount(0);
    await app.key("f");
    await expect(app.ui.exitFullscreen).toBeVisible();
    await app.ui.exitFullscreen.click();
    await expect.poll(() => isFullscreen(page)).toBe(false);
    await expect(app.ui.exitFullscreen).toHaveCount(0);
  });

  test("FS-03 대기 화면 중", async ({ app, page }) => {
    await showFirst(app);
    await app.key("ArrowRight");
    await waiting(app);
    await app.key("f");
    await expect.poll(() => isFullscreen(page)).toBe(true);
    await waiting(app);
  });

  test("FS-04 전체화면에서는 맨 위 바를 숨김", async ({ app, page }) => {
    await showFirst(app);
    const bar = page.locator("header.titlebar");
    await expect(bar).toBeVisible();
    await app.key("f");
    await expect.poll(() => isFullscreen(page)).toBe(true);
    await expect(bar).toHaveCount(0);
  });

  test("FS-05 Esc로 전체화면이 풀려도 대기 화면", async ({ app, page }) => {
    await showFirst(app);
    await app.key("f");
    await expect.poll(() => isFullscreen(page)).toBe(true);
    // 브라우저가 Esc를 먼저 처리해 키가 오지 않는 경우를 그대로 만듭니다.
    await page.evaluate(() => document.exitFullscreen());
    await expect.poll(() => isFullscreen(page)).toBe(false);
    await waiting(app);
  });
});

// ---- 버전 ----

test.describe("버전", () => {
  test("VR-01 Electron", async ({ app, page }) => {
    await page.addInitScript(() => {
      window.electronAPI = { getVersion: () => "9.9.9" };
    });
    await app.seed(mixedStudents());
    expect(await bodyText(page)).not.toContain("9.9.9");
    await app.ui.guide.click();
    await expect(page.getByRole("dialog")).toContainText("버전 9.9.9");
  });

  test("VR-02 웹", async ({ app, page }) => {
    await app.seed(mixedStudents());
    await app.ui.guide.click();
    await expect(page.getByRole("dialog")).not.toContainText("버전");
  });
});
