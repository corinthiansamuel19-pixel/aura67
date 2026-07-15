import type { ItemId } from '@/shared/ids';
import type { Stats } from '@/shared/stats';
import { applyStatMods, clampStats, mergeStatMods } from '@/shared/stats';
import { Classes, Items } from '@/data/registry/content';

export type EquipSlot = 'weapon' | 'head' | 'body' | 'hands' | 'feet' | 'accessory';
export const EQUIP_SLOTS: readonly EquipSlot[] = [
  'weapon',
  'head',
  'body',
  'hands',
  'feet',
  'accessory',
];

/** Membro persistente da party (o que é salvo). Runtime de batalha é o Combatant. */
export interface PartyMember {
  id: string;
  classId: string;
  name: string;
  level: number;
  xp: number;
  equipment: Partial<Record<EquipSlot, ItemId>>;
  learnedSkills: string[];
  hp: number;
  mp: number;
}

/** XP necessário para ir do nível atual ao próximo. */
export function xpToNext(level: number): number {
  return Math.round(24 * Math.pow(level, 1.55));
}

/** Skills que uma classe conhece até um dado nível. */
export function skillsUpTo(classId: string, level: number): string[] {
  const cls = Classes.require(classId);
  const byLevel = cls.skillsByLevel.filter((s) => s.level <= level).map((s) => s.skillId);
  return [...new Set([...cls.startingSkills, ...byLevel])];
}

/** Atributos finais = base da classe + crescimento por nível + equipamentos. */
export function computeStats(
  classId: string,
  level: number,
  equipment: Partial<Record<EquipSlot, ItemId>>,
): Stats {
  const cls = Classes.require(classId);
  let stats: Stats = { ...cls.baseStats };

  const growthMods = [];
  for (let i = 1; i < level; i++) {
    growthMods.push(cls.growth);
  }
  stats = applyStatMods(stats, mergeStatMods(growthMods));

  const eqMods = [];
  for (const slot of EQUIP_SLOTS) {
    const itemId = equipment[slot];
    if (itemId === undefined) continue;
    const item = Items.get(itemId);
    if (item && (item.kind === 'weapon' || item.kind === 'armor')) {
      eqMods.push(item.statMods);
    }
  }
  stats = applyStatMods(stats, mergeStatMods(eqMods));

  return clampStats(stats);
}

/** Cria um novo membro no nível dado, equipando o kit inicial da classe. */
export function createMember(classId: string, name?: string, level = 1): PartyMember {
  const cls = Classes.require(classId);
  const equipment: Partial<Record<EquipSlot, ItemId>> = {};
  for (const itemId of cls.startingEquipment) {
    const item = Items.get(itemId);
    if (!item) continue;
    if (item.kind === 'weapon') equipment.weapon = itemId;
    else if (item.kind === 'armor') equipment[item.slot] = itemId;
  }
  const stats = computeStats(classId, level, equipment);
  return {
    id: `pc-${classId}`,
    classId,
    name: name ?? cls.name,
    level,
    xp: 0,
    equipment,
    learnedSkills: skillsUpTo(classId, level),
    hp: stats.maxHp,
    mp: stats.maxMp,
  };
}

export function maxHp(member: PartyMember): number {
  return computeStats(member.classId, member.level, member.equipment).maxHp;
}

export function maxMp(member: PartyMember): number {
  return computeStats(member.classId, member.level, member.equipment).maxMp;
}
