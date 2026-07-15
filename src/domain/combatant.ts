import type { Stats } from '@/shared/stats';
import { applyStatMods, clampStats, mergeStatMods } from '@/shared/stats';
import { Classes, Items, Statuses } from '@/data/registry/content';
import type { Enemy } from '@/data/schemas';
import type { PartyMember } from './party';
import { computeStats } from './party';

export interface ActiveStatus {
  statusId: string;
  duration: number;
  stacks: number;
}

export type CombatShape =
  | 'humanoid'
  | 'beast'
  | 'construct'
  | 'spectre'
  | 'swarm'
  | 'colossus'
  | 'hero';

export type CombatAi =
  | 'aggressive'
  | 'defensive'
  | 'caster'
  | 'support'
  | 'random'
  | 'player';

/** Ator de runtime dentro de uma batalha (nunca é serializado no save). */
export interface Combatant {
  id: string;
  name: string;
  side: 'ally' | 'enemy';
  isPlayer: boolean;
  memberId: string | undefined;
  enemyId: string | undefined;
  level: number;
  baseStats: Stats;
  hp: number;
  mp: number;
  alive: boolean;
  statuses: ActiveStatus[];
  skills: string[];
  element: string | undefined;
  /** Elemento do ataque básico (arma do herói ou elemento inato do inimigo). */
  attackElement: string;
  resistances: Record<string, number>;
  ai: CombatAi;
  defending: boolean;
  spriteColor: string;
  spriteShape: CombatShape;
}

export function combatantFromMember(member: PartyMember): Combatant {
  const stats = computeStats(member.classId, member.level, member.equipment);
  const cls = Classes.require(member.classId);
  const hp = Math.max(0, Math.min(member.hp, stats.maxHp));
  const mp = Math.max(0, Math.min(member.mp, stats.maxMp));
  const weaponId = member.equipment.weapon;
  const weapon = weaponId !== undefined ? Items.get(weaponId) : undefined;
  const attackElement =
    weapon && weapon.kind === 'weapon' && weapon.element !== undefined ? weapon.element : 'physical';
  return {
    id: member.id,
    name: member.name,
    side: 'ally',
    isPlayer: true,
    memberId: member.id,
    enemyId: undefined,
    level: member.level,
    baseStats: stats,
    hp,
    mp,
    alive: hp > 0,
    statuses: [],
    skills: [...member.learnedSkills],
    element: undefined,
    attackElement,
    resistances: {},
    ai: 'player',
    defending: false,
    spriteColor: cls.spriteColor,
    spriteShape: 'hero',
  };
}

export function combatantFromEnemy(enemy: Enemy, instanceId: string): Combatant {
  const stats = clampStats({ ...enemy.baseStats });
  return {
    id: instanceId,
    name: enemy.name,
    side: 'enemy',
    isPlayer: false,
    memberId: undefined,
    enemyId: enemy.id,
    level: enemy.level,
    baseStats: stats,
    hp: stats.maxHp,
    mp: stats.maxMp,
    alive: true,
    statuses: [],
    skills: [...enemy.skills],
    element: enemy.element,
    attackElement: enemy.element ?? 'physical',
    resistances: { ...enemy.resistances },
    ai: enemy.ai,
    defending: false,
    spriteColor: enemy.spriteColor,
    spriteShape: enemy.spriteShape,
  };
}

/** Atributos efetivos: base + modificadores de status (por stack) + defesa. */
export function effectiveStats(c: Combatant): Stats {
  const mods = [];
  for (const s of c.statuses) {
    const def = Statuses.get(s.statusId);
    if (def?.statMods) {
      for (let i = 0; i < s.stacks; i++) {
        mods.push(def.statMods);
      }
    }
  }
  let stats = applyStatMods(c.baseStats, mergeStatMods(mods));
  if (c.defending) {
    stats = { ...stats, def: Math.round(stats.def * 1.5) + 2, res: Math.round(stats.res * 1.5) + 2 };
  }
  return clampStats(stats);
}

export function isBlocked(c: Combatant, block: 'action' | 'skill' | 'move'): boolean {
  return c.statuses.some((s) => Statuses.get(s.statusId)?.blocks.includes(block) ?? false);
}

export function maxHpOf(c: Combatant): number {
  return effectiveStats(c).maxHp;
}

export function maxMpOf(c: Combatant): number {
  return effectiveStats(c).maxMp;
}
