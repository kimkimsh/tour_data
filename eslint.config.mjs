import coreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/*
  eslint-config-next 16 ships native flat configs, so FlatCompat is not used.
  Routing these through FlatCompat crashes with "Converting circular structure to
  JSON": the eslintrc validator tries to serialise the react plugin, which
  references itself.

  These three blocks enforce the structural rules from docs/spec/02_stack.md
  section 2. `paths` and `patterns` both appear on purpose — a glob pattern does
  not match a bare specifier, so 'next' needs an exact path entry while 'next/*'
  needs a pattern.
*/
const DOMAIN_RESTRICTED = {
  paths: [
    { name: 'next', message: 'src/domain is the pure-function layer and must not import a framework.' },
    { name: 'react', message: 'src/domain is the pure-function layer and must not import a framework.' },
    { name: 'react-dom', message: 'src/domain is the pure-function layer and must not import a framework.' },
  ],
  patterns: [
    'next/*',
    'react/*',
    'react-dom/*',
    '@supabase/*',
    '@/lib/*',
    '@/app/*',
    '@/components/*',
  ],
};

const eslintConfig = [
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // docs/spec/08_accessibility_legal.md section 1.3 promotes these eight to error.
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/media-has-caption': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', DOMAIN_RESTRICTED] },
  },
  {
    files: ['src/domain/__tests__/**/*.ts'],
    // Tests run under Vitest and legitimately import test tooling.
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['src/app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@/lib/kto', '@/lib/kto/*'],
            message: 'Screens never call the KTO client. Only scripts/ingest.ts does (principle 3).',
          },
          {
            group: ['@/lib/supabase/admin'],
            message: 'The service-role client is for scripts/ only. It must never reach a bundle.',
          },
        ],
      }],
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', '.remember/**', 'content/generated/**', 'docs/**', 'public/**'],
  },
];

export default eslintConfig;
