import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// vite.config.ts의 PWA 플러그인을 끌어오지 않도록 시험 설정을 분리합니다.
export default defineConfig({
  resolve: {
    alias: {
      // Node는 xlsx.js(코드페이지 표 포함)를 고르지만 앱 번들은 xlsx.mjs를 씁니다.
      // CSV와 xls 해석이 앱과 같도록 시험도 xlsx.mjs로 고정합니다.
      xlsx: fileURLToPath(new URL("./node_modules/xlsx/xlsx.mjs", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
