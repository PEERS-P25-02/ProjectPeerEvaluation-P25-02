import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier/flat';

const javascriptFiles = ['**/*.{js,jsx,mjs,cjs}'];
const frontendFiles = ['src/index.jsx', 'src/frontend/**/*.{js,jsx,mjs,cjs}'];

const config = [
  {
    name: 'peers/ignores',
    ignores: [
      '**/node_modules/**',
      '**/build/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.*',
    ],
  },
  {
    name: 'peers/javascript',
    files: javascriptFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    linterOptions: { reportUnusedDisableDirectives: 'warn' },
    plugins: { import: importPlugin },
    settings: {
      'import/extensions': ['.js', '.jsx', '.mjs', '.cjs'],
      // Resolve JSX and package exports, including Vite's ESM-only entry points.
      'import/resolver': {
        typescript: {
          alwaysTryTypes: false,
          extensions: ['.mjs', '.js', '.jsx', '.json', '.node'],
          conditionNames: ['import', 'require', 'node', 'default'],
        },
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...importPlugin.flatConfigs.recommended.rules,
      // Keep useful inherited checks outside the recommended presets.
      'array-callback-return': 'warn',
      'default-case': [
        'warn',
        {
          commentPattern: '^no default$',
        },
      ],
      eqeqeq: ['warn', 'smart'],
      'no-array-constructor': 'warn',
      'no-caller': 'warn',
      'no-eval': 'warn',
      'no-extend-native': 'warn',
      'no-extra-bind': 'warn',
      'no-extra-label': 'warn',
      'no-implied-eval': 'warn',
      'no-iterator': 'warn',
      'no-label-var': 'warn',
      'no-labels': [
        'warn',
        {
          allowLoop: true,
          allowSwitch: false,
        },
      ],
      'no-lone-blocks': 'warn',
      'no-loop-func': 'warn',
      'no-multi-str': 'warn',
      'no-new-func': 'warn',
      'no-new-wrappers': 'warn',
      'no-octal-escape': 'warn',
      'no-restricted-syntax': ['warn', 'WithStatement'],
      'no-script-url': 'warn',
      'no-self-compare': 'warn',
      'no-sequences': 'warn',
      'no-template-curly-in-string': 'warn',
      'no-throw-literal': 'warn',
      'no-restricted-globals': [
        'error',
        'addEventListener',
        'blur',
        'close',
        'closed',
        'confirm',
        'defaultStatus',
        'defaultstatus',
        'event',
        'external',
        'find',
        'focus',
        'frameElement',
        'frames',
        'history',
        'innerHeight',
        'innerWidth',
        'length',
        'location',
        'locationbar',
        'menubar',
        'moveBy',
        'moveTo',
        'name',
        'onblur',
        'onerror',
        'onfocus',
        'onload',
        'onresize',
        'onunload',
        'open',
        'opener',
        'opera',
        'outerHeight',
        'outerWidth',
        'pageXOffset',
        'pageYOffset',
        'parent',
        'print',
        'removeEventListener',
        'resizeBy',
        'resizeTo',
        'screen',
        'screenLeft',
        'screenTop',
        'screenX',
        'screenY',
        'scroll',
        'scrollbars',
        'scrollBy',
        'scrollTo',
        'scrollX',
        'scrollY',
        'self',
        'status',
        'statusbar',
        'stop',
        'toolbar',
        'top',
      ],
      'no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
          allowTaggedTemplates: true,
        },
      ],
      'no-use-before-define': [
        'warn',
        {
          functions: false,
          classes: false,
          variables: false,
        },
      ],
      'no-useless-computed-key': 'warn',
      'no-useless-concat': 'warn',
      'no-useless-constructor': 'warn',
      'no-useless-rename': [
        'warn',
        {
          ignoreDestructuring: false,
          ignoreImport: false,
          ignoreExport: false,
        },
      ],
      strict: ['warn', 'never'],
      'unicode-bom': ['warn', 'never'],
      'no-restricted-properties': [
        'error',
        {
          object: 'require',
          property: 'ensure',
          message:
            'Please use import() instead. More info: https://facebook.github.io/create-react-app/docs/code-splitting',
        },
        {
          object: 'System',
          property: 'import',
          message:
            'Please use import() instead. More info: https://facebook.github.io/create-react-app/docs/code-splitting',
        },
      ],
      'import/first': 'error',
      'import/no-amd': 'error',
      'import/no-anonymous-default-export': 'warn',
      'import/no-webpack-loader-syntax': 'error',
      'no-object-constructor': 'warn',
      'no-unused-vars': [
        'warn',
        {
          args: 'none',
          ignoreRestSiblings: true,
          caughtErrors: 'none',
        },
      ],
      'import/no-unresolved': ['error', { commonjs: true }],
      // axios.create() and similar valid default-export APIs need no warning.
      'import/no-named-as-default-member': 'off',
    },
  },
  {
    name: 'peers/frontend',
    files: frontendFiles,
    languageOptions: { globals: globals.browser },
    plugins: { react, 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: { conditionNames: ['browser', 'import', 'default'] },
      },
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'react/forbid-foreign-prop-types': [
        'warn',
        {
          allowInPropTypes: true,
        },
      ],
      'react/jsx-pascal-case': [
        'warn',
        {
          allowAllCaps: true,
          ignore: [],
        },
      ],
      'react/no-typos': 'error',
      'react/style-prop-object': 'warn',
      // React 19 no longer performs runtime PropTypes checks.
      'react/prop-types': 'off',
      // Review focus management in dialogs before promoting this to an error.
      'jsx-a11y/no-autofocus': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    name: 'peers/node',
    files: javascriptFiles,
    ignores: frontendFiles,
    languageOptions: { globals: globals.node },
  },
  {
    name: 'peers/commonjs',
    files: ['src/backend/**/*.js'],
    ignores: ['src/backend/tests/**', 'src/backend/**/*.{test,spec}.js'],
    languageOptions: { sourceType: 'commonjs' },
  },
  {
    name: 'peers/vitest',
    files: ['src/**/*.{test,spec}.{js,jsx,mjs,cjs}'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/no-focused-tests': 'error',
      'vitest/valid-expect': 'error',
      'vitest/no-identical-title': 'error',
      'vitest/no-disabled-tests': 'warn',
    },
  },
  // Prettier owns formatting; keep this after all lint rules.
  { ...prettier, name: 'peers/formatting', files: javascriptFiles },
];

export default config;
