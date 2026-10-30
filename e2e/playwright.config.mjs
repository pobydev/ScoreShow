/**
 * 빌드 결과(dist)를 실제 Chrome으로 여는 동작 시험 설정입니다.
 * 앱 의존성에 넣지 않으려고 Playwright는 저장소 밖에 설치합니다 (capture.mjs와 같은 방식).
 *
 * 사용:
 *   pnpm build
 *   PW_DIR=<@playwright/test를 설치한 폴더> \
 *     node $PW_DIR/node_modules/@playwright/test/cli.js test -c e2e/playwright.config.mjs
 * 다른 빌드를 시험하려면 E2E_DIST에 그 폴더를 줍니다. 결과 JSON 위치는 E2E_JSON입니다.
 */

import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const { defineConfig } = createRequire(join(resolve(process.env.PW_DIR), "x.js"))("@playwright/test");
const OUT = process.env.E2E_OUT || join(tmpdir(), "scoreshow-e2e-out");

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.mjs",
  outputDir: OUT,
  fullyParallel: true,
  workers: 6,
  timeout: 30_000,
  expect: { timeout: 6_000 },
  reporter: [["list"], ["json", { outputFile: process.env.E2E_JSON || join(OUT, "results.json") }]],
  use: {
    channel: "chrome",
    headless: true,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    serviceWorkers: "block",
    launchOptions: { args: ["--disable-lcd-text", "--disable-gpu", "--force-color-profile=srgb"] },
  },
});
