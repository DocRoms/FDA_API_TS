import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

const tsconfigRootDir = process.cwd();

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    ...js.configs.recommended,
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir,
        sourceType: 'module',
      },
      ecmaVersion: 2022,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Quelques règles TS de base en attendant une éventuelle config plus poussée
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
];
