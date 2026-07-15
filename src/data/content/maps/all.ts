import { defineMap } from '@/data/schemas';

/*
 * Mapas em grade. Os tiles são gerados deterministicamente aqui (sem RNG), então
 * o layout é dado versionado e estável. Chars: '#'/'T'/'W' bloqueiam; '.'/','/'='/'~' andáveis.
 * As células de spawn/portal são normalizadas para andáveis pela WorldScene.
 */
type Interior = (x: number, y: number) => string;

function build(width: number, height: number, interior: Interior): string[] {
  const rows: string[] = [];
  for (let y = 0; y < height; y++) {
    let row = '';
    for (let x = 0; x < width; x++) {
      row += x === 0 || y === 0 || x === width - 1 || y === height - 1 ? '#' : interior(x, y);
    }
    rows.push(row);
  }
  return rows;
}

const h = (x: number, y: number): number => Math.abs((x * 73856093) ^ (y * 19349663));

export default [
  defineMap({
    id: 'relicario',
    name: 'Relicário em Ruínas',
    width: 22,
    height: 14,
    tiles: build(22, 14, (x, y) => {
      if (h(x, y) % 13 === 0) return '=';
      if (h(x, y) % 29 === 0) return '~';
      return '.';
    }),
    spawns: { start: [3, 3], 'from-ermo': [18, 10] },
    portals: [{ at: [19, 11], toMap: 'ermo-cinzento', toSpawn: 'from-relicario' }],
    npcs: [
      {
        id: 'dying-knight',
        name: 'Cavaleiro Moribundo',
        at: [6, 3],
        dialogueId: 'dying-knight',
        color: '#b6beca',
      },
    ],
    bgColor: '#14100f',
    music: 'ruins',
  }),

  defineMap({
    id: 'ermo-cinzento',
    name: 'Ermo Cinzento',
    width: 28,
    height: 18,
    tiles: build(28, 18, (x, y) => {
      if (h(x, y) % 11 === 0) return 'T';
      if (h(x + 1, y) % 17 === 0) return '=';
      if (h(x, y + 2) % 31 === 0) return '~';
      if (h(x * 2, y) % 7 === 0) return ',';
      return '.';
    }),
    spawns: { 'from-relicario': [2, 14], 'from-fortim': [25, 3], 'from-fenda': [14, 15] },
    portals: [
      { at: [1, 14], toMap: 'relicario', toSpawn: 'from-ermo' },
      { at: [26, 3], toMap: 'fortim-cinza', toSpawn: 'from-ermo' },
      { at: [14, 16], toMap: 'fenda-borda', toSpawn: 'from-ermo' },
    ],
    npcs: [
      {
        id: 'warden-sentry',
        name: 'Sentinela Vigia',
        at: [10, 8],
        dialogueId: 'warden-sentry',
        color: '#8fe0a0',
      },
    ],
    encounter: {
      rate: 0.1,
      groups: [
        { enemies: ['scrap-hound'], weight: 3 },
        { enemies: ['scrap-hound', 'scrap-hound'], weight: 2 },
        { enemies: ['ash-bandit'], weight: 2 },
        { enemies: ['rot-swarm', 'scrap-hound'], weight: 1 },
      ],
    },
    bgColor: '#12140f',
    music: 'wilds',
  }),

  defineMap({
    id: 'fortim-cinza',
    name: 'Fortim Cinza',
    width: 24,
    height: 16,
    tiles: build(24, 16, (x, y) => {
      // pátio central de pedra
      if (x > 6 && x < 17 && y > 5 && y < 11) return '=';
      if (h(x, y) % 19 === 0) return ',';
      return '.';
    }),
    spawns: { 'from-ermo': [2, 8], start: [4, 8] },
    portals: [{ at: [1, 8], toMap: 'ermo-cinzento', toSpawn: 'from-fortim' }],
    npcs: [
      {
        id: 'elder-veil',
        name: 'Anciã Véu',
        at: [11, 4],
        dialogueId: 'elder-veil',
        color: '#e8d9a0',
      },
      {
        id: 'merchant-ovid',
        name: 'Mercador Óvido',
        at: [17, 9],
        dialogueId: 'merchant-ovid',
        color: '#d9a24b',
      },
      {
        id: 'captain-brand',
        name: 'Capitão Brand',
        at: [8, 12],
        dialogueId: 'captain-brand',
        color: '#b6beca',
      },
    ],
    bgColor: '#141414',
    music: 'town',
  }),

  defineMap({
    id: 'fenda-borda',
    name: 'Borda da Fenda',
    width: 26,
    height: 16,
    tiles: build(26, 16, (x, y) => {
      if (h(x, y) % 7 === 0) return '~';
      if (h(x, y + 1) % 13 === 0) return '=';
      if (h(x + 3, y) % 23 === 0) return 'T';
      return '.';
    }),
    spawns: { 'from-ermo': [2, 8] },
    portals: [{ at: [1, 8], toMap: 'ermo-cinzento', toSpawn: 'from-fenda' }],
    npcs: [
      {
        id: 'fenda-presence',
        name: 'A Presença da Fenda',
        at: [20, 8],
        dialogueId: 'fenda-presence',
        color: '#c07bff',
      },
    ],
    encounter: {
      rate: 0.12,
      groups: [
        { enemies: ['corrupted-wretch'], weight: 3 },
        { enemies: ['aura-echo'], weight: 2 },
        { enemies: ['corroded-sentinel'], weight: 2 },
        { enemies: ['corrupted-wretch', 'aura-echo'], weight: 1 },
      ],
    },
    bgColor: '#160f1c',
    music: 'fenda',
  }),
];
