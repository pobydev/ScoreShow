/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    // gnilab 공통 디자인(DESIGN.md)의 값만 쓰도록 기본 색, 모서리, 그림자를 바꿔 끼웁니다.
    // 실제 값은 src/index.css의 CSS 변수에 있습니다.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "var(--card)", // 채운 버튼의 흰 글자
      canvas: "var(--canvas)",
      card: "var(--card)",
      "surface-hover": "var(--surface-hover)",
      ink: "var(--ink)",
      soft: "var(--soft)",
      faint: "var(--faint)",
      line: "var(--line)",
      hairline: "var(--hairline)",
      control: "var(--control)",
      brand: "var(--brand)",
      accent: {
        DEFAULT: "var(--accent)",
        hover: "var(--accent-hover)",
        ink: "var(--accent-ink)",
      },
      tint: "var(--tint)",
      wash: "var(--wash)",
      ring: "var(--ring)",
      board: "var(--board)",
      celebrate: "var(--celebrate)",
      danger: { DEFAULT: "var(--danger)", wash: "var(--danger-wash)" },
      overlay: "var(--overlay)",
    },
    fontFamily: {
      sans: ["Pretendard", '"Malgun Gothic"', "sans-serif"],
    },
    borderRadius: {
      none: "0",
      input: "8px",
      button: "10px",
      card: "12px",
      window: "14px",
      full: "9999px",
    },
    boxShadow: {
      none: "none",
      card: "var(--shadow-card)",
      lift: "var(--shadow-lift)",
      float: "var(--shadow-float)",
    },
    extend: {
      borderColor: {
        DEFAULT: "var(--line)",
      },
      ringColor: {
        DEFAULT: "var(--ring)",
      },
      // 화면 글자 8단계. 기본 크기(text-xl 등)는 발표 화면에서만 씁니다.
      fontSize: {
        micro: ["11px", "16px"],
        caption: ["12px", "18px"],
        small: ["13px", "20px"],
        body: ["14px", "22px"],
        emph: ["16px", "24px"],
        "title-sm": ["18px", "26px"],
        title: ["24px", "32px"],
        display: ["32px", "40px"],
      },
    },
  },
  plugins: [],
};
