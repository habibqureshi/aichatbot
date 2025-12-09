import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ["class"],
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        custom930: "930px",
      },
      fontFamily: {
        sans: ["var(--font-figtree)", "Figtree", "sans-serif"],
        inter: ["var(--font-inter)", "sans-serif"],
        figtree: ["var(--font-figtree)", "Figtree", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "brand-white": "#FFFFFF",
        "brand-purple": "#6325A9",
        "brand-blue": "#4C2B97",
        "brand-dark": "#23272E",
        "brand-light": "#64748B",
        "brand-light2": "#F6F7F9",
        "brand-gray": "#2A2A2A",
        "brand-card": "#7D2ADD",
        "brand-button": "#384152",
        "topbar": "#ECEEF2",
     
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "wave-fill": "waveFill 8.5s ease-in-out infinite",
        "spin-slow": "spin 25s linear infinite",
        "spin-slower": "spin 35s linear infinite",
        "spin-reverse": "spin-reverse 30s linear infinite",
        "mic-scale": "micScale 1.5s ease-in-out infinite",
      },
      keyframes: {
        waveFill: {
          "0%, 20%": { backgroundColor: "#ffffff", opacity: "0.4" },
          "50%": { backgroundColor: "#4318FF", opacity: "1" },
          "80%, 100%": { backgroundColor: "#ffffff", opacity: "0.4" },
        },
        "spin-reverse": {
          "0%": {
            transform: "rotate(360deg)",
          },
          "100%": {
            transform: "rotate(0deg)",
          },
        },
        micScale: {
          "0%, 100%": {
            transform: "scale(1)",
          },
          "50%": {
            transform: "scale(1.15)",
          },
        },
      },
    },
  },
  plugins: [animate],
};

export default config;
