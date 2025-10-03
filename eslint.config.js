// @ts-check
import antfu from '@antfu/eslint-config';

export default antfu(
  {
    type: 'app',
    typescript: true,
    vue: true,
    formatters: true,
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: true,
    },
    ignores: [
      '.nuxt',
      '.nuxt/**',
      'node_modules',
      'node_modules/**',
      '.output',
      '.output/**',
      'dist',
      'dist/**',
      '.env',
      '.gitignore',
      'service-account.json',
      'nuxt.config.ts',
      '**/*.md',
    ],
  },
  {
    rules: {
      'no-console': 'off',
      'style/comma-dangle': ['error', 'always-multiline'],
      'style/brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'ts/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'vue/no-multiple-template-root': 'warn',
      'node/prefer-global/process': 'off',
      'antfu/top-level-function': 'off',
      // Disable rules that were in old config but don't exist in new setup
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
);
