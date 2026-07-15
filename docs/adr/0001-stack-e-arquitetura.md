# ADR 0001 — Stack e arquitetura base

- **Status:** Aceito
- **Data:** 2026-07-15
- **Etapa:** E1

## Contexto

aura67 é um RPG 2D web, single-player offline, combate por turnos, tratado como jogo comercial com foco em **escalabilidade de conteúdo** e manutenção de longo prazo. Precisa rodar em `localhost:3000` e ser desenvolvido em etapas isoladamente testáveis.

## Decisão

### Stack
- **TypeScript** em modo strict total (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`).
- **Phaser 3** como engine de renderização 2D — traz cenas, tilemaps (Tiled), loader, input, tweens e áudio prontos, reduzindo o custo por conteúdo novo. (Fixado no 3.x; Phaser 4 reavaliado no futuro.)
- **Vite** como dev server/bundler, com `server.port = 3000` e `strictPort = true`.
- **Vitest** para testes; **ESLint 9 (flat) + Prettier** para qualidade; **Zod** (a partir da E3) para validação de conteúdo.
- **npm** como gerenciador de pacotes por ora (pnpm reavaliado se o projeto crescer para workspaces).

### Arquitetura
- **Núcleo headless × Apresentação:** regras, combate, estado e save em TypeScript puro, **sem nenhuma dependência do Phaser**. A apresentação (cenas Phaser) apenas lê estado e coleta input.
- **Conteúdo data-driven:** entidades de jogo (inimigos, itens, skills, mapas, diálogos, quests) são **dados** validados por schema, referenciados por **ID**. Meta: adicionar conteúdo = criar 1 arquivo, sem tocar em lógica.
- **Determinismo:** todo aleatório passa por **RNG semeado** (streams nomeados), viabilizando testes reprodutíveis e save/replay.
- **Camadas com direção única de dependência:** `core → entities/systems/data → scenes → ui/rendering`.
- **Save versionado** (IndexedDB) com migrações — versionamento aplicado **apenas a saves**, não a conteúdo estático.

### Produto
- **Party de até 4** personagens (começa solo como o Aurífice e recruta companheiros).

## Cortes deliberados (evitar over-engineering precoce)
- Efeitos de skill/status como **uniões discriminadas tipadas**, não mini-linguagem em string.
- **Loop nativo do Phaser** (sem fixed-timestep/interpolação — é jogo por turnos; o determinismo vem do RNG).
- **Sem migração de conteúdo** (só de saves).
- **Sem balance-overlay** agora (fórmulas centrais + coeficientes em dados bastam).
- Tooling de time (Commitlint, Lefthook, Playwright, dependency-cruiser) **adiado**.

## Consequências
- **Positivas:** lógica testável sem navegador; conteúdo cresce sem inchar código; renderer trocável; primeira tela jogável mais rápida.
- **Custos:** disciplina para manter o núcleo sem importar Phaser (a ser reforçada por lint/fronteiras numa etapa futura); Phaser adiciona ~300–400KB gzip ao bundle (mitigado com code-splitting por cena mais adiante).

## Alternativas consideradas
- **PixiJS / Canvas puro / Kaboom** em vez de Phaser — mais trabalho de infra (cenas, tilemaps, loader) para o mesmo resultado.
- **ECS puro** para entidades — overkill para dezenas de entidades por turno; adotado híbrido (composição + data-driven).
- **localStorage** como save primário — síncrono e limitado; preterido por IndexedDB.
