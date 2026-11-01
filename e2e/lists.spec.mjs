/**
 * 저장 목록을 시험합니다 (docs/refactor/07-lists-and-shell.md의 SL-).
 */

import { evals, expect, makeStudent, mixedStudents, readStoredCipher, seedLists, test, xlsxFile } from "./helpers.mjs";

const DAY = 24 * 60 * 60 * 1000;
const scoreShown = (page) => page.getByText(/\d+ \/ \d+/);

const CLASS_A = [makeStudent(1, evals(2)), makeStudent(2, evals(2))];
const CLASS_B = [makeStudent(1, evals(1), 2)];

test("SL-01 추천 이름이 채워진 저장 창", async ({ app, page }) => {
  await app.seed(null);
  await app.upload(xlsxFile(5));
  const input = page.getByLabel("목록 이름");
  await expect(input).toHaveValue("2학년 1반 1학기 과학");
  await expect(input).toBeFocused();
  await expect(page.getByRole("dialog")).toContainText("학생 5명을 읽었습니다.");
});

test("SL-02 취소하면 아무것도 저장하지 않음", async ({ app, page }) => {
  await app.seed(null);
  await app.upload(xlsxFile(5));
  await page.getByRole("dialog").getByRole("button", { name: "취소" }).click();
  await expect(app.ui.rows).toHaveCount(0);
  expect(await readStoredCipher(page)).toBeNull();
  await expect(page.getByText("아직 저장한 점수가 없습니다.")).toBeVisible();
});

test("SL-03 이름을 비우면 저장할 수 없음", async ({ app, page }) => {
  await app.seed(null);
  await app.upload(xlsxFile(5));
  await page.getByLabel("목록 이름").fill("   ");
  await expect(page.getByRole("button", { name: "저장", exact: true })).toBeDisabled();
});

test("SL-04 저장한 목록은 대기 화면으로 열림", async ({ app, page }) => {
  await app.seed(null);
  await app.uploadAndSave(xlsxFile(5), "우리 반");
  await expect(app.ui.rows).toHaveCount(5);
  await expect(app.ui.waitText).toBeVisible();
  await expect(scoreShown(page)).toHaveCount(0);
});

test("SL-05 켤 때 목록만 보이고 점수는 고른 뒤에", async ({ app, page, origin }) => {
  await seedLists(page, origin, [
    { name: "가상 1반", students: CLASS_A },
    { name: "가상 2반", students: CLASS_B },
  ]);
  const first = page.getByRole("button", { name: /가상 1반.*저장/ });
  await expect(first).toContainText("2명");
  await expect(page.getByRole("button", { name: /가상 2반.*저장/ })).toContainText("1명");
  await expect(app.ui.rows).toHaveCount(0);
  await expect(scoreShown(page)).toHaveCount(0);
  await first.click();
  await expect(app.ui.rows).toHaveCount(2);
  await expect(app.ui.waitText).toBeVisible();
  await expect(scoreShown(page)).toHaveCount(0);
});

test("SL-06 목록 전환은 대기 화면으로 시작", async ({ app, page, origin }) => {
  await seedLists(page, origin, [
    { name: "가상 1반", students: CLASS_A },
    { name: "가상 2반", students: CLASS_B },
  ]);
  await page.getByRole("button", { name: /가상 1반.*저장/ }).click();
  await app.key("ArrowRight");
  await expect(scoreShown(page)).toHaveCount(2);

  await app.ui.switcher.click();
  await page.getByRole("menuitem", { name: "가상 2반" }).click();
  await expect(app.ui.rows).toHaveCount(1);
  await expect(app.ui.waitText).toBeVisible();
  await expect(scoreShown(page)).toHaveCount(0);

  await app.ui.switcher.click();
  await page.getByRole("menuitem", { name: "저장 목록으로" }).click();
  await expect(app.ui.rows).toHaveCount(0);
  await expect(page.locator('[data-dropzone="true"]')).toBeVisible();
});

test("SL-07 전환 메뉴의 Esc와 바깥 클릭은 메뉴만 닫음", async ({ app, page }) => {
  await app.seed(mixedStudents());
  await app.key("ArrowRight");
  await expect(app.ui.presenterTitle).toBeVisible();
  await app.ui.switcher.click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await app.key("Escape");
  await expect(menu).toHaveCount(0);
  await expect(app.ui.presenterTitle).toBeVisible();
  await app.ui.switcher.click();
  await page.mouse.click(900, 700);
  await expect(menu).toHaveCount(0);
  await expect(app.ui.presenterTitle).toBeVisible();
});

test("SL-08 같은 이름, 같은 내용이면 저장하지 않고 엶", async ({ app, page }) => {
  await app.seed(null);
  await app.uploadAndSave(xlsxFile(5), "우리 반");
  const before = await readStoredCipher(page);
  await app.ui.switcher.click();
  await page.getByRole("menuitem", { name: "저장 목록으로" }).click();

  await app.uploadAndSave(xlsxFile(5), "  우리   반 ");
  await expect(app.ui.alert).toContainText("이미 저장되어 있습니다");
  await expect(app.ui.rows).toHaveCount(5);
  expect(await readStoredCipher(page)).toEqual(before);
});

test("SL-09 같은 이름, 다른 내용이면 덮어쓸지 물음", async ({ app, page }) => {
  await app.seed(null);
  await app.uploadAndSave(xlsxFile(5), "우리 반");
  await app.upload(xlsxFile(7));
  await page.getByLabel("목록 이름").fill("우리 반");
  await page.getByRole("button", { name: "저장", exact: true }).click();

  const ask = page.getByRole("dialog", { name: "같은 이름의 목록이 있습니다" });
  await expect(ask).toContainText("학생 2명");
  await expect(ask).toContainText("덮어쓰면 점수 수정 내용도 사라집니다");
  // 취소하면 이름을 바꿀 수 있습니다.
  await ask.getByRole("button", { name: "취소" }).click();
  const input = page.getByLabel("목록 이름");
  await expect(input).toBeVisible();
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await ask.getByRole("button", { name: "덮어쓰기" }).click();
  await expect(app.ui.rows).toHaveCount(7);
  expect(await readStoredCipher(page)).toHaveLength(1);
});

test("SL-10 다른 이름이면 그대로 따로 저장", async ({ app, page }) => {
  await app.seed(null);
  await app.uploadAndSave(xlsxFile(5), "우리 반");
  await app.uploadAndSave(xlsxFile(7), "다른 이름");
  expect(await readStoredCipher(page)).toHaveLength(2);
});

test("SL-11 점수 수정은 그 목록에만 저장", async ({ app, page, origin }) => {
  await seedLists(page, origin, [
    { name: "가상 1반", students: CLASS_A },
    { name: "가상 2반", students: CLASS_B },
  ]);
  await page.getByRole("button", { name: /가상 1반.*저장/ }).click();
  await app.ui.edit.click();
  await page.getByRole("button", { name: "해제하기" }).click();
  await app.ui.score(1, "쓰기1").fill("19");
  await page.waitForTimeout(150);

  await page.reload();
  await page.getByRole("button", { name: /가상 2반.*저장/ }).click();
  await app.key("ArrowRight");
  await expect(page.getByText("3 / 20", { exact: true })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: /가상 1반.*저장/ }).click();
  await app.key("ArrowRight");
  await expect(page.getByText("19 / 20", { exact: true })).toBeVisible();
});

test("SL-12 목록 하나 삭제", async ({ app, page, origin }) => {
  await seedLists(page, origin, [
    { name: "가상 1반", students: CLASS_A },
    { name: "가상 2반", students: CLASS_B },
  ]);
  await page.getByRole("button", { name: "가상 1반 삭제" }).click();
  await expect(page.getByRole("dialog")).toContainText("가상 1반");
  await app.ui.confirmDelete.click();
  await expect(page.getByRole("button", { name: /가상 1반.*저장/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /가상 2반.*저장/ }).first()).toBeVisible();
  expect(await readStoredCipher(page)).toHaveLength(1);
  // 다른 목록이 남아 있으면 키를 지우지 않습니다.
  expect(await page.evaluate(() => localStorage.getItem("scoreshow-encryption-key"))).not.toBeNull();
});

test("SL-13 보고 있는 목록을 삭제하면 저장 목록으로", async ({ app, page, origin }) => {
  await seedLists(page, origin, [
    { name: "가상 1반", students: CLASS_A },
    { name: "가상 2반", students: CLASS_B },
  ]);
  await page.getByRole("button", { name: /^가상 1반 .*저장/ }).click();
  await app.ui.removeList.click();
  await app.ui.confirmDelete.click();
  await expect(app.ui.rows).toHaveCount(0);
  await expect(page.getByRole("button", { name: /가상 2반.*저장/ }).first()).toBeVisible();
});

test("SL-14 모두 삭제", async ({ app, page, origin }) => {
  await seedLists(page, origin, [
    { name: "가상 1반", students: CLASS_A },
    { name: "가상 2반", students: CLASS_B },
  ]);
  await app.ui.removeAll.click();
  await expect(page.getByRole("dialog")).toContainText("저장 목록 2개");
  await app.ui.confirmDelete.click();
  await expect(page.getByText("아직 저장한 점수가 없습니다.")).toBeVisible();
  await expect.poll(() => readStoredCipher(page)).toBeNull();
});

test("SL-15 30일이 지나면 지울지 묻고 나중에는 7일 뒤", async ({ page, origin }) => {
  const now = Date.now();
  await seedLists(page, origin, [
    { name: "오래된 반", savedAt: now - 31 * DAY, students: CLASS_A },
    { name: "최근 반", savedAt: now - 2 * DAY, students: CLASS_B },
  ]);
  const notice = page.getByRole("status").filter({ hasText: "30일이 지난" });
  await expect(notice).toContainText("점수 1개");
  await expect(page.getByRole("button", { name: /오래된 반.*저장/ }).first()).toContainText("30일 지남");
  await expect(page.getByRole("button", { name: /오래된 반.*저장/ }).first()).toBeVisible();

  await notice.getByRole("button", { name: "나중에" }).click();
  await expect(notice).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: /최근 반.*저장/ }).first()).toBeVisible();
  await expect(notice).toHaveCount(0);
  const until = Number(await page.evaluate(() => localStorage.getItem("scoreshow-stale-snooze-until")));
  expect(Math.round((until - now) / DAY)).toBe(7);

  // 7일이 지나면 다시 묻습니다.
  await page.evaluate(() => localStorage.setItem("scoreshow-stale-snooze-until", "1"));
  await page.reload();
  await expect(notice).toBeVisible();
  await notice.getByRole("button", { name: "지우기" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "삭제" }).click();
  await expect(page.getByRole("button", { name: /오래된 반.*저장/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /최근 반.*저장/ }).first()).toBeVisible();
});

test("SL-16 30일이 안 되면 묻지 않음", async ({ page, origin }) => {
  await seedLists(page, origin, [{ name: "최근 반", savedAt: Date.now() - 29 * DAY, students: CLASS_A }]);
  await expect(page.getByRole("button", { name: /최근 반.*저장/ }).first()).toBeVisible();
  await expect(page.getByText("30일이 지난")).toHaveCount(0);
});

test("SL-17 1.1.2 자료를 옮기고 옛 자리를 비움", async ({ app, page }) => {
  await app.seed(mixedStudents());
  await expect(app.ui.rows).toHaveCount(40);
  const legacy = await page.evaluate(
    () =>
      new Promise((done) => {
        const open = indexedDB.open("keyval-store");
        open.onsuccess = () => {
          const request = open.result.transaction("keyval").objectStore("keyval").get("scoreshow-data");
          request.onsuccess = () => {
            open.result.close();
            done(request.result ?? null);
          };
        };
      })
  );
  expect(legacy).toBeNull();
  expect(await readStoredCipher(page)).toHaveLength(1);
});

test("SL-18 읽을 수 없는 목록은 지울 수 있고 다른 목록은 동작", async ({ app, page, origin }) => {
  await seedLists(page, origin, [{ name: "가상 1반", students: CLASS_A }]);
  await page.evaluate(
    () =>
      new Promise((done) => {
        const open = indexedDB.open("keyval-store");
        open.onsuccess = () => {
          const store = open.result.transaction("keyval", "readwrite").objectStore("keyval");
          const read = store.get("scoreshow-lists");
          read.onsuccess = () => {
            store.put([...read.result, { id: "broken", cipher: "손상된 값" }], "scoreshow-lists").onsuccess = () => {
              open.result.close();
              done();
            };
          };
        };
      })
  );
  await page.reload();
  await expect(page.getByText("읽을 수 없는 자료")).toBeVisible();
  await page.getByRole("button", { name: "읽을 수 없는 자료 삭제" }).click();
  await app.ui.confirmDelete.click();
  await expect(page.getByText("읽을 수 없는 자료")).toHaveCount(0);
  await page.getByRole("button", { name: /^가상 1반 .*저장/ }).click();
  await expect(app.ui.rows).toHaveCount(2);
});

test("SL-19 저장에 실패하면 열지 않고 알림", async ({ app, page }) => {
  await app.seed(null);
  await app.upload(xlsxFile(5));
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = () => {
      throw new Error("저장 공간 없음");
    };
  });
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("저장하지 못했습니다");
  await expect(app.ui.rows).toHaveCount(0);
});

test("SL-20 다른 화면이 연결되면 안내", async ({ app, page }) => {
  await page.addInitScript(() => {
    window.electronAPI = { getVersion: () => "9.9.9", getDisplayCount: async () => 2 };
  });
  await app.seed(mixedStudents());
  await expect(page.getByText("다른 화면이 연결되어 있습니다")).toBeVisible();
});

// ---- 대기 화면 ----

test("MS-01 대기 화면에는 이름이 없음", async ({ app, page }) => {
  await app.seed(mixedStudents());
  await expect(page.getByText("대기 중입니다")).toBeVisible();
  await expect(page.locator("main")).not.toContainText("김가상1");
  await expect(app.ui.showNumber(1)).toBeVisible();
  await expect(page.getByRole("button", { name: /점수 보기$/ })).toHaveCount(1);
});

test("MS-02 어느 쪽에서 와도 같은 사이면 같은 화면", async ({ app, page }) => {
  await app.seed(mixedStudents());
  await app.ui.row(10).click();
  await app.key("ArrowRight");
  await expect(page.getByRole("button", { name: /점수 보기$/ })).toHaveText(["10번 점수 보기", "11번 점수 보기"]);
  await app.key("ArrowRight");
  await expect(app.ui.presenterTitle).toHaveText("2학년 1반 11번");
  await app.key("ArrowLeft");
  await expect(page.getByRole("button", { name: /점수 보기$/ })).toHaveText(["10번 점수 보기", "11번 점수 보기"]);
  await app.key("ArrowRight");
  await expect(app.ui.presenterTitle).toHaveText("2학년 1반 11번");
  await app.key("ArrowLeft");
  await app.key("ArrowLeft");
  await expect(app.ui.presenterTitle).toHaveText("2학년 1반 10번");
});

test("MS-11 대기 중에는 모래시계 그림이 나옴", async ({ app, page }) => {
  await app.seed(mixedStudents());
  const art = page.locator('main img[src*="wait-hourglass"]');
  await expect(art).toBeVisible();
  await expect(art).toHaveCSS("width", "128px");
  expect(await art.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
});

test("MS-12 마지막 막대가 목록 안에서 온전히 보임", async ({ app, page }) => {
  await app.seed(mixedStudents());
  await app.ui.row(40).scrollIntoViewIfNeeded();
  await app.ui.row(40).click();
  await app.key("ArrowRight");
  await page.waitForTimeout(500);
  const inside = await app.ui.marker.evaluate((el) => {
    const bar = el.querySelector("div").getBoundingClientRect();
    const dot = el.querySelector("div:last-child").getBoundingClientRect();
    const list = el.closest(".overflow-y-auto").getBoundingClientRect();
    return bar.bottom <= list.bottom && dot.bottom <= list.bottom && dot.top >= list.top;
  });
  expect(inside).toBe(true);
});

test("MS-03 마지막 학생 뒤", async ({ app, page }) => {
  await app.seed([makeStudent(1, evals(1)), makeStudent(2, evals(1))]);
  await app.key("ArrowRight");
  await app.key("ArrowRight");
  await app.key("ArrowRight");
  await app.key("ArrowRight");
  await expect(page.getByText("모든 학생을 보여 주었습니다")).toBeVisible();
  // 다 끝났으니 기다리는 그림은 나오지 않습니다.
  await expect(page.locator('main img[src*="wait-hourglass"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /점수 보기$/ })).toHaveText(["2번 점수 보기"]);
  await app.key("ArrowLeft");
  await expect(app.ui.presenterTitle).toHaveText("2학년 1반 2번");
});

test("MS-04 Esc와 대기 화면에서 다시 Esc는 자리를 옮기지 않음", async ({ app, page }) => {
  await app.seed(mixedStudents());
  await app.ui.row(5).click();
  await app.key("ArrowLeft");
  await app.key("Escape");
  await expect(page.getByRole("button", { name: /점수 보기$/ })).toHaveText(["4번 점수 보기", "5번 점수 보기"]);
});

test("MS-05 건너뛰기는 없음", async ({ app, page }) => {
  await app.seed(mixedStudents());
  await expect(page.getByText("건너뛰기")).toHaveCount(0);
  await app.key("s");
  await expect(app.ui.showNumber(1)).toBeVisible();
  await expect(page.getByText("못 봄")).toHaveCount(0);
});

test("MS-10 한글 입력 상태에서도 F가 동작", async ({ app, page }) => {
  await app.seed(mixedStudents());
  // 전체화면은 사용자 동작 직후에만 켜지므로 먼저 화면을 누릅니다.
  await page.mouse.click(900, 700);
  await page.evaluate(() =>
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ㄹ", code: "KeyF", bubbles: true }))
  );
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
});

test("MS-07 사용 가이드는 본문 16px, 진한 색", async ({ app, page }) => {
  await app.seed(null);
  await app.ui.guide.click();
  const dialog = page.getByRole("dialog", { name: "스코어쇼 사용 가이드" });
  for (const body of [
    dialog.getByText("조회를 누른 뒤 저장 아이콘을"),
    dialog.getByText("점수 파일을 넣고 학생에게"),
    dialog.getByText("pobydev@gmail.com"),
    dialog.getByText("전체화면"),
  ]) {
    await expect(body).toHaveCSS("font-size", "16px");
    await expect(body).toHaveCSS("color", "rgb(30, 42, 74)");
  }
  await expect(dialog.getByRole("heading", { name: /^나이스에서/ })).toHaveCSS("font-size", "18px");
  expect((await dialog.boundingBox()).width).toBe(760);
});

test("MS-13 사용 가이드 창은 어울림과 같은 짜임새", async ({ app, page }) => {
  await app.seed(mixedStudents());
  await app.ui.guide.click();
  const dialog = page.getByRole("dialog", { name: "스코어쇼 사용 가이드" });
  // 메뉴와 창 제목이 같습니다.
  await expect(dialog.getByRole("heading", { level: 2 })).toHaveText("스코어쇼 사용 가이드");
  for (const number of ["01", "02", "03", "04", "05"]) {
    await expect(dialog.getByText(number, { exact: true })).toBeVisible();
  }
  await expect(dialog.locator("kbd")).toHaveText(["←", "→", "F", "Esc"]);
  // 버전과 made by는 맨 아래입니다.
  await expect(dialog.locator("[data-made-by]")).toBeVisible();
  await dialog.getByRole("button", { name: "확인", exact: true }).click();
  await expect(dialog).toHaveCount(0);
});
