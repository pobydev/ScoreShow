/**
 * 전체 점수표에서 점수가 모르게 바뀌지 않는지 시험합니다 (ES-). 이름과 점수는 모두 지어낸 값입니다.
 */

import { expect, makeStudent, readStoredCipher, seedLists, test, xlsxFile } from "./helpers.mjs";

const AREA = "쓰기1";
const OTHER = "말하기";
const student = (number, first = 6, second = 12.5) =>
  makeStudent(number, [
    { area: AREA, score: first, maxScore: 20 },
    { area: OTHER, score: second, maxScore: 20 },
  ]);
const STUDENTS = [student(1), student(2, 8), student(3, 15)];

async function openTable(app, page, origin, students = STUDENTS) {
  await seedLists(page, origin, [{ name: "가상 1반", students }]);
  await page.getByRole("button", { name: /가상 1반.*저장/ }).click();
  await app.ui.edit.click();
  await page.getByRole("button", { name: "해제하기" }).click();
  await expect(app.ui.areaInputs.first()).toBeVisible();
}

async function typeInto(app, page, number, area, text) {
  await app.ui.score(number, area).click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type(text);
}

const mark = (page) => page.getByText(/^수정됨 · 원래 /);

/** 저장 없이 끝나는 조작 뒤에 점수와 표시가 그대로인지 봅니다. */
async function expectUntouched(app, page) {
  await expect(app.ui.score(1, AREA)).toHaveValue("6");
  await expect(app.ui.score(2, AREA)).toHaveValue("8");
  await expect(mark(page)).toHaveCount(0);
  await expect(page.getByText(/^수정한 점수/)).toHaveCount(0);
}

test("ES-01 칸에서 아래 화살표를 눌러도 값이 그대로이고 아랫줄로 옮겨 감", async ({ app, page, origin }) => {
  await openTable(app, page, origin);
  await app.ui.score(1, AREA).click();
  await app.key("ArrowDown");
  await expect(app.ui.score(2, AREA)).toBeFocused();
  await app.key("ArrowDown");
  await expect(app.ui.score(3, AREA)).toBeFocused();
  await app.key("ArrowUp");
  await expect(app.ui.score(2, AREA)).toBeFocused();
  await expect(app.ui.score(3, AREA)).toHaveValue("15");
  await expectUntouched(app, page);
});

test("ES-02 Enter도 줄을 옮기며 값은 고친 칸만 저장", async ({ app, page, origin }) => {
  await openTable(app, page, origin);
  await typeInto(app, page, 1, AREA, "7");
  await app.key("Enter");
  await expect(app.ui.score(2, AREA)).toBeFocused();
  await expect(app.ui.score(1, AREA)).toHaveValue("7");
  await expect(app.ui.score(2, AREA)).toHaveValue("8");
  await app.key("Shift+Enter");
  await expect(app.ui.score(1, AREA)).toBeFocused();
  await expect(mark(page)).toHaveCount(1);
});

test("ES-03 칸의 오른쪽 끝을 두 번 눌러도 값이 그대로 (옛 스핀 버튼 자리)", async ({ app, page, origin }) => {
  await openTable(app, page, origin);
  const cell = app.ui.score(1, AREA);
  await expect(cell).toHaveAttribute("type", "text");
  const box = await cell.boundingBox();
  await page.mouse.dblclick(box.x + box.width - 8, box.y + box.height / 4);
  await page.mouse.dblclick(box.x + box.width - 8, box.y + (box.height * 3) / 4);
  await page.keyboard.press("Tab");
  await expectUntouched(app, page);
});

test("ES-04 고른 칸 위에서 휠을 돌려도 값이 그대로", async ({ app, page, origin }) => {
  await openTable(app, page, origin);
  const cell = app.ui.score(1, AREA);
  await cell.click();
  await page.mouse.wheel(0, 40);
  await page.mouse.wheel(0, -40);
  await page.keyboard.press("Tab");
  await expectUntouched(app, page);
});

test("ES-05 숫자가 아닌 글자는 칸에 들어가지 않음", async ({ app, page, origin }) => {
  await openTable(app, page, origin);
  const cell = app.ui.score(1, AREA);
  await cell.click();
  await page.keyboard.type("e-+,a가");
  await expect(cell).toHaveValue("6");
  await page.keyboard.press("Tab");
  await expectUntouched(app, page);
});

test("ES-06 표를 열었을 때 칸을 고르기 전에는 어떤 키도 값을 바꾸지 않음", async ({ app, page, origin }) => {
  await openTable(app, page, origin);
  await expect(page.getByRole("region", { name: "전체 점수표" })).toBeFocused();
  for (const key of ["1", "9", "e", "-", "Enter", "Backspace", "Delete", "ArrowDown", "ArrowDown", "ArrowUp"]) {
    await app.key(key);
  }
  await expect(app.ui.areaInputs.first()).toBeVisible();
  await expectUntouched(app, page);
});

test("ES-07 칸을 고르지 않았을 때 위아래 키는 표를 스크롤하고 왼쪽 오른쪽 키는 닫음", async ({ app, page, origin }) => {
  const many = Array.from({ length: 40 }, (_, index) => student(index + 1));
  await page.setViewportSize({ width: 1000, height: 600 });
  await openTable(app, page, origin, many);
  const region = page.getByRole("region", { name: "전체 점수표" });
  await app.key("ArrowDown");
  await app.key("ArrowDown");
  await expect.poll(() => region.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(app.ui.areaInputs.first()).toBeVisible();
  await app.key("ArrowRight");
  await expect(app.ui.areaInputs).toHaveCount(0);
  await expect(app.ui.waitText).toBeVisible();
});

test("ES-08 F는 전체화면만 바꾸고 값을 바꾸지 않음", async ({ app, page, origin }) => {
  await openTable(app, page, origin);
  await app.key("f");
  await page.waitForFunction(() => document.fullscreenElement);
  await expect(app.ui.areaInputs.first()).toBeVisible();
  await expectUntouched(app, page);
});

test("ES-09 만점보다 큰 점수는 저장하지 않고 칸에 알림", async ({ app, page, origin }) => {
  await openTable(app, page, origin);
  for (const text of ["20.5", "65"]) {
    await typeInto(app, page, 1, AREA, text);
    await app.key("Enter");
    // 저장되지 않으면 그 칸에 남아 까닭을 보여 줍니다.
    await expect(app.ui.score(1, AREA)).toBeFocused();
    await expect(app.ui.score(1, AREA)).toHaveValue("6");
    await expect(page.getByRole("alert")).toContainText("만점 20점보다 큽니다. 6점으로 둡니다.");
  }
  await expect(mark(page)).toHaveCount(0);

  // 다른 칸을 눌러 벗어날 때도 같습니다.
  await typeInto(app, page, 2, AREA, "99");
  await app.ui.score(3, AREA).click();
  await expect(app.ui.score(2, AREA)).toHaveValue("8");
  await expect(page.locator("tr", { has: app.ui.score(2, AREA) }).getByRole("alert")).toContainText(
    "8점으로 둡니다."
  );

  // 만점과 같은 값과 0은 됩니다.
  await typeInto(app, page, 3, AREA, "20");
  await app.key("Enter");
  await typeInto(app, page, 1, AREA, "0");
  await app.key("Enter");
  await expect(app.ui.score(3, AREA)).toHaveValue("20");
  await expect(app.ui.score(1, AREA)).toHaveValue("0");
});

test("ES-10 비우면 미입력으로 저장되고 표시가 남음", async ({ app, page, origin }) => {
  await openTable(app, page, origin);
  await typeInto(app, page, 1, AREA, "");
  await page.keyboard.press("Delete");
  await app.key("Enter");
  await expect(app.ui.score(1, AREA)).toHaveValue("");
  await expect(page.getByText("수정됨 · 원래 6", { exact: true })).toBeVisible();
});

test("ES-11 입력 중인 값은 Esc로 닫으면 저장하지 않음", async ({ app, page, origin }) => {
  await openTable(app, page, origin);
  await typeInto(app, page, 1, AREA, "3");
  await app.key("Escape");
  await expect(app.ui.areaInputs).toHaveCount(0);
  await app.ui.edit.click();
  await page.getByRole("button", { name: "해제하기" }).click();
  await expectUntouched(app, page);
});

test("ES-12 고친 칸의 표시, 개수, 되돌리기", async ({ app, page, origin }) => {
  await openTable(app, page, origin);
  await typeInto(app, page, 1, AREA, "5");
  await app.key("Enter");
  await expect(page.getByText("수정됨 · 원래 6", { exact: true })).toBeVisible();
  await expect(page.getByText("수정한 점수 1개")).toBeVisible();

  // 다시 고쳐도 처음 값을 기억합니다.
  await typeInto(app, page, 1, AREA, "4");
  await app.key("Enter");
  await expect(page.getByText("수정됨 · 원래 6", { exact: true })).toBeVisible();

  await typeInto(app, page, 2, OTHER, "1");
  await app.key("Enter");
  await expect(page.getByText("수정한 점수 2개")).toBeVisible();

  await page.getByRole("button", { name: `1번 ${AREA} 되돌리기` }).click();
  await expect(app.ui.score(1, AREA)).toHaveValue("6");
  await expect(page.getByText("수정한 점수 1개")).toBeVisible();

  // 손으로 처음 값을 다시 넣어도 표시가 사라집니다.
  await typeInto(app, page, 2, OTHER, "12.5");
  await app.key("Enter");
  await expectUntouched(app, page);
});

test("ES-13 같은 값으로 쓰면 표시가 생기지 않음", async ({ app, page, origin }) => {
  await openTable(app, page, origin);
  for (const text of ["6", "06", "6.", "6.0"]) {
    await typeInto(app, page, 1, AREA, text);
    await app.key("Enter");
  }
  await expectUntouched(app, page);
});

test("ES-14 학생 화면에는 고친 표시가 나오지 않음", async ({ app, page, origin }) => {
  await openTable(app, page, origin);
  await typeInto(app, page, 1, AREA, "5");
  await app.key("Enter");
  await app.ui.edit.click();
  await app.ui.row(1).click();
  await expect(page.getByText("5 / 20", { exact: true })).toBeVisible();
  const main = await page.locator("main").innerText();
  expect(main).not.toContain("수정됨");
  expect(main).not.toContain("원래");
  expect(main).not.toContain("수정한 점수");
  await expect(page.getByText("6 / 20", { exact: true })).toHaveCount(0);
});

test("ES-15 다시 켜도 표시가 남고, 표시가 없는 옛 자료도 열림", async ({ app, page, origin }) => {
  // STUDENTS에는 originalScore가 없습니다. 옛 저장 자료와 같습니다.
  await openTable(app, page, origin);
  await expectUntouched(app, page);
  await typeInto(app, page, 1, AREA, "5");
  await app.key("Enter");
  await expect(mark(page)).toHaveCount(1);
  await page.waitForTimeout(200);

  await page.reload();
  await page.getByRole("button", { name: /가상 1반.*저장/ }).click();
  await app.ui.edit.click();
  await page.getByRole("button", { name: "해제하기" }).click();
  await expect(app.ui.score(1, AREA)).toHaveValue("5");
  await expect(page.getByText("수정됨 · 원래 6", { exact: true })).toBeVisible();
  await expect(page.getByText("수정한 점수 1개")).toBeVisible();
  expect(await readStoredCipher(page)).toHaveLength(1);
});

test("ES-16 만점을 지금 점수보다 낮추면 먼저 묻고, 취소하면 그대로", async ({ app, page, origin }) => {
  await openTable(app, page, origin);
  const max = app.ui.max(AREA);
  await max.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("10");
  await app.key("Enter");

  const ask = page.getByRole("dialog", { name: `${AREA} 만점을 10점으로 낮출까요?` });
  await expect(ask).toContainText("학생 1명의 점수가 새 만점보다 큽니다");
  await ask.getByRole("button", { name: "취소" }).click();
  await expect(max).toHaveValue("20");
  await expect(mark(page)).toHaveCount(0);

  // Esc는 창만 닫고 표는 닫지 않습니다.
  await max.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("10");
  await app.key("Enter");
  await expect(ask).toBeVisible();
  await app.key("Escape");
  await expect(ask).toBeHidden();
  await expect(app.ui.areaInputs.first()).toBeVisible();
  await expect(max).toHaveValue("20");

  await max.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("10");
  await app.key("Enter");
  await ask.getByRole("button", { name: "만점 바꾸기" }).click();
  await expect(max).toHaveValue("10");
  // 점수는 그대로 두고 표에 표시합니다.
  await expect(app.ui.score(3, AREA)).toHaveValue("15");
  await expect(page.locator("tr", { has: app.ui.score(3, AREA) })).toContainText("만점보다 큽니다");
});

test("ES-17 만점 표시와 되돌리기, 0과 빈 값은 받지 않음", async ({ app, page, origin }) => {
  await openTable(app, page, origin);
  const max = app.ui.max(AREA);
  for (const text of ["0", ""]) {
    await max.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Delete");
    await page.keyboard.type(text);
    await app.key("Enter");
    await expect(max).toHaveValue("20");
    await expect(page.getByRole("alert")).toContainText("만점은 0보다 커야 합니다");
  }

  await max.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("30");
  await app.key("Enter");
  await expect(max).toHaveValue("30");
  await expect(page.getByText("수정됨 · 원래 20", { exact: true })).toBeVisible();
  await expect(page.getByText("수정한 만점 1개")).toBeVisible();
  await page.getByRole("button", { name: `${AREA} 만점 되돌리기` }).click();
  await expect(max).toHaveValue("20");
  await expect(mark(page)).toHaveCount(0);
});

test("ES-18 다시 넣을 때 다른 학생과 영역을 점수 없이 알려 줌", async ({ app, page }) => {
  await app.seed(null);
  await app.uploadAndSave(xlsxFile(5), "우리 반");
  // 3번의 점수를 고쳐 파일과 달라지게 합니다.
  await app.ui.edit.click();
  await page.getByRole("button", { name: "해제하기" }).click();
  await app.ui.score(3, "말하기").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("1.5");
  await app.key("Enter");
  await app.ui.edit.click();

  await app.upload(xlsxFile(7));
  await page.getByLabel("목록 이름").fill("우리 반");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  const ask = page.getByRole("dialog", { name: "같은 이름의 목록이 있습니다" });
  const lines = ask.getByRole("list", { name: "달라지는 학생과 영역" });
  await expect(lines).toContainText("3번: 말하기");
  await expect(lines).toContainText("6번: 새 파일에만 있음");
  await expect(lines).toContainText("7번: 새 파일에만 있음");
  // 잠금을 풀기 전이라 점수와 이름은 보이지 않습니다.
  const text = await ask.innerText();
  expect(text).not.toMatch(/\d+ \/ \d+|1\.5|가상/);
});
