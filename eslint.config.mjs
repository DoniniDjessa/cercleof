import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disable exhaustive-deps warnings for useEffect
      "react-hooks/exhaustive-deps": "off",
      // Disable no-empty-object-type warnings
      "@typescript-eslint/no-empty-object-type": "off",
      // Disable prefer-const warnings
      "prefer-const": "off",
      // Disable unused vars warnings
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      // Allow apostrophes in text (French text often uses them)
      "react/no-unescaped-entities": ["error", {
        "forbid": [">", "}"]
      }],
      // Allow any type but warn
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow img tags but warn (use Image when possible)
      "@next/next/no-img-element": "warn",
    },
  },
];

export default eslintConfig;
