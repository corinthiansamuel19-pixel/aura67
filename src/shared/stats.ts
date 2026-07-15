/**
 * Modelo de atributos de combate e helpers puros.
 * TS puro, sem dependência de Phaser — usado por regras e testes.
 */
export interface Stats {
  /** Pontos de vida máximos. */
  maxHp: number;
  /** Pontos de mana/energia máximos. */
  maxMp: number;
  /** Ataque físico. */
  atk: number;
  /** Defesa física. */
  def: number;
  /** Poder mágico. */
  mag: number;
  /** Resistência mágica. */
  res: number;
  /** Velocidade (define a iniciativa nos turnos). */
  spd: number;
  /** Chance de acerto crítico (0..1). */
  critChance: number;
  /** Multiplicador de dano crítico (ex.: 1.5). */
  critDmg: number;
  /** Precisão (0..1). */
  accuracy: number;
  /** Evasão (0..1). */
  evasion: number;
}

/** Modificadores parciais de atributo (aditivos), como os de equipamentos/buffs. */
export type StatMods = Partial<Stats>;

export const STAT_KEYS: readonly (keyof Stats)[] = [
  'maxHp',
  'maxMp',
  'atk',
  'def',
  'mag',
  'res',
  'spd',
  'critChance',
  'critDmg',
  'accuracy',
  'evasion',
];

export const EMPTY_STATS: Stats = {
  maxHp: 0,
  maxMp: 0,
  atk: 0,
  def: 0,
  mag: 0,
  res: 0,
  spd: 0,
  critChance: 0,
  critDmg: 0,
  accuracy: 0,
  evasion: 0,
};

/** Retorna uma cópia de `base` com os modificadores somados. */
export function applyStatMods(base: Stats, mods: StatMods): Stats {
  const out: Stats = { ...base };
  for (const key of STAT_KEYS) {
    const delta = mods[key];
    if (typeof delta === 'number') {
      out[key] = out[key] + delta;
    }
  }
  return out;
}

/** Soma vários conjuntos de modificadores num só. */
export function mergeStatMods(mods: readonly StatMods[]): StatMods {
  const out: StatMods = {};
  for (const m of mods) {
    for (const key of STAT_KEYS) {
      const delta = m[key];
      if (typeof delta === 'number') {
        out[key] = (out[key] ?? 0) + delta;
      }
    }
  }
  return out;
}

/** Garante que atributos nunca fiquem negativos onde não faz sentido. */
export function clampStats(s: Stats): Stats {
  return {
    ...s,
    maxHp: Math.max(1, Math.round(s.maxHp)),
    maxMp: Math.max(0, Math.round(s.maxMp)),
    atk: Math.max(0, s.atk),
    def: Math.max(0, s.def),
    mag: Math.max(0, s.mag),
    res: Math.max(0, s.res),
    spd: Math.max(1, s.spd),
    critChance: Math.min(1, Math.max(0, s.critChance)),
    critDmg: Math.max(1, s.critDmg),
    accuracy: Math.min(1, Math.max(0.05, s.accuracy)),
    evasion: Math.min(0.95, Math.max(0, s.evasion)),
  };
}
