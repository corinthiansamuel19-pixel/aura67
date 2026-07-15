# aura67 — Crônicas de Valdaura

RPG **2D por turnos**, single-player offline, para navegador. Ambientação: **fantasia medieval + pós-apocalíptico** — a civilização movida pela **Aura** (energia arcana = magia e máquina) colapsou no **Ocaso**; você é um **Aurífice**, raro capaz de canalizá-la, e cruza o reino agonizante de **Valdaura** rumo à Fenda.

Projeto tratado como jogo comercial: qualidade, organização, performance e **escalabilidade de conteúdo** (adicionar inimigo/item/skill = editar dados, sem tocar em lógica).

## Como rodar

Requer **Node >= 20**.

```bash
npm install
npm run dev      # http://localhost:3000
```

## Como jogar

- **Mover:** Setas ou WASD
- **Interagir / avançar diálogo:** E (mundo) · Espaço/clique (diálogo)
- **Menu do jogo (party, inventário, jornal, opções, salvar):** I
- **Combate:** por turnos — escolha Atacar / Habilidade / Item / Defender / Fugir; selecione o alvo clicando.

**Objetivo:** desperte no Relicário, receba o Estilhaço do Cavaleiro Moribundo, cruze o **Ermo** até o **Fortim Cinza**, fale com a **Anciã Véu**, e enfrente o **Colosso-Coroa** na Borda da Fenda para selar o destino da Aura.

## Stack

- **TypeScript** (strict) · **Phaser 3** (renderização 2D) · **Vite** (porta 3000)
- **Zod** (conteúdo data-driven validado) · **Vitest** (testes) · **ESLint + Prettier**

## Arquitetura (resumo)

Camadas com direção única de dependência; o **núcleo de regras não importa Phaser**:

```
src/
├─ core/         # RNG semeado, event bus tipado, catálogo de eventos
├─ shared/       # tipos e helpers puros (stats, ids)
├─ domain/       # party, combatant, game-state (modelos puros)
├─ data/
│  ├─ schemas/   # schemas Zod (fonte da verdade do conteúdo)
│  ├─ content/   # DADOS: elementos, status, skills, itens, classes,
│  │             #        inimigos, mapas, diálogos, quests
│  └─ registry/  # carregamento por glob + validação de integridade
├─ systems/      # combate, progressão, inventário, loot, quests,
│                # diálogo, save/load, áudio (TS puro/testável)
├─ rendering/    # texturas placeholder procedurais
├─ ui/           # tema + widgets
├─ game/         # GameContext (store/quests/áudio)
└─ scenes/       # Phaser: boot, preload, main-menu, world, battle,
                 #         dialogue, menu, endings
```

Decisões em [`docs/adr/`](docs/adr/); etapas em [`docs/roadmap.md`](docs/roadmap.md).

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Dev server (HMR) em `localhost:3000` |
| `npm run build` | Typecheck + build de produção em `dist/` |
| `npm test` | Testes unitários (Vitest) — inclui `content:check` |
| `npm run content:check` | Valida integridade referencial do conteúdo |
| `npm run lint` / `npm run format` | ESLint / Prettier |

## Adicionar conteúdo (exemplo)

Crie um arquivo em `src/data/content/enemies/` (ou adicione ao array existente):

```ts
import { defineEnemy } from '@/data/schemas';
export default defineEnemy({
  id: 'novo-inimigo',
  name: 'Novo Inimigo',
  baseStats: { maxHp: 30, maxMp: 0, atk: 8, def: 4, mag: 0, res: 2, spd: 7 },
  skills: ['enemy-claw'],
  xp: 15, gold: [4, 10],
  drops: [{ itemId: 'scrap-metal', chance: 0.4 }],
});
```

O glob registra, o Zod valida e o `content:check` confere as referências — **sem tocar em código da engine**.

## Verificação end-to-end (opcional)

Um smoke test headless (Playwright) dirige o jogo e captura erros de runtime:

```bash
npx playwright install chromium   # uma vez
npm run dev                        # em outro terminal
node tests/e2e/smoke.mjs           # SHOT_DIR=<pasta> p/ screenshots
```

No mundo, a tecla **B** força um encontro de teste (apenas em dev).

## Configuração / segredos

O `.env` (git-ignored) guarda apenas o token do GitHub para tooling — não é config de runtime do jogo (essa vive em `src/config/`).
