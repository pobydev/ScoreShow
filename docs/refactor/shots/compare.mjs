/**
 * capture.mjs의 두 결과 폴더를 비교합니다.
 * PNG는 바이트가 같은지(다르면 픽셀을 비교), trace.json은 단계별 DOM, 포커스, 스크롤, 전체화면, 콘솔, 대화상자가 같은지 봅니다.
 * 의도한 DOM 차이는 아래 ALLOWED에 적힌 것만 지우고 비교합니다.
 *
 * 같은 빌드를 여러 번 찍어도 글자 일부에서 색 채널이 1 차이 나는 렌더러 잡음이 드물게 나옵니다.
 * 그래서 채널 차이 1 이하는 잡음으로 따로 세고, 그보다 크면 실패로 봅니다.
 *
 * 사용: node docs/refactor/shots/compare.mjs <전 폴더> <후 폴더>
 * 필요: 저장소 밖에 설치한 pngjs (PW_DIR 환경 변수에 그 폴더 경로)
 */

import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const { PNG } = createRequire(join(resolve(process.env.PW_DIR), "x.js"))("pngjs");

const NOISE_DELTA = 1;

function pixelDifference(fileA, fileB) {
  const a = PNG.sync.read(fileA);
  const b = PNG.sync.read(fileB);
  if (a.width !== b.width || a.height !== b.height) return { pixels: Infinity, delta: Infinity };
  let pixels = 0;
  let delta = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.max(
      Math.abs(a.data[i] - b.data[i]),
      Math.abs(a.data[i + 1] - b.data[i + 1]),
      Math.abs(a.data[i + 2] - b.data[i + 2])
    );
    if (d > 0) pixels++;
    delta = Math.max(delta, d);
  }
  return { pixels, delta };
}

const [beforeDir, afterDir] = process.argv.slice(2).map((p) => resolve(p));

// 폼 밖의 버튼에 type="button"을 붙이고, 글자와 같은 aria-label을 붙인 것뿐이라 동작과 모양이 같습니다.
const ALLOWED = [
  [/(<button [^>]*?)type="button" ?/g, "$1"],
  [/(<button [^>]*?)aria-label="발표 모드 시작" ?/g, "$1"],
];

const clean = (dom) => ALLOWED.reduce((text, [pattern, to]) => text.replace(pattern, to), dom).replace(/ >/g, ">");

const pngs = (dir) => readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
const beforePngs = pngs(beforeDir);
const afterPngs = pngs(afterDir);
let failures = 0;

if (beforePngs.join() !== afterPngs.join()) {
  failures++;
  console.log("PNG 목록이 다릅니다", beforePngs.length, afterPngs.length);
}
let samePng = 0;
let noisePng = 0;
for (const file of beforePngs) {
  if (!afterPngs.includes(file)) continue;
  const before = readFileSync(join(beforeDir, file));
  const after = readFileSync(join(afterDir, file));
  if (before.equals(after)) {
    samePng++;
    continue;
  }
  const { pixels, delta } = pixelDifference(before, after);
  if (delta <= NOISE_DELTA) {
    noisePng++;
    console.log(`PNG 잡음: ${file} (${pixels}픽셀, 채널 차이 ${delta})`);
  } else {
    failures++;
    console.log(`PNG 다름: ${file} (${pixels}픽셀, 채널 차이 ${delta})`);
  }
}

const beforeTrace = JSON.parse(readFileSync(join(beforeDir, "trace.json"), "utf8"));
const afterTrace = JSON.parse(readFileSync(join(afterDir, "trace.json"), "utf8"));
if (beforeTrace.length !== afterTrace.length) {
  failures++;
  console.log("단계 수가 다릅니다", beforeTrace.length, afterTrace.length);
}

let sameSteps = 0;
let exactDom = 0;
for (let i = 0; i < Math.min(beforeTrace.length, afterTrace.length); i++) {
  const b = beforeTrace[i];
  const a = afterTrace[i];
  const problems = [];
  if (a.dom === b.dom) exactDom++;
  if (clean(a.dom) !== clean(b.dom)) {
    const bl = clean(b.dom).split("\n");
    const al = clean(a.dom).split("\n");
    const at = bl.findIndex((line, n) => line !== al[n]);
    problems.push(`dom 줄 ${at}\n  전: ${(bl[at] || "").slice(0, 300)}\n  후: ${(al[at] || "").slice(0, 300)}`);
  }
  for (const field of ["name", "active", "fullscreen", "width"]) {
    if (a[field] !== b[field]) problems.push(`${field}: ${b[field]} → ${a[field]}`);
  }
  for (const field of ["scrolls", "console", "dialogs"]) {
    if (JSON.stringify(a[field]) !== JSON.stringify(b[field])) {
      problems.push(`${field}: ${JSON.stringify(b[field])} → ${JSON.stringify(a[field])}`);
    }
  }
  if (problems.length) {
    failures++;
    console.log(`단계 ${b.name}:\n  ${problems.join("\n  ")}`);
  } else sameSteps++;
}

console.log(`PNG ${samePng}/${beforePngs.length} 바이트 동일, 잡음 ${noisePng}`);
console.log(`단계 ${sameSteps}/${beforeTrace.length} 동일 (허용 목록 없이 DOM까지 완전히 같은 단계 ${exactDom})`);
console.log(failures ? `차이 ${failures}건` : "차이 없음");
process.exit(failures ? 1 : 0);
