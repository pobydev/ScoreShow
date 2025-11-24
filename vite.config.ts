import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import type { Plugin } from "vite";

// CSP를 프로덕션 빌드에서 엄격하게 설정하는 플러그인
function cspPlugin(): Plugin {
  return {
    name: "csp-plugin",
    transformIndexHtml(html, ctx) {
      // 프로덕션 빌드에서만 CSP를 엄격하게 변경
      if (ctx.bundle && !ctx.server) {
        return html.replace(
          /connect-src 'self' ws:\/\/localhost:\* http:\/\/localhost:\* https:\/\/raw\.githubusercontent\.com;/,
          "connect-src 'self' https://raw.githubusercontent.com;"
        ).replace(
          /script-src 'self' 'unsafe-inline' 'unsafe-eval';/,
          "script-src 'self' 'unsafe-inline';"
        );
      }
      return html;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cspPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
      manifest: {
        name: "ScoreShow",
        short_name: "ScoreShow",
        description: "교사용 점수 발표 도구",
        theme_color: "#ffffff",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  worker: {
    format: "es",
  },
  base: "./", // Electron에서 상대 경로로 리소스 로드
});
