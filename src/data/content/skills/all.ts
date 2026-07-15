import { defineSkill } from '@/data/schemas';

/**
 * Habilidades. Combinam primitivas de efeito — inimigo/skill novo que recombine
 * damage/heal/applyStatus é puro dado.
 */
export default [
  // ── Cavaleiro / físico ──
  defineSkill({
    id: 'power-strike',
    name: 'Golpe Poderoso',
    description: 'Um golpe físico pesado em um alvo.',
    targeting: { side: 'enemy', shape: 'single' },
    costMp: 4,
    effects: [{ type: 'damage', element: 'physical', power: 16, scaling: [{ stat: 'atk', coeff: 1.2 }] }],
    tags: ['physical'],
  }),
  defineSkill({
    id: 'cleave',
    name: 'Talho Amplo',
    description: 'Fere todos os inimigos com um arco de aço.',
    targeting: { side: 'enemy', shape: 'all' },
    costMp: 8,
    effects: [{ type: 'damage', element: 'physical', power: 12, scaling: [{ stat: 'atk', coeff: 0.9 }] }],
    tags: ['physical'],
  }),
  defineSkill({
    id: 'stun-bash',
    name: 'Pancada Atordoante',
    description: 'Dano físico com chance de atordoar.',
    targeting: { side: 'enemy', shape: 'single' },
    costMp: 6,
    effects: [
      { type: 'damage', element: 'physical', power: 10, scaling: [{ stat: 'atk', coeff: 0.8 }] },
      { type: 'applyStatus', statusId: 'stunned', chance: 0.5, duration: 1 },
    ],
    tags: ['physical', 'control'],
  }),
  defineSkill({
    id: 'war-cry',
    name: 'Grito de Guerra',
    description: 'Enfurece todos os aliados (ATK/MAG +).',
    targeting: { side: 'ally', shape: 'all' },
    costMp: 7,
    effects: [{ type: 'applyStatus', statusId: 'enraged', duration: 3 }],
    tags: ['support'],
  }),
  // ── Aurífice / arcano ──
  defineSkill({
    id: 'aura-lance',
    name: 'Lança de Aura',
    description: 'Perfura um alvo com Aura pura.',
    targeting: { side: 'enemy', shape: 'single' },
    costMp: 6,
    effects: [{ type: 'damage', element: 'aura', power: 18, scaling: [{ stat: 'mag', coeff: 1.3 }] }],
    tags: ['arcane'],
  }),
  defineSkill({
    id: 'corrupt-nova',
    name: 'Nova Corrompida',
    description: 'Explosão arcana que corrói todos os inimigos.',
    targeting: { side: 'enemy', shape: 'all' },
    costMp: 12,
    effects: [
      { type: 'damage', element: 'arcane', power: 12, scaling: [{ stat: 'mag', coeff: 0.9 }] },
      { type: 'applyStatus', statusId: 'corrupted', chance: 0.6, duration: 3 },
    ],
    tags: ['arcane'],
  }),
  defineSkill({
    id: 'firebolt',
    name: 'Dardo de Fogo',
    description: 'Um dardo flamejante com chance de queimar.',
    targeting: { side: 'enemy', shape: 'single' },
    costMp: 5,
    effects: [
      { type: 'damage', element: 'fire', power: 14, scaling: [{ stat: 'mag', coeff: 1.1 }] },
      { type: 'applyStatus', statusId: 'burning', chance: 0.5, duration: 3 },
    ],
    tags: ['fire'],
  }),
  // ── Warden / suporte ──
  defineSkill({
    id: 'mend',
    name: 'Remendar',
    description: 'Cura um aliado ferido.',
    targeting: { side: 'ally', shape: 'single' },
    costMp: 5,
    effects: [{ type: 'heal', power: 30, scaling: [{ stat: 'mag', coeff: 1.0 }] }],
    tags: ['heal'],
  }),
  defineSkill({
    id: 'wardens-hymn',
    name: 'Hino do Vigia',
    description: 'Protege todos os aliados (DEF/RES +).',
    targeting: { side: 'ally', shape: 'all' },
    costMp: 8,
    effects: [{ type: 'applyStatus', statusId: 'guarded', duration: 3 }],
    tags: ['support'],
  }),
  defineSkill({
    id: 'cleansing-light',
    name: 'Luz Purificadora',
    description: 'Remove debuffs e regenera um aliado.',
    targeting: { side: 'ally', shape: 'single' },
    costMp: 7,
    effects: [
      { type: 'cleanse', kinds: ['debuff', 'dot', 'control'] },
      { type: 'applyStatus', statusId: 'regen', duration: 3 },
    ],
    tags: ['heal', 'support'],
  }),
  // ── Scavenger / ágil ──
  defineSkill({
    id: 'venom-cut',
    name: 'Corte Peçonhento',
    description: 'Golpe rápido que envenena.',
    targeting: { side: 'enemy', shape: 'single' },
    costMp: 4,
    effects: [
      { type: 'damage', element: 'physical', power: 10, scaling: [{ stat: 'atk', coeff: 0.9 }] },
      { type: 'applyStatus', statusId: 'poisoned', chance: 0.75, duration: 4 },
    ],
    tags: ['physical'],
  }),

  // ── Skills de inimigos ──
  defineSkill({
    id: 'enemy-claw',
    name: 'Garras',
    description: 'Ataque bestial.',
    targeting: { side: 'enemy', shape: 'single' },
    effects: [{ type: 'damage', element: 'physical', power: 8, scaling: [{ stat: 'atk', coeff: 1.0 }] }],
  }),
  defineSkill({
    id: 'enemy-ember-breath',
    name: 'Sopro de Brasa',
    description: 'Baforada de fogo em toda a party.',
    targeting: { side: 'enemy', shape: 'all' },
    effects: [{ type: 'damage', element: 'fire', power: 9, scaling: [{ stat: 'mag', coeff: 0.8 }] }],
  }),
  defineSkill({
    id: 'enemy-corrupt-touch',
    name: 'Toque Corruptor',
    description: 'Corrói um alvo com Aura instável.',
    targeting: { side: 'enemy', shape: 'single' },
    effects: [
      { type: 'damage', element: 'aura', power: 10, scaling: [{ stat: 'mag', coeff: 1.0 }] },
      { type: 'applyStatus', statusId: 'corrupted', chance: 0.7, duration: 3 },
    ],
  }),
  defineSkill({
    id: 'enemy-spore-burst',
    name: 'Explosão de Esporos',
    description: 'Nuvem tóxica sobre a party.',
    targeting: { side: 'enemy', shape: 'all' },
    effects: [{ type: 'applyStatus', statusId: 'poisoned', chance: 0.6, duration: 3 }],
  }),
  defineSkill({
    id: 'enemy-slam',
    name: 'Esmagar',
    description: 'Impacto pesado de construto.',
    targeting: { side: 'enemy', shape: 'single' },
    effects: [
      { type: 'damage', element: 'physical', power: 14, scaling: [{ stat: 'atk', coeff: 1.1 }] },
      { type: 'applyStatus', statusId: 'stunned', chance: 0.3, duration: 1 },
    ],
  }),
  defineSkill({
    id: 'boss-aura-cataclysm',
    name: 'Cataclismo de Aura',
    description: 'A Fenda ruge — dano arcano massivo em todos.',
    targeting: { side: 'enemy', shape: 'all' },
    effects: [
      { type: 'damage', element: 'aura', power: 16, scaling: [{ stat: 'mag', coeff: 1.0 }] },
      { type: 'applyStatus', statusId: 'corrupted', chance: 0.8, duration: 3 },
    ],
  }),
];
