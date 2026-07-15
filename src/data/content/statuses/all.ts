import { defineStatus } from '@/data/schemas';

/** Efeitos de estado (buffs, debuffs, DoT, controle). */
export default [
  defineStatus({
    id: 'burning',
    name: 'Queimando',
    kind: 'dot',
    color: '#ff7a3d',
    stackable: true,
    maxStacks: 5,
    tickEffects: [{ type: 'damage', element: 'fire', power: 6, canCrit: false }],
  }),
  defineStatus({
    id: 'poisoned',
    name: 'Envenenado',
    kind: 'dot',
    color: '#8ad152',
    stackable: true,
    maxStacks: 5,
    tickEffects: [{ type: 'damage', element: 'toxin', power: 5, canCrit: false }],
  }),
  defineStatus({
    id: 'corrupted',
    name: 'Corrompido',
    kind: 'dot',
    color: '#9a6bff',
    stackable: true,
    maxStacks: 3,
    statMods: { res: -6 },
    tickEffects: [{ type: 'damage', element: 'aura', power: 7, canCrit: false }],
  }),
  defineStatus({
    id: 'stunned',
    name: 'Atordoado',
    kind: 'control',
    color: '#ffd35f',
    blocks: ['action'],
  }),
  defineStatus({
    id: 'slowed',
    name: 'Lento',
    kind: 'debuff',
    color: '#6b8ba4',
    statMods: { spd: -8, evasion: -0.05 },
  }),
  defineStatus({
    id: 'guarded',
    name: 'Protegido',
    kind: 'buff',
    color: '#5fd3c4',
    statMods: { def: 8, res: 6 },
  }),
  defineStatus({
    id: 'enraged',
    name: 'Enfurecido',
    kind: 'buff',
    color: '#ff5f5f',
    statMods: { atk: 8, mag: 6 },
  }),
  defineStatus({
    id: 'regen',
    name: 'Regeneração',
    kind: 'hot',
    color: '#8fe0a0',
    tickEffects: [{ type: 'heal', power: 10 }],
  }),
];
