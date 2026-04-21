module.exports = {
  root: true,
  ignorePatterns: ["**/dist/**", "**/node_modules/**", "**/coverage/**"],
  overrides: [
    {
      files: ["client/src/**/*.{ts,tsx}", "client/vite.config.ts", "client/vitest.config.ts"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      env: {
        browser: true,
        es2023: true,
        serviceworker: true,
      },
      plugins: ["@typescript-eslint", "react-hooks", "react-refresh"],
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:react-hooks/recommended",
      ],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
          },
        ],
        "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      },
    },
    {
      files: ["server/src/**/*.ts", "server/vitest.config.ts"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      env: {
        node: true,
        es2022: true,
      },
      plugins: ["@typescript-eslint"],
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
          },
        ],
      },
    },
    {
      files: ["**/*.test.{ts,tsx}", "**/test/**/*.ts"],
      env: {
        node: true,
      },
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
  ],
};
