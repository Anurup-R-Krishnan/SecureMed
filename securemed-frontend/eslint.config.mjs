import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

// Mirror the previous .eslintrc.json (next/core-web-vitals) exactly, but
// under ESLint 9's flat config format.
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "node_modules/**",
      "public/**",
      "next-env.d.ts",
      "*.config.*",
      "jest.setup.js",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
];

export default eslintConfig;
