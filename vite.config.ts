import { defineConfig } from 'vitest/config';

// defineConfig vem de 'vitest/config' para permitir a chave `test` mantendo
// compatibilidade total com o Vite (dev/build usam a mesma config).
export default defineConfig({
  server: {
    // Requisito do projeto: rodar SEMPRE na porta 3000.
    // strictPort => falha explícita se a 3000 estiver ocupada (em vez de trocar sozinho).
    port: 3000,
    strictPort: true,
    open: false,
  },
  resolve: {
    // Vite 8 resolve os path aliases do tsconfig.json nativamente (@/* etc.).
    tsconfigPaths: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
  test: {
    // Núcleo/regras são TS puro e determinístico — testam em ambiente Node, sem canvas.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
