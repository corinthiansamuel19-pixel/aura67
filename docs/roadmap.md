# Roadmap — aura67

Desenvolvimento em **etapas lógicas**, uma por vez. Cada etapa é isoladamente testável e requer aprovação antes da próxima. A cada funcionalidade: commit + push.

| # | Etapa | Objetivo | Status |
|---|---|---|---|
| **E1** | Scaffold & Boot | Projeto rodando na :3000 com tela de boot | ✅ Concluída |
| **E2** | Vertical Slice jogável | Mover → encontro → batalha → vitória → volta | ✅ Concluída |
| **E3** | Pipeline data-driven | Schemas Zod, content-registry (glob), `content:check`, EventBus, GameState | ✅ Concluída |
| **E4** | Mundo & Exploração | Mapas em grade, portais, NPCs, zonas de encontro, HUD | ✅ Concluída |
| **E5** | Combate: profundidade | Atributos, fórmulas testadas, iniciativa, IA por perfil, XP/nível, party de 4 | ✅ Concluída |
| **E6** | Habilidades & Status | Skills data-driven (efeitos tipados), buffs/debuffs/DoT, elementos/afinidades | ✅ Concluída |
| **E7** | Inventário & Equipamentos | Itens, equipar/recalcular atributos, uso em combate/campo | ✅ Concluída |
| **E8** | Bestiário & Loot | Encounter/loot tables, elites e chefe (Colosso-Coroa) | ✅ Concluída |
| **E9** | Diálogo & NPCs | Grafo de nós ramificado, flags, ações (quest/item/batalha) | ✅ Concluída |
| **E10** | Quests & Objetivos | Jornal, rastreamento automático por eventos, multi-estágio | ✅ Concluída |
| **E11** | Save/Load & Persistência | localStorage com envelope versionado + migração + 3 slots | ✅ Concluída |
| **E12** | Áudio, UI/UX & Menus | Áudio procedural, opções (volumes/mudo), menus/HUD | ✅ Concluída |
| **E13** | Conteúdo & Fluxos | Slice de Valdaura (4 mapas, 7 inimigos, 3 quests), título/vitória/game-over | 🟡 Slice jogável |

**Fluxo completo jogável:** menu → Relicário → Ermo → Fortim → Fenda → chefe → vitória.

## Expansões futuras (pós-MVP)
- Economia/lojas/crafting (mercadores já existem como NPCs).
- IndexedDB + `navigator.storage.persist()` + PWA/service worker para offline real.
- Acessibilidade (paleta colorblind-safe, remap de teclas, escala de fonte), i18n.
- Recrutamento de companheiros via diálogo; mais anéis/regiões, chefes-âncora e conteúdo.
- Migração de renderizador para Phaser 4 (o núcleo headless já está desacoplado).

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
