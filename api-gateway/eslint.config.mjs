import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '*.config.mjs', '*.config.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2022,
      },
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      // Reasonable NestJS-friendly defaults
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'preserve-caught-error': 'warn',
      // Stripe and mjml ship as CommonJS (export =) — `import X = require('X')` is the
      // correct TypeScript interop under our commonjs/non-esModuleInterop tsconfig.
      // Downgrading to warn so the intent is visible but the build doesn't break.
      '@typescript-eslint/no-require-imports': 'warn',
      // Pattern: let x = null; try { x = await ... } — valid try/catch flow.
      'no-useless-assignment': 'warn',
    },
  },
];