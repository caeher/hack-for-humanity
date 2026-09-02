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
  }
)
