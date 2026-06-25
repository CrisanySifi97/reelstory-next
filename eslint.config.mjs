import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

// eslint-config-next currently crashes on ESLint 9 (circular JSON in its
// bundled eslint-plugin-react config) — using typescript-eslint's recommended
// rules + react-hooks directly instead until that's fixed upstream.
export default tseslint.config(
  {
    ignores: ['.next/**', 'node_modules/**', 'reels/**'],
  },
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // These three are part of React's newer Compiler-readiness rules and flag a lot of
      // working, correct code in this project as errors (setState-in-effect for normal data
      // fetching, closures over later-declared consts, window.location.href assignment,
      // and inline component definitions in render) — too noisy/experimental for now.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/static-components': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true }],
    },
  },
)
