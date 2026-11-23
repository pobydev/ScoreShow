/**
 * 여러 파일과 폴더 넣기, 점수 화면의 놓는 칸을 시험합니다 (MF-).
 * 학생 이름과 점수는 모두 지어낸 값입니다.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  csvFile,
  dropFileAt,
  evals,
  expect,
  holdFilesAt,
  makeStudent,
  noStudentsXlsx,
  seedLists,
  test,
  writeTempFile,
  xlsxFile,
} from "./helpers.mjs";

const scoreShown = (page) => page.getByText(/\d+ \/ \d+/);
const dialog = (page) => page.getByRole("dialog");
const savedList = (page, name) => page.getByRole("button", { name: new RegExp(`${name}.*저장`) });
const zone = (page) => page.locator('[data-dropzone="true"]');

const CLASS_1 = [makeStudent(1, evals(2)), makeStudent(2, evals(2))];
const CLASS_9 = [makeStudent(1, evals(1), 9)];

async function centerOf(locator) {
  const box = await locator.boundingBox();
  return [box.x + box.width / 2, box.y + box.height / 2];
}

/** 가상 1반 목록을 열고 1번 학생 점수를 보여 줍니다. */
async function showFirstStudent(app, page, origin) {
  await seedLists(page, origin, [
    { name: "가상 1반", students: CLASS_1 },
    { name: "가상 9반", students: CLASS_9 },
  ]);
  await savedList(page, "가상 1반").click();
  await app.ui.row(1).click();
  await expect(scoreShown(page).first()).toBeVisible();
}

test("MF-01 여러 파일을 고르면 한 창에서 이름을 확인하고 한꺼번에 저장", async ({ app, page }) => {
  await app.seed(null);
  await expect(app.ui.fileInput).toHaveAttribute("multiple", "");
  await app.upload([xlsxFile(3, "2반.xlsx", 2), xlsxFile(5, "1반.xlsx", 1), xlsxFile(4, "10반.xlsx", 10)]);
  await expect(dialog(page).getByRole("heading")).toHaveText("파일 3개를 읽었습니다");
  // 1반, 2반, 10반 차례로 놓이고 이름은 파일 제목 줄에서 채웁니다.
  const names = dialog(page).getByRole("textbox");
  await expect(names).toHaveCount(3);
  await expect(names.nth(0)).toHaveValue("2학년 1반 1학기 과학");
  await expect(names.nth(1)).toHaveValue("2학년 2반 1학기 과학");
  await expect(names.nth(2)).toHaveValue("2학년 10반 1학기 과학");
  await expect(dialog(page)).toContainText("5명");

  await dialog(page).getByRole("button", { name: "3개 저장" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(app.ui.alert).toContainText("목록 3개를 저장했습니다");
  // 화면은 옮기지 않고 처음 화면의 목록에 더해집니다.
  await expect(app.ui.rows).toHaveCount(0);
  await expect(savedList(page, "2학년 1반 1학기 과학")).toBeVisible();
  await expect(savedList(page, "2학년 10반 1학기 과학")).toBeVisible();
});

test("MF-02 같은 이름의 다른 목록은 체크할 때만 덮어씀", async ({ app, page, origin }) => {
  await seedLists(page, origin, [{ name: "2학년 1반 1학기 과학", students: CLASS_1 }]);
  await app.upload([xlsxFile(5, "1반.xlsx", 1), xlsxFile(3, "2반.xlsx", 2)]);
  const overwrite = dialog(page).getByRole("checkbox", { name: "1반.xlsx 저장" });
  await expect(overwrite).not.toBeChecked();
  await expect(dialog(page)).toContainText("같은 이름의 목록이 있습니다.");
  await expect(dialog(page).getByRole("button", { name: "1개 저장" })).toBeEnabled();

  await overwrite.check();
  await expect(dialog(page)).toContainText("점수를 수정한 내용도 사라집니다");
  await dialog(page).getByRole("button", { name: "2개 저장" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await savedList(page, "2학년 1반 1학기 과학").click();
  await expect(app.ui.rows).toHaveCount(5);
});

test("MF-03 이미 저장한 것과 같으면 건너뜀", async ({ app, page }) => {
  await app.seed(null);
  const files = [xlsxFile(5, "1반.xlsx", 1), xlsxFile(3, "2반.xlsx", 2)];
  await app.upload(files);
  await dialog(page).getByRole("button", { name: "2개 저장" }).click();
  await expect(dialog(page)).toHaveCount(0);

  await app.upload(files);
  await expect(dialog(page).getByText("이미 저장되어 있어 건너뜁니다.")).toHaveCount(2);
  await expect(dialog(page).getByRole("checkbox", { name: "1반.xlsx 저장" })).toBeDisabled();
  await expect(dialog(page).getByRole("button", { name: "저장", exact: true })).toBeDisabled();
});

test("MF-04 읽지 못한 파일은 이유를 적고 빼며 나머지는 저장", async ({ app, page }) => {
  await app.seed(null);
  await app.upload([xlsxFile(5, "1반.xlsx", 1), csvFile("점수.csv"), noStudentsXlsx()]);
  await expect(dialog(page).getByRole("heading")).toHaveText("파일 3개를 읽었습니다");
  await expect(dialog(page)).toContainText("CSV는 읽지 않습니다");
  await expect(dialog(page)).toContainText("학생을 찾지 못했습니다");
  await expect(dialog(page).getByRole("textbox")).toHaveCount(1);
  await dialog(page).getByRole("button", { name: "1개 저장" }).click();
  await expect(app.ui.alert).toContainText("목록 1개를 저장했습니다");
});

test("MF-05 모두 못 읽으면 닫기만 있음", async ({ app, page }) => {
  await app.seed(null);
  await app.upload([csvFile("가.csv"), csvFile("나.csv")]);
  await expect(dialog(page).getByRole("heading")).toHaveText("파일을 읽지 못했습니다");
  await dialog(page).getByRole("button", { name: "닫기" }).click();
  await expect(dialog(page)).toHaveCount(0);
});

test("MF-06 겹치는 이름은 번호를 붙이고, 고쳐서 겹치거나 비우면 저장할 수 없음", async ({ app, page }) => {
  await app.seed(null);
  await app.upload([xlsxFile(5, "가.xlsx", 1), xlsxFile(3, "나.xlsx", 1)]);
  const first = dialog(page).getByLabel("가.xlsx 목록 이름");
  const second = dialog(page).getByLabel("나.xlsx 목록 이름");
  await expect(second).toHaveValue("2학년 1반 1학기 과학 (2)");

  await second.fill("2학년 1반 1학기 과학");
  await expect(dialog(page)).toContainText("위 줄과 이름이 같습니다");
  await expect(dialog(page).getByRole("button", { name: "2개 저장" })).toBeDisabled();
  // 겹치는 줄의 체크를 풀면 나머지는 저장할 수 있습니다.
  await dialog(page).getByRole("checkbox", { name: "나.xlsx 저장" }).uncheck();
  await expect(dialog(page).getByRole("button", { name: "1개 저장" })).toBeEnabled();

  await first.fill("  ");
  await expect(dialog(page)).toContainText("이름을 적어 주세요");
  await expect(dialog(page).getByRole("button", { name: "1개 저장" })).toBeDisabled();
});

test("MF-07 취소하면 아무것도 저장하지 않음", async ({ app, page }) => {
  await app.seed(null);
  await app.upload([xlsxFile(5, "1반.xlsx", 1), xlsxFile(3, "2반.xlsx", 2)]);
  await dialog(page).getByRole("button", { name: "취소" }).click();
  await expect(page.getByText("아직 저장한 점수가 없습니다.")).toBeVisible();
});

test("MF-08 폴더를 끌어다 놓으면 안의 엑셀만 읽음", async ({ app, page }, testInfo) => {
  await app.seed(null);
  const folder = testInfo.outputPath("2학년 과학");
  mkdirSync(join(folder, "더"), { recursive: true });
  writeFileSync(join(folder, "1반.xlsx"), xlsxFile(5, "1반.xlsx", 1).buffer);
  writeFileSync(join(folder, "2반.xlsx"), xlsxFile(3, "2반.xlsx", 2).buffer);
  writeFileSync(join(folder, "안내.txt"), "가상");
  writeFileSync(join(folder, "더", "3반.xlsx"), xlsxFile(4, "3반.xlsx", 3).buffer);

  await dropFileAt(page, folder, ...(await centerOf(zone(page))));
  await expect(dialog(page).getByRole("heading")).toHaveText("파일 3개를 읽었습니다");
  await expect(dialog(page)).toContainText("엑셀이 아닌 파일 1개는 뺐습니다");
  await dialog(page).getByRole("button", { name: "3개 저장" }).click();
  await expect(savedList(page, "2학년 3반 1학기 과학")).toBeVisible();
});

test("MF-09 점수 화면 왼쪽 아래 칸이 늘 보이고, 누르면 여러 파일 선택", async ({ app, page, origin }) => {
  await showFirstStudent(app, page, origin);
  await expect(zone(page)).toContainText("파일·폴더를 여기에 놓기");
  const chooser = page.waitForEvent("filechooser");
  await zone(page).click();
  expect((await chooser).isMultiple()).toBe(true);
});

test("MF-10 점수 화면 칸에 여러 파일을 놓아도 보던 화면은 그대로", async ({ app, page, origin }, testInfo) => {
  await showFirstStudent(app, page, origin);
  const paths = [
    writeTempFile(testInfo, xlsxFile(5, "1반.xlsx", 3)),
    writeTempFile(testInfo, xlsxFile(3, "2반.xlsx", 4)),
  ];
  await dropFileAt(page, paths, ...(await centerOf(zone(page))));
  await expect(dialog(page).getByRole("heading")).toHaveText("파일 2개를 읽었습니다");
  await dialog(page).getByRole("button", { name: "2개 저장" }).click();
  await expect(app.ui.alert).toContainText("목록 2개를 저장했습니다");
  await expect(app.ui.switcher).toContainText("가상 1반");
  await expect(app.ui.rows).toHaveCount(2);
  await app.ui.switcher.click();
  await expect(page.getByRole("menuitem", { name: "2학년 4반 1학기 과학" })).toBeVisible();
});

test("MF-11 점수 화면 칸에 한 파일을 놓으면 이름을 정해 저장하고 엶", async ({ app, page, origin }, testInfo) => {
  await showFirstStudent(app, page, origin);
  const path = writeTempFile(testInfo, xlsxFile(7, "새 반.xlsx", 5));
  await dropFileAt(page, path, ...(await centerOf(zone(page))));
  await expect(page.getByLabel("목록 이름")).toHaveValue("2학년 5반 1학기 과학");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(app.ui.rows).toHaveCount(7);
  await expect(app.ui.waitText).toBeVisible();
  await expect(scoreShown(page)).toHaveCount(0);
});

test("MF-12 파일을 끌고 오는 동안 칸이 학생 목록 자리까지 넓어짐", async ({ app, page, origin }, testInfo) => {
  await showFirstStudent(app, page, origin);
  const small = (await zone(page).boundingBox()).height;
  const path = writeTempFile(testInfo, xlsxFile(3));
  const release = await holdFilesAt(page, path, 900, 400);
  await expect(zone(page)).toContainText("여기에 놓으면");
  await expect(app.ui.search).toBeHidden();
  expect((await zone(page).boundingBox()).height).toBeGreaterThan(small * 3);
  await release();
  await expect(zone(page)).toContainText("파일·폴더를 여기에 놓기");
  await expect(app.ui.search).toBeVisible();
  await expect(app.ui.rows).toHaveCount(2);
});

test("MF-13 목록을 접어 두어도 끌고 오는 동안만 펼쳐짐", async ({ app, page, origin }, testInfo) => {
  await showFirstStudent(app, page, origin);
  await app.ui.collapse.click();
  await expect(zone(page)).toHaveCount(0);
  const path = writeTempFile(testInfo, xlsxFile(3));
  const release = await holdFilesAt(page, path, 900, 400);
  await expect(zone(page)).toContainText("여기에 놓으면");
  await release();
  await expect(app.ui.expand).toBeVisible();
  await expect(zone(page)).toHaveCount(0);
});

test("MF-14 점수 수정 중에는 칸이 받지 않음", async ({ app, page, origin }, testInfo) => {
  await showFirstStudent(app, page, origin);
  await app.ui.edit.click();
  await page.getByRole("button", { name: "해제하기" }).click();
  const notice = page.getByText("점수 수정 중에는 파일을 넣을 수 없습니다.");
  await expect(notice).toBeVisible();
  const path = writeTempFile(testInfo, xlsxFile(3));
  await dropFileAt(page, path, ...(await centerOf(notice)));
  await page.waitForTimeout(500);
  await expect(dialog(page)).toHaveCount(0);
  expect(page.url().startsWith(origin)).toBe(true);
  await expect(page.getByLabel("1번 쓰기1 점수", { exact: true })).toBeVisible();
});

test("MF-15 낮은 창에서는 평소에 숨기고 끌고 올 때만 보임", async ({ app, page, origin }, testInfo) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await showFirstStudent(app, page, origin);
  await expect(zone(page)).toBeHidden();
  const path = writeTempFile(testInfo, xlsxFile(3));
  const release = await holdFilesAt(page, path, 600, 300);
  await expect(zone(page)).toContainText("여기에 놓으면");
  await release();
  await expect(zone(page)).toBeHidden();
});
