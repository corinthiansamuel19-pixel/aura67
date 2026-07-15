import {
  ElementSchema,
  StatusSchema,
  SkillSchema,
  ItemSchema,
  ClassSchema,
  EnemySchema,
  MapSchema,
  DialogueSchema,
  QuestSchema,
  type Effect,
} from '@/data/schemas';
import { buildRegistry } from './registry';

/*
 * Carregamento automático por glob: soltar 1 arquivo na pasta certa já o
 * registra — sem editar nenhum index. Cada registry valida com seu schema Zod.
 */
export const Elements = buildRegistry(
  'Element',
  ElementSchema,
  import.meta.glob('../content/elements/*.ts', { eager: true, import: 'default' }),
);
export const Statuses = buildRegistry(
  'Status',
  StatusSchema,
  import.meta.glob('../content/statuses/*.ts', { eager: true, import: 'default' }),
);
export const Skills = buildRegistry(
  'Skill',
  SkillSchema,
  import.meta.glob('../content/skills/*.ts', { eager: true, import: 'default' }),
);
export const Items = buildRegistry(
  'Item',
  ItemSchema,
  import.meta.glob('../content/items/*.ts', { eager: true, import: 'default' }),
);
export const Classes = buildRegistry(
  'Class',
  ClassSchema,
  import.meta.glob('../content/classes/*.ts', { eager: true, import: 'default' }),
);
export const Enemies = buildRegistry(
  'Enemy',
  EnemySchema,
  import.meta.glob('../content/enemies/*.ts', { eager: true, import: 'default' }),
);
export const Maps = buildRegistry(
  'Map',
  MapSchema,
  import.meta.glob('../content/maps/*.ts', { eager: true, import: 'default' }),
);
export const Dialogues = buildRegistry(
  'Dialogue',
  DialogueSchema,
  import.meta.glob('../content/dialogues/*.ts', { eager: true, import: 'default' }),
);
export const Quests = buildRegistry(
  'Quest',
  QuestSchema,
  import.meta.glob('../content/quests/*.ts', { eager: true, import: 'default' }),
);

export const Content = {
  elements: Elements,
  statuses: Statuses,
  skills: Skills,
  items: Items,
  classes: Classes,
  enemies: Enemies,
  maps: Maps,
  dialogues: Dialogues,
  quests: Quests,
} as const;

export type ContentBundle = typeof Content;

function checkEffects(effects: readonly Effect[], where: string, errors: string[]): void {
  for (const e of effects) {
    if (e.type === 'damage' && !Elements.has(e.element)) {
      errors.push(`${where}: elemento '${e.element}' não existe`);
    }
    if (e.type === 'applyStatus' && !Statuses.has(e.statusId)) {
      errors.push(`${where}: status '${e.statusId}' não existe`);
    }
  }
}

/**
 * Integridade referencial: percorre todos os cross-refs e afirma que os alvos
 * existem. Lança com a lista de problemas. É o "content:check" do projeto,
 * exercido pelo teste content.test.ts (e importado ao subir o jogo).
 */
export function validateReferences(): void {
  const errors: string[] = [];

  for (const skill of Skills.all()) {
    checkEffects(skill.effects, `skill '${skill.id}'`, errors);
  }
  for (const status of Statuses.all()) {
    checkEffects(status.tickEffects, `status '${status.id}'`, errors);
  }
  for (const item of Items.all()) {
    if (item.kind === 'consumable') {
      checkEffects(item.useEffects, `item '${item.id}'`, errors);
    }
    if (item.kind === 'weapon' && item.element !== undefined && !Elements.has(item.element)) {
      errors.push(`item '${item.id}': elemento '${item.element}' não existe`);
    }
  }
  for (const cls of Classes.all()) {
    for (const s of cls.startingSkills) {
      if (!Skills.has(s)) errors.push(`class '${cls.id}': skill inicial '${s}' não existe`);
    }
    for (const s of cls.skillsByLevel) {
      if (!Skills.has(s.skillId)) errors.push(`class '${cls.id}': skill '${s.skillId}' não existe`);
    }
    for (const it of cls.startingEquipment) {
      if (!Items.has(it)) errors.push(`class '${cls.id}': equipamento '${it}' não existe`);
    }
  }
  for (const enemy of Enemies.all()) {
    if (enemy.element !== undefined && !Elements.has(enemy.element)) {
      errors.push(`enemy '${enemy.id}': elemento '${enemy.element}' não existe`);
    }
    for (const el of Object.keys(enemy.resistances)) {
      if (!Elements.has(el)) errors.push(`enemy '${enemy.id}': resistência a '${el}' inexistente`);
    }
    for (const s of enemy.skills) {
      if (!Skills.has(s)) errors.push(`enemy '${enemy.id}': skill '${s}' não existe`);
    }
    for (const d of enemy.drops) {
      if (!Items.has(d.itemId)) errors.push(`enemy '${enemy.id}': drop '${d.itemId}' não existe`);
    }
  }
  for (const map of Maps.all()) {
    for (const p of map.portals) {
      if (!Maps.has(p.toMap)) errors.push(`map '${map.id}': portal para '${p.toMap}' inexistente`);
    }
    for (const npc of map.npcs) {
      if (npc.dialogueId !== undefined && !Dialogues.has(npc.dialogueId)) {
        errors.push(`map '${map.id}': npc '${npc.id}' aponta para diálogo inexistente`);
      }
    }
    for (const g of map.encounter?.groups ?? []) {
      for (const eid of g.enemies) {
        if (!Enemies.has(eid)) errors.push(`map '${map.id}': encontro com inimigo '${eid}' inexistente`);
      }
    }
  }
  for (const dlg of Dialogues.all()) {
    const nodeIds = new Set(dlg.nodes.map((n) => n.id));
    if (!nodeIds.has(dlg.start)) errors.push(`dialogue '${dlg.id}': nó inicial '${dlg.start}' inexistente`);
    for (const node of dlg.nodes) {
      if (node.next !== null && !nodeIds.has(node.next)) {
        errors.push(`dialogue '${dlg.id}': nó '${node.id}'.next '${node.next}' inexistente`);
      }
      if (node.startQuest !== undefined && !Quests.has(node.startQuest)) {
        errors.push(`dialogue '${dlg.id}': quest '${node.startQuest}' inexistente`);
      }
      if (node.giveItem !== undefined && !Items.has(node.giveItem.itemId)) {
        errors.push(`dialogue '${dlg.id}': item '${node.giveItem.itemId}' inexistente`);
      }
      for (const eid of node.startBattle ?? []) {
        if (!Enemies.has(eid)) errors.push(`dialogue '${dlg.id}': batalha com '${eid}' inexistente`);
      }
      for (const c of node.choices) {
        if (c.next !== null && !nodeIds.has(c.next)) {
          errors.push(`dialogue '${dlg.id}': escolha aponta para nó '${c.next}' inexistente`);
        }
        if (c.startQuest !== undefined && !Quests.has(c.startQuest)) {
          errors.push(`dialogue '${dlg.id}': escolha inicia quest '${c.startQuest}' inexistente`);
        }
        if (c.giveItem !== undefined && !Items.has(c.giveItem.itemId)) {
          errors.push(`dialogue '${dlg.id}': escolha dá item '${c.giveItem.itemId}' inexistente`);
        }
      }
    }
  }
  for (const q of Quests.all()) {
    for (const pre of q.prerequisites) {
      if (!Quests.has(pre)) errors.push(`quest '${q.id}': pré-requisito '${pre}' inexistente`);
    }
    for (const stage of q.stages) {
      for (const obj of stage.objectives) {
        if (obj.type === 'kill' && !Enemies.has(obj.enemyId))
          errors.push(`quest '${q.id}': objetivo mata '${obj.enemyId}' inexistente`);
        if (obj.type === 'collect' && !Items.has(obj.itemId))
          errors.push(`quest '${q.id}': objetivo coleta '${obj.itemId}' inexistente`);
        if (obj.type === 'reach' && !Maps.has(obj.mapId))
          errors.push(`quest '${q.id}': objetivo alcança mapa '${obj.mapId}' inexistente`);
      }
    }
    for (const r of q.rewardItems) {
      if (!Items.has(r.itemId)) errors.push(`quest '${q.id}': recompensa '${r.itemId}' inexistente`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Integridade de conteúdo falhou (${errors.length}):\n- ${errors.join('\n- ')}`);
  }
}
