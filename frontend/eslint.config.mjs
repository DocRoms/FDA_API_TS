import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

const tsconfigRootDir = process.cwd();

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    ...js.configs.recommended,
    files: ['src/**/*.{ts,tsx,vue}', 'tests/**/*.{ts,tsx,vue}'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        project: './tsconfig.json',
        tsconfigRootDir,
        ecmaVersion: 2022,
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
    plugins: {
      vue,
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...vue.configs['vue3-recommended'].rules,
      // Règles TS de base; on ne peut plus étendre directement les presets `typescript-eslint` ici,
      // mais on peut activer quelques règles clés explicitement.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['tests/**/*.{test,spec}.{ts,tsx}'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
  },
];
