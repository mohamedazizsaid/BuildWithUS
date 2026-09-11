import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Convex generated files contain eslint-disable directives we can't control
    "convex/_generated/**",
  ]),
  {
    rules: {
      // Navbar.tsx intentionally uses plain <a href="/"> for full-page reload
      // so marketing CSS never leaks into the dashboard session (see comment in Navbar.tsx).
      "@next/next/no-html-link-for-pages": "warn",

      // setState in useEffect is used for initializing state from props/context
      // (SettingsDialog section sync, Sidebar deep-link, pricing/checkout plan init).
      // These are intentional patterns, not accidental cascades.
      "react-hooks/set-state-in-effect": "warn",

      // super-admin dashboard and lib/api.ts use `any` for dynamic API responses.
      // Downgrading to warn globally for the frontend (consistent with backend services).
      "@typescript-eslint/no-explicit-any": "warn",

      // prefer-const is fixable but some builders use let for later mutation.
      "prefer-const": "warn",
    },
  },
]);

export default eslintConfig;
