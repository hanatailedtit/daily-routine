module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        control: "#6b7684",
        "error-border": "#f04452",
        input: "var(--border)",
        ring: "var(--primary)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: { DEFAULT: "var(--primary)", foreground: "#fff" },
        secondary: {
          DEFAULT: "var(--background)",
          foreground: "var(--foreground)",
        },
        muted: { DEFAULT: "#f9fafb", foreground: "var(--muted-foreground)" },
        accent: { DEFAULT: "var(--accent)", foreground: "var(--primary)" },
        destructive: { DEFAULT: "#c7293b", foreground: "#fff" },
        popover: { DEFAULT: "#fff", foreground: "var(--foreground)" },
        card: { DEFAULT: "#fff", foreground: "var(--foreground)" },
        completion: "#3182f6",
      },
      borderRadius: { lg: "24px", md: "14px", sm: "8px" },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "Apple SD Gothic Neo",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
}
