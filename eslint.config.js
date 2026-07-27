import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: (await import('@typescript-eslint/parser')).default,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  {
    ignores: ['**/dist/', '**/node_modules/', '**/*.js', '**/*.mjs', '**/*.cjs'],
  },
];
