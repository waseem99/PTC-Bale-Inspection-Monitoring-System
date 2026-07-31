import tseslint from 'typescript-eslint';

const recommended = tseslint.configs.recommended.map((config) => ({
  ...config,
  files: ['src/**/*.ts'],
}));

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  ...recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
