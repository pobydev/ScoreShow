/**
 * 화면 구조를 시험합니다 (06-feature-inventory.md의 RB-, 07-lists-and-shell.md).
 */

import {
  bodyText,
  dropFileAt,
  expect,
  makeStudent,
  mixedStudents,
  test,
  writeTempFile,
  xlsxFile,
} from "./helpers.mjs";

async function allVisibleText(app) {
  // 화면별 글자를 모두 모읍니다.
  const texts = [];
  await app.seed(null);
  texts.push(await bodyText(app.page));
  await app.ui.guide.click();
  texts.push(await bodyText(app.page));
  await app.seed(mixedStudents());
  texts.push(await bodyText(app.page));
  await app.key("ArrowRight");
  texts.push(await bodyText(app.page));
  await app.ui.edit.click();
  texts.push(await bodyText(app.page));
  await app.page.getByRole("button", { name: "해제하기" }).click();
  texts.push(await bodyText(app.page));
  await app.ui.edit.click();
  await app.ui.switcher.click();
  texts.push(await bodyText(app.page));
  return texts;
}

/** 요소가 창 안에 온전히 들어 있는지 봅니다. 스크롤해서 닿는 경우도 허용합니다. */
async function expectReachable(locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport({ ratio: 1 });
}

async function expectNoSideScroll(page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(0);
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll("button, input:not([type=file]), [role=button], h1, h2, p")]
      // 전체 점수표는 자기 안에서 옆으로 스크롤합니다.
      .filter((el) => !el.closest(".score-table"))
      .filter((el) => {
        const box = el.getBoundingClientRect();
        return box.width > 0 && (box.right > window.innerWidth + 1 || box.left < -1);
      })
      .map((el) => el.textContent?.slice(0, 40))
  );
  expect(clipped).toEqual([]);
}

test("RB-01 시작 화면", async ({ app, page }) => {
  await app.seed(null);
  const zone = page.locator('[data-dropzone="true"]');
  await expect(zone).toBeVisible();
  await expect(zone).toContainText("나이스 점수 파일을 여기에 놓아 주세요");
  await expect(zone.getByRole("button", { name: "파일 선택" })).toBeVisible();
  const box = await zone.boundingBox();
  expect(box.width).toBeGreaterThan(600);
  expect(box.height).toBeGreaterThan(400);

  const text = await bodyText(page);
  expect(text).toContain("나이스에서 받는 방법");
  expect(text).toContain("학생 정보는 이 컴퓨터 밖으로 나가지 않습니다.");
  expect(text).toContain("TV와 프로젝터를 끄거나 연결을 해제해 주세요.");
  // 놓는 칸 옆에 안내가 있습니다.
  const side = await page.getByText("나이스에서 받는 방법").boundingBox();
  expect(side.x).toBeGreaterThan(box.x + box.width - 1);
  // 표준 서식은 문제가 있을 때만 찾도록 사용 가이드에 둡니다.
  await expect(page.getByRole("button", { name: "표준 서식 받기" })).toHaveCount(0);
});

test("RB-02 왼쪽 사이드바", async ({ app, page }) => {
  await app.seed(null);
  await app.uploadAndSave(xlsxFile(30), "가상 평가");
  await expect(app.ui.rows).toHaveCount(30);

  const aside = page.locator("aside");
  await expect(aside).toHaveCount(1);
  const box = await aside.boundingBox();
  expect(box.x).toBe(0);
  // 위쪽 34px은 창 맨 위 바입니다.
  expect(box.y).toBe(34);
  expect(box.height).toBe(866);
  expect(box.width).toBe(240);
  await expect(aside).toHaveCSS("background-color", "rgb(255, 255, 255)");

  await expect(aside.locator('img[src*="scoreshow"]')).toHaveCSS("width", "45px");
  await expect(aside.locator(".slogan")).toContainText("수행평가 점수 확인,");
  await expect(aside.locator(".slogan")).toContainText("한 명씩 손쉽고 안전하게");
  await expect(aside.getByText("스코어쇼", { exact: false }).first()).toHaveCSS("font-family", /Pretendard/);
  await expect(aside.getByText("ScoreShow", { exact: true })).toHaveCSS("font-size", "12px");
  await expect(aside.locator(".slogan")).toHaveCSS("font-family", /Hakgyoansim/);
  await expect(aside.getByRole("button", { name: /가상 평가.*30명/ })).toBeVisible();
  await expect(aside.getByLabel("학생 검색")).toBeVisible();
  await expect(aside.locator("[data-student-row]")).toHaveCount(30);
  await expect(aside.getByRole("button", { name: "스코어쇼 사용 가이드" })).toBeVisible();
  await expect(aside.getByRole("button", { name: "이 목록 삭제" })).toBeVisible();
});

test("RB-03 오른쪽 작업 영역", async ({ app, page }) => {
  await app.seed(mixedStudents());
  await app.ui.row(4).click();
  const main = page.locator("main");
  await expect(main.getByRole("heading", { name: "2학년 1반 4번" })).toBeVisible();
  await expect(main.getByRole("button", { name: "점수 수정" })).toBeVisible();
  await expect(main.getByRole("button", { name: "대기 화면", exact: true })).toBeVisible();
  await expect(main.getByRole("button", { name: "전체화면", exact: true })).toBeVisible();
  await expect(main.getByText(/^\d+ \/ 20$/)).toHaveCount(4);
  await expect(page.getByText("발표 시작")).toHaveCount(0);
});

test("RB-04 위쪽 안내 없음", async ({ app, page }) => {
  await app.seed(mixedStudents());
  const text = await bodyText(page);
  expect(text).not.toContain("교과담임");
  // 1440×900에서 목록이 10줄 이상 보입니다.
  const visible = await app.ui.rows.evaluateAll(
    (rows) => rows.filter((row) => row.getBoundingClientRect().bottom <= window.innerHeight).length
  );
  expect(visible).toBeGreaterThanOrEqual(10);
});

test("RB-05 사용 가이드 창", async ({ app, page }) => {
  await app.seed(mixedStudents());
  const dialog = page.getByRole("dialog", { name: "스코어쇼 사용 가이드" });
  await expect(dialog).toHaveCount(0);
  await app.ui.guide.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "표준 서식 받기" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await app.ui.guide.click();
  await page.getByRole("button", { name: "사용 가이드 닫기" }).click();
  await expect(dialog).toHaveCount(0);

  await app.ui.guide.click();
  await page.mouse.click(5, 5);
  await expect(dialog).toHaveCount(0);

  await app.ui.guide.click();
  await dialog.getByRole("heading", { name: "학생 정보" }).click();
  await expect(dialog).toBeVisible();
  // 안내 창이 열려 있을 때 키는 학생을 넘기지 않습니다.
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  await expect(app.ui.presenterTitle).toHaveCount(0);
});

test("RB-07 놓는 칸 밖에 놓기", async ({ app, page, origin }, testInfo) => {
  await app.seed(null);
  // 머리 없는 Chrome은 막지 않아도 넘어가지 않으므로, 기본 동작을 막았는지도 직접 봅니다.
  const prevented = await page.evaluate(() =>
    ["dragover", "drop"].flatMap((type) => {
      const withFile = new DataTransfer();
      withFile.items.add(new File(["가상"], "가상.xlsx"));
      const withText = new DataTransfer();
      withText.setData("text/plain", "가상");
      return [withFile, withText].map((dataTransfer) => {
        const event = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer });
        document.body.dispatchEvent(event);
        return event.defaultPrevented;
      });
    })
  );
  // 파일은 막고, 입력칸에 끌어넣는 글자는 막지 않습니다.
  expect(prevented).toEqual([true, false, true, false]);

  const path = writeTempFile(testInfo, xlsxFile(3));
  await dropFileAt(page, path, 10, 10);
  await page.waitForTimeout(400);
  expect(page.url().startsWith(origin)).toBe(true);
  await expect(app.ui.filePick).toBeVisible();

  await app.seed(mixedStudents());
  await dropFileAt(page, path, 800, 400);
  await page.waitForTimeout(400);
  expect(page.url().startsWith(origin)).toBe(true);
  await expect(app.ui.rows).toHaveCount(40);
});

test("RB-08 영어 문구 없음", async ({ app, page }) => {
  // 이름, 파일 형식, 키 이름, made by, 어울림과 맞춘 사이드바 구역 이름만 허용합니다.
  const allowed = /ScoreShow|made by|pobydev@gmail\.com|xlsx|xls|Esc|Enter|TV|SAVED LISTS|STUDENTS/g;
  for (const text of await allVisibleText(app)) {
    expect(text.replace(allowed, "")).not.toMatch(/[A-Za-z]{2,}/);
  }
  // 오류 메시지도 한국어입니다.
  await app.seed(null);
  await app.upload({ name: "메모.txt", mimeType: "text/plain", buffer: Buffer.from("가상") });
  await expect(app.ui.alert).toContainText("지원하지 않는 형식");
  await app.uploadAndSave(xlsxFile(2));
  await expect(app.ui.alert).toContainText("학생 2명을 불러왔습니다");
  await page.addInitScript(() => {
    window.Worker = class {
      constructor() {
        setTimeout(() => this.onerror?.({ message: "Uncaught SyntaxError" }), 20);
      }
      postMessage() {}
      terminate() {}
    };
  });
  await page.reload();
  await app.upload(xlsxFile(2));
  await expect(app.ui.alert).toContainText("파일을 읽지 못했습니다");
});

test("RB-09 이모지 없음", async ({ app }) => {
  for (const text of await allVisibleText(app)) {
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  }
});

test("RB-10 그라데이션은 첫 화면 바탕에만", async ({ app, page }) => {
  const gradients = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("*")]
        .filter((el) => getComputedStyle(el).backgroundImage.includes("gradient"))
        .map((el) => el.tagName)
    );
  await app.seed(null);
  await app.ui.dropTarget.waitFor();
  expect(await gradients()).toEqual(["MAIN"]);
  await app.seed(mixedStudents());
  expect(await gradients()).toEqual([]);
  await app.key("ArrowRight");
  expect(await gradients()).toEqual([]);
});

test("RB-11 디자인 값", async ({ app, page }) => {
  await app.seed(null);
  const values = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(
      ["canvas", "card", "surface-hover", "ink", "soft", "faint", "line", "hairline", "control", "brand", "accent",
       "accent-hover", "accent-ink", "tint", "wash", "ring", "board", "celebrate", "danger"].map((name) => [
        name,
        style.getPropertyValue(`--${name}`).trim(),
      ])
    );
  });
  expect(values).toEqual({
    canvas: "#f3f6fa",
    card: "#ffffff",
    "surface-hover": "#edf1f6",
    ink: "#1e2a4a",
    soft: "#5b6478",
    faint: "#98a0b0",
    line: "#e3e8f0",
    hairline: "#d5dce6",
    control: "#7f8a9c",
    brand: "#0ea5e9",
    accent: "#0369a1",
    "accent-hover": "#075985",
    "accent-ink": "#075985",
    tint: "#e0f2fe",
    wash: "#f0f9ff",
    ring: "#7dd3fc",
    board: "#22305a",
    celebrate: "#f2a93b",
    danger: "#c42b31",
  });
});

// 틀 없는 Electron 최소 창의 화면 영역은 800×600입니다.
for (const [id, width, height, label] of [
  ["RB-12", 800, 600, "최소 창"],
  ["RB-13", 640, 700, "좁은 창 640"],
  ["RB-13", 480, 700, "좁은 창 480"],
]) {
  test(`${id} ${label} ${width}×${height}`, async ({ app, page }) => {
    await page.setViewportSize({ width, height });
    await app.seed(null);
    await expectNoSideScroll(page);
    await expectReachable(page.getByRole("button", { name: "파일 선택" }));
    await expectReachable(page.getByRole("button", { name: "스코어쇼 사용 가이드" }));

    await app.ui.guide.click();
    const closeGuide = page.getByRole("button", { name: "사용 가이드 닫기" });
    await expectReachable(closeGuide);
    await expectReachable(page.getByRole("dialog").getByRole("button", { name: "표준 서식 받기" }));
    await closeGuide.click();

    await app.seed(mixedStudents());
    await expectNoSideScroll(page);

    // 메시지는 스크롤하지 않아도 보입니다.
    await app.upload({ name: "메모.txt", mimeType: "text/plain", buffer: Buffer.from("가상") });
    await expect(app.ui.alert).toBeInViewport({ ratio: 1 });
    await expect(app.ui.alert).toBeHidden({ timeout: 6500 });

    // 좁은 창에서는 목록이 접힌 채 시작합니다.
    if (width < 768) await app.ui.expand.click();
    await expectReachable(app.ui.search);
    await expectReachable(app.ui.switcher);
    await expectReachable(app.ui.guide);
    await expectReachable(app.ui.removeList);

    // 목록은 끝까지 닿고 4줄 이상 보입니다.
    await expectReachable(app.ui.row(40));
    const visible = await app.ui.rows.evaluateAll((rows) => {
      const list = rows[0].closest(".overflow-y-auto").getBoundingClientRect();
      return rows.filter((row) => {
        const box = row.getBoundingClientRect();
        return box.top >= list.top - 1 && box.bottom <= list.bottom + 1;
      }).length;
    });
    expect(visible).toBeGreaterThanOrEqual(4);

    // 평가 7개 학생과 전체 점수표도 닿습니다.
    await app.ui.row(7).click();
    if (width < 768) await app.ui.collapse.click();
    await expectReachable(page.getByText("발표", { exact: true }));
    await expectReachable(app.ui.edit);
    await app.ui.edit.click();
    await page.getByRole("button", { name: "해제하기" }).click();
    await expect(app.ui.areaInputs).toHaveCount(7);
    await expectReachable(app.ui.score(40, "읽기").or(app.ui.score(7, "발표")).first());
    await expectNoSideScroll(page);
  });
}

for (const [width, height] of [
  [1366, 768],
  [1280, 720],
  [1024, 768],
  [800, 600],
  [640, 700],
  [480, 700],
]) {
  test(`RB-14 학생 점수 화면 ${width}×${height}`, async ({ app, page }) => {
    await page.setViewportSize({ width, height });
    // 긴 점수까지 시험합니다.
    const students = mixedStudents();
    for (const student of students) {
      for (const evaluation of student.evaluations) {
        if (evaluation.score !== null) evaluation.score = 12.5;
      }
    }
    await app.seed(students);
    await app.key("ArrowRight");
    await expectNoSideScroll(page);

    for (const count of [1, 2, 3, 4, 5, 6, 7]) {
      if (count > 1) {
        // 좁은 창에서는 목록이 접혀 있어 키로 넘어갑니다.
        await app.key("ArrowRight");
        await app.key("ArrowRight");
      }
      await expect(app.ui.presenterTitle).toHaveText(`2학년 1반 ${count}번`);
      await page.waitForTimeout(450);
      const problems = await page.evaluate(() => {
        const out = [];
        const inView = (box) => box.left >= -1 && box.right <= window.innerWidth + 1;
        for (const el of document.querySelectorAll("h1, h2, .rounded-card, .rounded-card *")) {
          if (!inView(el.getBoundingClientRect())) out.push(`창 밖: ${el.textContent}`);
        }
        for (const card of document.querySelectorAll(".rounded-card")) {
          const box = card.getBoundingClientRect();
          for (const child of card.children) {
            const inner = child.getBoundingClientRect();
            if (inner.width > box.width + 1 || child.scrollWidth > child.clientWidth + 1) out.push(`카드 밖: ${child.textContent}`);
          }
        }
        return out;
      });
      expect(problems, `평가 ${count}개`).toEqual([]);
      await expectNoSideScroll(page);
    }

    await expectReachable(app.ui.wait);
    await expectReachable(page.getByRole("button", { name: "목록 펼치기" }).or(app.ui.collapse));
  });
}

// 점수 카드: 긴 영역 이름과 소수 점수도 한 줄이고, 점수 위아래 빈칸이 같고, 카드 크기가 같습니다.
const LONG_AREA = "실험 보고서 및 탐구 과정 평가 (서·논술)";
const CARD_CASES = {
  "한 영역": [{ area: "수행평가", score: 18.5, maxScore: 20 }],
  "긴 이름 한 영역": [{ area: LONG_AREA, score: 18.5, maxScore: 20 }],
  "다섯 영역": [
    { area: "탐구1 (서·논술)", score: 18.5, maxScore: 20 },
    { area: "탐구2 (서·논술)", score: 12.5, maxScore: 20 },
    { area: "토론", score: 27, maxScore: 30 },
    { area: "실험", score: 4.5, maxScore: 5 },
    { area: "보고서", score: null, maxScore: 10 },
  ],
  "긴 이름 다섯 영역": [
    { area: LONG_AREA, score: 18.5, maxScore: 20 },
    { area: "탐구2 (서·논술)", score: 12.5, maxScore: 20 },
    { area: "토론", score: 100, maxScore: 100 },
    { area: "프로젝트 기반 문제 해결 활동", score: 4.5, maxScore: 5 },
    { area: "보고서", score: 9, maxScore: 10 },
  ],
  "일곱 영역": ["탐구1 (서·논술)", "탐구2 (서·논술)", "토론", "실험", "보고서", "듣기", "말하기"].map((area) => ({
    area,
    score: 18.5,
    maxScore: 100,
  })),
};

for (const [width, height, fullscreen] of [
  [800, 600, false],
  [1366, 768, false],
  [1920, 1080, false],
  [1920, 1080, true],
]) {
  for (const [label, evaluations] of Object.entries(CARD_CASES)) {
    test(`RB-14b 점수 카드 ${width}×${height}${fullscreen ? " 전체화면" : ""} ${label}`, async ({ app, page }) => {
      await page.setViewportSize({ width, height });
      await app.seed([makeStudent(1, evaluations), makeStudent(2, evaluations)]);
      await app.key("ArrowRight");
      await expect(app.ui.presenterTitle).toBeVisible();
      if (fullscreen) {
        await app.key("f");
        await page.waitForFunction(() => document.fullscreenElement);
      }
      await page.waitForTimeout(450);
      const result = await page.evaluate(() => {
        const lineCount = (element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
        };
        const cards = [...document.querySelectorAll(".score-card")];
        const scroller = cards[0].closest(".overflow-y-auto");
        const parts = cards.map((card) => {
          const box = card.getBoundingClientRect();
          const area = card.querySelector(".score-card-area");
          const score = card.querySelector(".score-card-score");
          const areaBox = area.getBoundingClientRect();
          const scoreBox = score.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(score);
          return {
            lines: lineCount(area) + lineCount(score),
            fits: range.getBoundingClientRect().width <= scoreBox.width + 1 && scoreBox.right <= box.right,
            above: scoreBox.top - areaBox.bottom,
            below: box.bottom - scoreBox.bottom,
            width: box.width,
            height: box.height,
            areaSize: getComputedStyle(area).fontSize,
            scoreSize: getComputedStyle(score).fontSize,
          };
        });
        return { parts, overflow: scroller.scrollHeight - scroller.clientHeight };
      });
      expect(result.overflow, "세로 스크롤").toBeLessThanOrEqual(0);
      for (const part of result.parts) {
        expect(part.lines, "줄 수").toBe(2);
        expect(part.fits, "점수가 카드 안").toBe(true);
        expect(Math.abs(part.above - part.below), "점수 위아래 빈칸").toBeLessThanOrEqual(1);
      }
      // 칸 너비의 소수점 차이로 글자 크기가 0.1px 안에서 달라질 수 있습니다.
      const spread = (key) => {
        const sizes = result.parts.map((part) => parseFloat(part[key]));
        return Math.max(...sizes) - Math.min(...sizes);
      };
      expect(spread("areaSize"), "영역 글자 크기").toBeLessThanOrEqual(0.1);
      expect(spread("scoreSize"), "점수 글자 크기").toBeLessThanOrEqual(0.1);
      expect(new Set(result.parts.map((part) => Math.round(part.width))).size, "카드 너비").toBe(1);
      expect(new Set(result.parts.map((part) => Math.round(part.height))).size, "카드 높이").toBe(1);
    });
  }
}

test("RB-15 화면 구조", async ({ app, page }) => {
  await app.seed(mixedStudents());
  await app.key("ArrowRight");
  const aside = page.locator("aside");
  await expect(aside).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(aside.locator('img[src*="scoreshow"]')).toBeVisible();
  await expect(page.locator("main .rounded-card").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(app.ui.row(1).locator("..")).toHaveCSS("border-radius", "10px");
  // 목록 접기 버튼은 사이드바 안에 있습니다.
  const asideBox = await aside.boundingBox();
  const collapseBox = await app.ui.collapse.boundingBox();
  expect(collapseBox.x + collapseBox.width).toBeLessThanOrEqual(asideBox.x + asideBox.width);
  const bar = page.locator("header.titlebar");
  await expect(bar).toHaveCSS("height", "34px");
  await expect(bar).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(bar).toContainText("이전에 저장한 점수");
});

test("RB-15b 창 조절 버튼은 Electron에서만", async ({ app, page }) => {
  await app.seed(null);
  await expect(page.getByRole("button", { name: "앱 닫기" })).toHaveCount(0);
  await page.addInitScript(() => {
    window.__actions = [];
    window.electronAPI = { getVersion: () => "9.9.9", windowAction: (action) => window.__actions.push(action) };
  });
  await page.reload();
  await page.getByRole("button", { name: "창 최소화" }).click();
  await page.getByRole("button", { name: "창 최대화" }).click();
  await page.getByRole("button", { name: "앱 닫기" }).click();
  expect(await page.evaluate(() => window.__actions)).toEqual(["minimize", "maximize", "close"]);
});

test("RB-16 made by gnilab", async ({ app, page }) => {
  const madeBy = page.locator('[data-made-by="true"]');
  const check = async (scope) => {
    const mark = scope.locator('[data-made-by="true"]');
    await expect(mark).toBeVisible();
    const logo = mark.locator('img[alt="gnilab"]');
    await expect(logo).toHaveCSS("height", "16px");
    await expect(mark).toHaveCSS("gap", "5px");
    await expect(mark.getByText("made by", { exact: true })).toHaveCSS("font-size", "12px");
    await expect(mark.getByText("made by", { exact: true })).toHaveCSS("color", "rgb(91, 100, 120)");
    expect(await mark.evaluate((el) => !!el.closest("a, button"))).toBe(false);
    expect(await mark.locator("a, button").count()).toBe(0);
    expect(await logo.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
  };

  // 시작 화면에는 없습니다.
  await app.seed(null);
  await expect(madeBy).toHaveCount(0);

  // 사용 가이드 창 안
  await app.ui.guide.click();
  await check(page.getByRole("dialog"));

  // 사이드바와 학생 점수 화면에는 없습니다.
  await app.seed(mixedStudents());
  await expect(madeBy).toHaveCount(0);
  await app.key("ArrowRight");
  await expect(madeBy).toHaveCount(0);
});
