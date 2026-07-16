import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        dna: {
          bg: "#050505",
          shell: "#0c0c0c",
          surface: "#121212",
          card: "#161616",
          "card-hover": "#1c1c1c",
          border: "#252525",
          muted: "#737373",
          accent: "#00e676",
          "accent-dim": "#00c853",
          "accent-glow": "#00e67633",
          green: "#00e676",
          red: "#ff5252",
          orange: "#ff9800",
          blue: "#40c4ff",
        },
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        glow: "0 0 40px rgba(0, 230, 118, 0.08)",
        card: "0 4px 24px rgba(0, 0, 0, 0.4)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
