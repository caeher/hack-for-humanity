import tseslint from 'typescript-eslint'
import convexPlugin from '@convex-dev/eslint-plugin'

export default tseslint.config(
  ...tseslint.configs.recommended,
  ...convexPlugin.configs.recommended,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'convex/_generated/**',
      'dist/**',
    ],
  },
  {
    files: ['convex/**/*.ts'],
    rules: {
      // This repo uses Convex's Id-first db.get/patch/delete API. The table-first
      // form is a newer lint suggestion and is out of scope for environment setup.
      '@convex-dev/explicit-table-ids': 'off',
      '@convex-dev/no-filter-in-query': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  }
)
