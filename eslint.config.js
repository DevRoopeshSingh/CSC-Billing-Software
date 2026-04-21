// eslint.config.js
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");

module.exports = [
  {
    ignores: [
      ".next/**",
      "dist-electron/**",
      "dist_electron/**",
      "node_modules/**",
      "public/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        process: "readonly",
        navigator: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        URLSearchParams: "readonly",
        confirm: "readonly",
        alert: "readonly",
        HTMLInputElement: "readonly",
        HTMLSelectElement: "readonly",
        React: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        module: "readonly",
        require: "readonly",
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
