/**
 * 지금 화면과 새 화면의 시험 결과(JSON)를 기능 목록 ID별 통과표로 만듭니다.
 * 기능 목록에 있는데 시험이 없는 ID가 있으면 실패로 끝납니다.
 *
 * 사용: node e2e/results-table.mjs <지금 화면 JSON> <새 화면 JSON> <결과 md>
 */

import { readFileSync, writeFileSync } from "node:fs";

const [baselinePath, currentPath, outPath] = process.argv.slice(2);

function readResults(path) {
  const results = new Map();
  const visit = (suite) => {
    for (const spec of suite.specs ?? []) {
      const [id] = spec.title.split(" ");
      const entry = results.get(id) ?? { title: spec.title.slice(id.length + 1), passed: 0, total: 0 };
      entry.total += 1;
      if (spec.ok) entry.passed += 1;
      results.set(id, entry);
    }
    (suite.suites ?? []).forEach(visit);
  };
  JSON.parse(readFileSync(path, "utf8")).suites.forEach(visit);
  return results;
}

const baseline = readResults(baselinePath);
const current = readResults(currentPath);

const inventory = readFileSync(new URL("../docs/refactor/06-feature-inventory.md", import.meta.url), "utf8");
const listed = [...inventory.matchAll(/^\| ([A-Z]{2}-\d{2}) \| ([^|]+) \|/gm)].map((m) => ({ id: m[1], name: m[2].trim() }));

const missing = listed.filter(({ id }) => !current.has(id)).map(({ id }) => id);
const unlisted = [...current.keys()].filter((id) => !listed.some((item) => item.id === id));

const cell = (entry) => {
  if (!entry) return "시험 없음";
  const count = entry.total > 1 ? ` ${entry.passed}/${entry.total}` : "";
  return `${entry.passed === entry.total ? "통과" : "실패"}${count}`;
};

const rows = listed.map(({ id, name }) => `| ${id} | ${name} | ${cell(baseline.get(id))} | ${cell(current.get(id))} |`);
const passedIds = listed.filter(({ id }) => {
  const entry = current.get(id);
  return entry && entry.passed === entry.total;
}).length;

const sum = (results, prefix) => {
  let passed = 0;
  let total = 0;
  for (const [id, entry] of results) {
    if (id.startsWith("RB-") === prefix) {
      passed += entry.passed;
      total += entry.total;
    }
  }
  return `${passed}/${total}`;
};

writeFileSync(
  outPath,
  [
    "# 과제 D 기능 목록 통과표",
    "",
    "`e2e/results-table.mjs`로 만든 표입니다. 고쳐 쓰지 않고 다시 생성합니다.",
    "",
    `- 기능 목록 ${listed.length}개 ID 중 새 화면 통과 ${passedIds}개, 시험 없는 ID ${missing.length}개`,
    `- 기능 시험(같은 파일): 지금 화면 ${sum(baseline, false)}, 새 화면 ${sum(current, false)}`,
    `- 새 화면 요구 시험(\`RB-\`): 지금 화면 ${sum(baseline, true)}, 새 화면 ${sum(current, true)}. 지금 화면의 실패는 정상입니다`,
    "",
    "| ID | 기능 | 지금 화면 | 새 화면 |",
    "|----|------|----------|--------|",
    ...rows,
    "",
  ].join("\n")
);

console.log(`${listed.length} ids, ${passedIds} passed, missing: ${missing.join(",") || "none"}, unlisted: ${unlisted.join(",") || "none"}`);
if (missing.length) process.exit(1);
