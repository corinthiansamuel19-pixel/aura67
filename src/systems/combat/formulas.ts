import type { Stats } from '@/shared/stats';
import type { SeededRng } from '@core/rng';
import type { Effect, ScalingSchema } from '@/data/schemas';
import type { z } from 'zod';

type Scaling = z.infer<typeof ScalingSchema>;
type DamageEffect = Extract<Effect, { type: 'damage' }>;

function scalingValue(stat: Scaling['stat'], stats: Stats, level: number): number {
  switch (stat) {
    case 'atk':
      return stats.atk;
    case 'mag':
      return stats.mag;
    case 'spd':
      return stats.spd;
    case 'maxHp':
      return stats.maxHp;
    case 'level':
      return level;
  }
}

function scaledBase(power: number, scaling: readonly Scaling[], stats: Stats, level: number): number {
  let base = power;
  for (const s of scaling) {
    base += scalingValue(s.stat, stats, level) * s.coeff;
  }
  return base;
}

/** Chance de acerto = precisão do atacante menos evasão do alvo (clampeada). */
export function computeHit(rng: SeededRng, attacker: Stats, defender: Stats): boolean {
  const chance = Math.min(0.99, Math.max(0.2, attacker.accuracy - defender.evasion));
  return rng.chance(chance);
}

export interface DamageResult {
  amount: number;
  crit: boolean;
}

/** Dano de um efeito. Elemento 'physical' mitiga por DEF; demais por RES. */
export function computeDamage(
  rng: SeededRng,
  effect: DamageEffect,
  attacker: Stats,
  attackerLevel: number,
  defender: Stats,
  resistMult: number,
): DamageResult {
  const base = scaledBase(effect.power, effect.scaling, attacker, attackerLevel);
  const defStat = effect.element === 'physical' ? defender.def : defender.res;
  let dmg = base * (100 / (100 + defStat));
  dmg *= resistMult;

  let crit = false;
  if (effect.canCrit && rng.chance(attacker.critChance)) {
    crit = true;
    dmg *= attacker.critDmg;
  }
  dmg *= rng.range(0.9, 1.1);
  return { amount: Math.max(1, Math.round(dmg)), crit };
}

/** Cura de um efeito (sem crítico). */
export function computeHeal(
  rng: SeededRng,
  power: number,
  scaling: readonly Scaling[],
  healer: Stats,
  level: number,
): number {
  const base = scaledBase(power, scaling, healer, level) * rng.range(0.95, 1.05);
  return Math.max(1, Math.round(base));
}

/** Iniciativa: velocidade efetiva com pequena variação determinística. */
export function initiative(rng: SeededRng, spd: number): number {
  return spd + rng.range(0, spd * 0.15);
}
