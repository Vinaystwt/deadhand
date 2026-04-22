import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0B",
        "surface-1": "#111113",
        "surface-2": "#18181C",
        "surface-3": "#222228",
        "border-subtle": "#2A2A32",
        "border-medium": "#3A3A46",
        amber: {
          DEFAULT: "#D4A843",
          dim: "#A07830",
          bright: "#E8C060",
        },
        steel: {
          DEFAULT: "#6B7FA3",
          dim: "#4A5873",
          bright: "#8CA5C4",
        },
        danger: {
          DEFAULT: "#C0392B",
          dim: "#8B2520",
          bright: "#E74C3C",
        },
        success: {
          DEFAULT: "#27AE60",
          dim: "#1E7D45",
          bright: "#2ECC71",
        },
        "text-primary": "#F0F0F2",
        "text-secondary": "#9898A5",
        "text-tertiary": "#5A5A6A",
      },
      fontFamily: {
        display: ["Barlow Semi Condensed", "sans-serif"],
        sans: ["Epilogue", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        card: "8px",
        btn: "6px",
        badge: "4px",
      },
      boxShadow: {
        "amber-glow": "0 0 24px rgba(212, 168, 67, 0.15)",
        "danger-glow": "0 0 24px rgba(192, 57, 43, 0.2)",
        "steel-glow": "0 0 20px rgba(107, 127, 163, 0.12)",
        card: "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)",
        elevated: "0 4px 16px rgba(0,0,0,0.5)",
      },
      keyframes: {
        pulse_amber: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        pulse_danger: {
          "0%, 100%": { boxShadow: "0 0 0px rgba(192,57,43,0)" },
          "50%": { boxShadow: "0 0 20px rgba(192,57,43,0.25)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        pulse_amber: "pulse_amber 2s ease-in-out infinite",
        pulse_danger: "pulse_danger 1.5s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        float: "float 4s ease-in-out infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "amber-subtle":
          "linear-gradient(135deg, rgba(212,168,67,0.06) 0%, transparent 50%)",
        "danger-subtle":
          "linear-gradient(135deg, rgba(192,57,43,0.08) 0%, transparent 50%)",
      },
    },
  },
  plugins: [],
};

export default config;
