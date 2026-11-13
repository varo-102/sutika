import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sutika: {
          bg: "#0D1117",
          card: "#161B22",
          cardHover: "#21262D",
          border: "#30363D",
          purple: {
            DEFAULT: "#6C5CE7",
            hover: "#8375EB",
            light: "rgba(108, 92, 231, 0.15)",
          },
          gold: {
            DEFAULT: "#FFC700",
            hover: "#FFD433",
            light: "rgba(255, 199, 0, 0.15)",
          },
          muted: "#8B949E",
          text: "#F0F6FC",
        },
      },
    },
  },
  plugins: [],
};
export default config;
