# aura67 — Crônicas de Valdaura

RPG **2D por turnos**, single-player offline, web. Ambientação: **fantasia medieval + pós-apocalíptico** — uma civilização movida pela **Aura** (energia arcana) colapsou no **Ocaso**, e você é um **Aurífice** capaz de canalizá-la.

Projeto tratado como jogo comercial: qualidade, organização, performance e **escalabilidade de conteúdo**.

## Stack

- **TypeScript** (strict) — tipos fortes para conteúdo seguro
- **Phaser 3** — engine 2D (cenas, tilemaps, input, áudio)
- **Vite** — dev server / bundler, fixado na **porta 3000**
- **Vitest** — testes da lógica pura (sem navegador)
- **ESLint + Prettier** — qualidade e formatação
- **Zod** (a partir da Etapa 3) — validação de conteúdo data-driven

## Como rodar

Requer **Node >= 20**.

```bash
npm install        # instala dependências
npm run dev        # sobe o jogo em http://localhost:3000
```

Abra <http://localhost:3000>. Você verá: **Boot → tela de carregamento (barra de Aura) → tela de título**.

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Dev server com HMR em `localhost:3000` |
| `npm run build` | Typecheck (`tsc --noEmit`) + build de produção em `dist/` |
| `npm run preview` | Serve o build de produção na porta 3000 |
| `npm run typecheck` | Só a checagem de tipos |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (escreve) |
| `npm test` | Roda os testes (Vitest) |

## Estrutura (Etapa 1)

```
aura67/
├─ index.html              # entry do Vite
├─ vite.config.ts          # porta 3000 + aliases + config do Vitest
├─ tsconfig.json           # TypeScript strict + path aliases (@/*)
├─ src/
│  ├─ main.ts              # composition root (monta o Phaser + cenas)
│  ├─ config/              # constantes globais (game-config)
│  └─ scenes/              # boot / preload / title
└─ docs/                   # roadmap + ADRs (decisões de arquitetura)
```

A arquitetura completa (núcleo headless, conteúdo data-driven, camadas) está em [`docs/adr/`](docs/adr/) e o plano de etapas em [`docs/roadmap.md`](docs/roadmap.md).

## Configuração / segredos

O arquivo `.env` (git-ignored) guarda apenas o token do GitHub para tooling — **não** é usado como config de runtime do jogo. Configuração do jogo vive em `src/config/`.
