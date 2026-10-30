/**
 * 디자인을 바꾼 뒤 내용과 동작이 그대로인지 봅니다. capture.mjs의 두 결과 폴더를 비교합니다.
 * class와 style은 지우고 글자, 구조, 입력값, 포커스, 전체화면, 콘솔, 대화상자를 비교합니다.
 * 행 높이가 달라져 스크롤 위치는 비교하지 않습니다.
 *
 * 의도한 차이만 아래 INTENDED로 지웁니다.
 *
 * 사용: node docs/refactor/shots/compare-content.mjs <전 폴더> <후 폴더>
 */

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const [beforeDir, afterDir] = process.argv.slice(2).map((p) => resolve(p));

const INTENDED = [
  // 헤더: 옛 글자 로고 그림을 새 아이콘과 앱 이름으로 바꿨습니다.
  [/<header>.*?<\/> <div><div><div><label>/s, "<header/><div><div><div><label>"],
  // 발표 시작 버튼의 빛 효과(그라데이션) 칸을 지웠습니다.
  [/<span><\/> <svg/g, "<svg"],
];

const load = (dir) => JSON.parse(readFileSync(join(dir, "trace.json"), "utf8"));

const normalize = (dom) => {
  const text = dom
    .replace(/ class="[^"]*"/g, "")
    .replace(/ style="[^"]*"/g, "")
    .replace(/ :hover/g, "")
    .replace(/\s+/g, " ")
    .replace(/ >/g, ">");
  return INTENDED.reduce((out, [pattern, to]) => out.replace(pattern, to), text);
};

const before = load(beforeDir);
const after = load(afterDir);
let failures = 0;
if (before.length !== after.length) {
  failures++;
  console.log("단계 수가 다릅니다", before.length, after.length);
}

for (let i = 0; i < Math.min(before.length, after.length); i++) {
  const b = before[i];
  const a = after[i];
  const problems = [];
  const bDom = normalize(b.dom);
  const aDom = normalize(a.dom);
  if (bDom !== aDom) {
    let at = 0;
    while (bDom[at] === aDom[at]) at++;
    problems.push(`내용\n  전: ${bDom.slice(Math.max(0, at - 60), at + 120)}\n  후: ${aDom.slice(Math.max(0, at - 60), at + 120)}`);
  }
  for (const field of ["name", "active", "fullscreen", "width"]) {
    if (a[field] !== b[field]) problems.push(`${field}: ${b[field]} → ${a[field]}`);
  }
  for (const field of ["console", "dialogs"]) {
    if (JSON.stringify(a[field]) !== JSON.stringify(b[field])) {
      problems.push(`${field}: ${JSON.stringify(b[field])} → ${JSON.stringify(a[field])}`);
    }
  }
  if (problems.length) {
    failures++;
    console.log(`단계 ${b.name}: ${problems.join(" / ")}`);
  }
}

console.log(`${before.length - failures}/${before.length} 단계의 내용과 동작이 같습니다`);
process.exit(failures ? 1 : 0);
