/**
 * ESLint rules for JavaScript and TypeScript in this repo (style, typescript-eslint).
 */
import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default tseslint.config(
    { files: ['**/*.js'], languageOptions: { sourceType: 'commonjs' } },
    {
        files: ['**/*.js'],
        languageOptions: { globals: { ...globals.browser, ...globals.node, __dirname: 'readonly' } },
        rules: {
            indent: ['error', 4, { SwitchCase: 1 }],
            'quote-props': ['error', 'as-needed'],
            'arrow-parens': ['error', 'as-needed'],
            'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
            'space-before-function-paren': ['error', 'always'],
            // 'max-len': ['error', {
            //     code: 160,
            //     ignoreComments: true,
            // }],
            'no-use-before-define': ['error', {
                functions: false,
            }],
            'newline-before-return': 'error',
            camelcase: ['error', {
                properties: 'never',
                ignoreDestructuring: true,
                allow: ['s3_string'],
            }],
            'func-names': ['error', 'never'],
            'nonblock-statement-body-position': ['error', 'below'],
            'consistent-return': 'off',
            'dot-notation': 'off',
            'prefer-template': 'off',
            'no-restricted-syntax': 'off',
            curly: 'off',
            'no-continue': 'off',
            'object-curly-newline': 'off',
            semi: ['error', 'always'],
            quotes: ['error', 'single'],
            'object-curly-spacing': ['error', 'always'],
            'no-empty': ['error', { allowEmptyCatch: true }],
        } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended.map((c) => ({
        ...c,
        files: ['**/*.ts'],
    })),
);