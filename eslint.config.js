import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

// Flat config (ESLint 9). Regras type-aware ficam para uma etapa futura
// (quando houver lógica de domínio para proteger); por ora, foco em correção
// básica + integração com o Prettier.
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  prettier,
);
