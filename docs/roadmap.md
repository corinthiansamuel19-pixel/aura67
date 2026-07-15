# Roadmap — aura67

Desenvolvimento em **etapas lógicas**, uma por vez. Cada etapa é isoladamente testável e requer aprovação antes da próxima. A cada funcionalidade: commit + push.

| # | Etapa | Objetivo | Status |
|---|---|---|---|
| **E1** | Scaffold & Boot | Projeto rodando na :3000 com tela de boot | ✅ **Concluída** |
| **E2** | 🎯 Vertical Slice jogável | Mover no mapa → encontro → batalha por turnos → vitória → volta (dados mínimos + placeholders CC0). Primeira experiência divertida e integrada. | ⏳ Próxima |
| **E3** | Pipeline data-driven | Schemas Zod, content-registry (glob), `content:check`, EventBus tipado, GameState serializável, asset manifest | ⬜ |
| **E4** | Mundo & Exploração | Tilemaps (Tiled), múltiplos mapas, portais/streaming, NPCs, zonas de encontro | ⬜ |
| **E5** | Combate: profundidade | Atributos, fórmulas testadas, iniciativa, IA por perfil, XP/nível, party de até 4 | ⬜ |
| **E6** | Habilidades & Status | Skills data-driven (efeitos como uniões tipadas), buffs/debuffs/DoT, elementos/afinidades | ⬜ |
| **E7** | Inventário & Equipamentos | Itens, equipar/recalcular atributos, uso em combate/mundo | ⬜ |
| **E8** | Bestiário & Loot | Encounter/loot tables, elites e chefes | ⬜ |
| **E9** | Diálogo & NPCs | Grafo de nós ramificado, flags de estado | ⬜ |
| **E10** | Quests & Objetivos | Jornal, rastreamento automático por eventos | ⬜ |
| **E11** | Save/Load & Persistência | IndexedDB, slots, autosave, migração de save, `storage.persist()` | ⬜ |
| **E12** | Áudio, UI/UX & Acessibilidade | Audio manager, opções, a11y (cor/fonte/remap), i18n base | ⬜ |
| **E13** | Conteúdo, Balanceamento, PWA & Release | Regiões/anéis, história, chefes, economia/lojas/crafting, PWA offline, otimização, QA, build | ⬜ |

## Princípios que guiam todas as etapas

1. **Núcleo headless × Apresentação** — regras/combate/estado em TS puro, sem importar Phaser (testável e à prova de troca de renderer).
2. **Conteúdo data-driven** — inimigos/itens/skills/mapas/quests são dados validados por Zod, referenciados por ID. Adicionar conteúdo = criar 1 arquivo.
3. **Determinismo** — RNG semeado com streams nomeados (combate/loot/encontro).
4. **Camadas com fronteiras** — `core → entities/systems/data → scenes → ui/rendering`.
5. **Save versionado** — migrações só para saves (não para conteúdo).

## Decisões de escopo (cortes anti-over-engineering)

- Efeitos de skill/status como **uniões tipadas** (sem mini-linguagem em string).
- **Loop nativo do Phaser** (sem fixed-timestep — é jogo por turnos).
- Versionamento/migração **apenas para saves**.
- Tooling de time (Commitlint/Lefthook/Playwright) **adiado** para quando houver o que proteger.
- **Vertical slice + placeholders CC0** cedo, para validar diversão sem depender de artista.

## Mundo

Ver a bíblia do mundo (Valdaura, o Ocaso, as 5 facções, criaturas) — a ser detalhada em `docs/world/` a partir da E2.
