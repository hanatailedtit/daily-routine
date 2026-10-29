module.exports = {
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "plugin:storybook/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["react-refresh", "prettier"],
  overrides: [
    {
      files: ["src/components/ui/*.tsx"],
      rules: { "react-refresh/only-export-components": "off" },
    },
  ],
  rules: {
    "prettier/prettier": [
      "error",
      { endOfLine: "auto", printWidth: 80, semi: false },
    ],
    "react-refresh/only-export-components": "warn",
    quotes: ["error", "double"],
    semi: ["error", "never"],
  },
}
