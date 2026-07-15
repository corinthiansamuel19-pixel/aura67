import { z } from 'zod';

/**
 * Schemas Zod = fonte única de verdade do CONTEÚDO do jogo.
 * Os tipos TS são inferidos daqui (z.infer), nunca escritos em paralelo.
 * Adicionar conteúdo = criar 1 arquivo de dados validado por estes schemas.
 */

/* ─────────────────────────── Comuns ─────────────────────────── */

export const StatModsSchema = z
  .object({
    maxHp: z.number(),
    maxMp: z.number(),
    atk: z.number(),
    def: z.number(),
    mag: z.number(),
    res: z.number(),
    spd: z.number(),
    critChance: z.number(),
    critDmg: z.number(),
    accuracy: z.number(),
    evasion: z.number(),
  })
  .partial();

export const PrimaryStatsSchema = z.object({
  maxHp: z.number().int().positive(),
  maxMp: z.number().int().nonnegative(),
  atk: z.number().int().nonnegative(),
  def: z.number().int().nonnegative(),
  mag: z.number().int().nonnegative(),
  res: z.number().int().nonnegative(),
  spd: z.number().int().positive(),
  critChance: z.number().min(0).max(1).default(0.05),
  critDmg: z.number().min(1).default(1.5),
  accuracy: z.number().min(0).max(1).default(0.95),
  evasion: z.number().min(0).max(0.95).default(0.05),
});

export const ScalingSchema = z.object({
  stat: z.enum(['atk', 'mag', 'spd', 'maxHp', 'level']),
  coeff: z.number(),
});

export const TargetingSchema = z.object({
  side: z.enum(['enemy', 'ally', 'self', 'any']),
  shape: z.enum(['single', 'all', 'random']),
  count: z.number().int().positive().default(1),
});

export const StatusKindSchema = z.enum(['buff', 'debuff', 'dot', 'hot', 'control']);

/** Efeitos declarativos (união tipada) reutilizados por skills, consumíveis e status. */
export const EffectSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('damage'),
    element: z.string().default('physical'),
    power: z.number(),
    scaling: z.array(ScalingSchema).default([]),
    hits: z.number().int().positive().default(1),
    canCrit: z.boolean().default(true),
  }),
  z.object({
    type: z.literal('heal'),
    power: z.number(),
    scaling: z.array(ScalingSchema).default([]),
  }),
  z.object({
    type: z.literal('applyStatus'),
    statusId: z.string(),
    chance: z.number().min(0).max(1).default(1),
    duration: z.number().int().positive(),
    stacks: z.number().int().positive().default(1),
  }),
  z.object({
    type: z.literal('restore'),
    resource: z.enum(['hp', 'mp']),
    amount: z.number(),
  }),
  z.object({
    type: z.literal('cleanse'),
    kinds: z.array(StatusKindSchema).default(['debuff', 'dot', 'control']),
  }),
  z.object({
    type: z.literal('revive'),
    hpPercent: z.number().min(0).max(1).default(0.5),
  }),
]);

/* ─────────────────────────── Entidades ─────────────────────────── */

export const ElementSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().default('#ffffff'),
});

export const StatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: StatusKindSchema,
  color: z.string().default('#cccccc'),
  stackable: z.boolean().default(false),
  maxStacks: z.number().int().positive().default(1),
  statMods: StatModsSchema.optional(),
  tickEffects: z.array(EffectSchema).default([]),
  blocks: z.array(z.enum(['action', 'skill', 'move'])).default([]),
});

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
  targeting: TargetingSchema,
  costMp: z.number().int().nonnegative().default(0),
  costHp: z.number().int().nonnegative().default(0),
  effects: z.array(EffectSchema).min(1),
  tags: z.array(z.string()).default([]),
});

const BaseItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'relic']).default('common'),
  value: z.number().int().nonnegative().default(0),
  stackMax: z.number().int().positive().default(99),
  tags: z.array(z.string()).default([]),
});

export const ItemSchema = z.discriminatedUnion('kind', [
  BaseItemSchema.extend({
    kind: z.literal('weapon'),
    statMods: StatModsSchema.default({}),
    element: z.string().optional(),
    viz: z.enum(['sword', 'axe', 'spear', 'bow', 'dagger', 'staff', 'mace']).default('sword'),
  }),
  BaseItemSchema.extend({
    kind: z.literal('armor'),
    slot: z.enum(['head', 'body', 'hands', 'feet', 'accessory']).default('body'),
    statMods: StatModsSchema.default({}),
  }),
  BaseItemSchema.extend({
    kind: z.literal('consumable'),
    useEffects: z.array(EffectSchema).min(1),
    usableInBattle: z.boolean().default(true),
    usableInField: z.boolean().default(true),
  }),
  BaseItemSchema.extend({
    kind: z.literal('material'),
  }),
]);

export const ClassSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
  baseStats: PrimaryStatsSchema,
  growth: StatModsSchema.default({}),
  startingSkills: z.array(z.string()).default([]),
  skillsByLevel: z
    .array(z.object({ level: z.number().int().positive(), skillId: z.string() }))
    .default([]),
  startingEquipment: z.array(z.string()).default([]),
  spriteColor: z.string().default('#8fd3ff'),
});

export const EnemySchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number().int().positive().default(1),
  baseStats: PrimaryStatsSchema,
  element: z.string().optional(),
  resistances: z.record(z.string(), z.number()).default({}),
  skills: z.array(z.string()).default([]),
  ai: z.enum(['aggressive', 'defensive', 'caster', 'support', 'random']).default('aggressive'),
  xp: z.number().int().nonnegative().default(0),
  gold: z.tuple([z.number().int(), z.number().int()]).default([0, 0]),
  drops: z
    .array(
      z.object({
        itemId: z.string(),
        chance: z.number().min(0).max(1),
        qty: z.tuple([z.number().int(), z.number().int()]).default([1, 1]),
      }),
    )
    .default([]),
  boss: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  spriteColor: z.string().default('#c98b8b'),
  spriteShape: z
    .enum(['humanoid', 'beast', 'construct', 'spectre', 'swarm', 'colossus'])
    .default('humanoid'),
});

/* ─────────────────────────── Mundo ─────────────────────────── */

export const NpcSchema = z.object({
  id: z.string(),
  name: z.string(),
  at: z.tuple([z.number().int(), z.number().int()]),
  dialogueId: z.string().optional(),
  color: z.string().default('#e8d9a0'),
  sprite: z
    .enum(['villager', 'guard', 'merchant', 'elder', 'knight', 'spectre'])
    .default('villager'),
});

export const PortalSchema = z.object({
  at: z.tuple([z.number().int(), z.number().int()]),
  toMap: z.string(),
  toSpawn: z.string(),
});

export const EncounterSchema = z.object({
  rate: z.number().min(0).max(1).default(0.08),
  groups: z.array(z.object({ enemies: z.array(z.string()).min(1), weight: z.number().default(1) })),
});

export const MapSchema = z.object({
  id: z.string(),
  name: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /** Uma string por linha; cada char é um tile (ver TILE_TABLE no render). */
  tiles: z.array(z.string()).min(1),
  spawns: z.record(z.string(), z.tuple([z.number().int(), z.number().int()])).default({}),
  portals: z.array(PortalSchema).default([]),
  npcs: z.array(NpcSchema).default([]),
  encounter: EncounterSchema.optional(),
  music: z.string().optional(),
  bgColor: z.string().default('#0b0d10'),
});

export const DialogueChoiceSchema = z.object({
  text: z.string(),
  next: z.string().nullable().default(null),
  requireFlag: z.string().optional(),
  setFlag: z.string().optional(),
  startQuest: z.string().optional(),
  giveItem: z
    .object({ itemId: z.string(), qty: z.number().int().positive().default(1) })
    .optional(),
});

export const DialogueNodeSchema = z.object({
  id: z.string(),
  speaker: z.string().default(''),
  text: z.string(),
  choices: z.array(DialogueChoiceSchema).default([]),
  next: z.string().nullable().default(null),
  setFlag: z.string().optional(),
  startQuest: z.string().optional(),
  giveItem: z
    .object({ itemId: z.string(), qty: z.number().int().positive().default(1) })
    .optional(),
  startBattle: z.array(z.string()).optional(),
});

export const DialogueSchema = z.object({
  id: z.string(),
  start: z.string(),
  nodes: z.array(DialogueNodeSchema).min(1),
});

export const ObjectiveSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('kill'),
    enemyId: z.string(),
    count: z.number().int().positive().default(1),
    text: z.string().optional(),
  }),
  z.object({
    type: z.literal('collect'),
    itemId: z.string(),
    count: z.number().int().positive().default(1),
    text: z.string().optional(),
  }),
  z.object({ type: z.literal('reach'), mapId: z.string(), text: z.string().optional() }),
  z.object({ type: z.literal('talk'), npcId: z.string(), text: z.string().optional() }),
  z.object({ type: z.literal('flag'), flag: z.string(), text: z.string().optional() }),
]);

export const QuestSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(''),
  giver: z.string().optional(),
  prerequisites: z.array(z.string()).default([]),
  stages: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().default(''),
        objectives: z.array(ObjectiveSchema).min(1),
      }),
    )
    .min(1),
  rewardXp: z.number().int().nonnegative().default(0),
  rewardGold: z.number().int().nonnegative().default(0),
  rewardItems: z
    .array(z.object({ itemId: z.string(), qty: z.number().int().positive().default(1) }))
    .default([]),
});

/* ─────────────────────────── Tipos inferidos ─────────────────────────── */

export type Effect = z.infer<typeof EffectSchema>;
export type Targeting = z.infer<typeof TargetingSchema>;
export type StatusKind = z.infer<typeof StatusKindSchema>;
export type Element = z.infer<typeof ElementSchema>;
export type Status = z.infer<typeof StatusSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type WeaponItem = Extract<Item, { kind: 'weapon' }>;
export type ArmorItem = Extract<Item, { kind: 'armor' }>;
export type ConsumableItem = Extract<Item, { kind: 'consumable' }>;
export type CharacterClass = z.infer<typeof ClassSchema>;
export type Enemy = z.infer<typeof EnemySchema>;
export type GameMap = z.infer<typeof MapSchema>;
export type Npc = z.infer<typeof NpcSchema>;
export type Dialogue = z.infer<typeof DialogueSchema>;
export type DialogueNode = z.infer<typeof DialogueNodeSchema>;
export type DialogueChoice = z.infer<typeof DialogueChoiceSchema>;
export type Quest = z.infer<typeof QuestSchema>;
export type Objective = z.infer<typeof ObjectiveSchema>;

/* ───────────────────── Helpers de autoria (define*) ───────────────────── */
// Identidade tipada com z.input: dá autocomplete e permite omitir campos com default.

export const defineElement = (e: z.input<typeof ElementSchema>): z.input<typeof ElementSchema> => e;
export const defineStatus = (e: z.input<typeof StatusSchema>): z.input<typeof StatusSchema> => e;
export const defineSkill = (e: z.input<typeof SkillSchema>): z.input<typeof SkillSchema> => e;
export const defineItem = (e: z.input<typeof ItemSchema>): z.input<typeof ItemSchema> => e;
export const defineClass = (e: z.input<typeof ClassSchema>): z.input<typeof ClassSchema> => e;
export const defineEnemy = (e: z.input<typeof EnemySchema>): z.input<typeof EnemySchema> => e;
export const defineMap = (e: z.input<typeof MapSchema>): z.input<typeof MapSchema> => e;
export const defineDialogue = (e: z.input<typeof DialogueSchema>): z.input<typeof DialogueSchema> =>
  e;
export const defineQuest = (e: z.input<typeof QuestSchema>): z.input<typeof QuestSchema> => e;
