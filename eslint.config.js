// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },

  {
    // Dentro de shared/ui y shared/domain, importar archivos concretos,
    // nunca los barriles de esos directorios.
    files: ['src/app/shared/ui/**/*.ts', 'src/app/shared/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@shared/ui',
              message: 'Importa el archivo concreto, no el barril.',
            },
            {
              name: '@shared/domain',
              message: 'Importa el archivo concreto, no el barril.',
            },
          ],
          patterns: [
            {
              group: ['@shared/ui/index', '@shared/domain/index'],
              message: 'Importa el archivo concreto, no el barril.',
            },
          ],
        },
      ],
    },
  },
]);
