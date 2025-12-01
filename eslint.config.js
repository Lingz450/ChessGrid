export default [
  {
    files: ['**/*.js'],
    ignores: ['node_modules/**', 'public/**', 'data/**', 'coverage/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
      },
    },
    rules: {
      // Keep rules minimal for now; can be tightened later.
    },
  },
];
