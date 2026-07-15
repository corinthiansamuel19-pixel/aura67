import { defineMap } from '@/data/schemas';

/*
 * Mapas em grade, gerados deterministicamente (dado versionado, sem RNG).
 * Tiles: '#' parede, 'H' casa, 'O' telhado, 'T' árvore, 't' arbusto, 'R' rocha,
 * 'M' montanha, 'W' água funda, 'x' cerca (bloqueiam); '='/'.'/','/'g'/'G'/'p'/
 * 's'/'c'/'b'/'~' andáveis. Células de spawn/portal são normalizadas p/ andáveis.
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
const box = (x: number, y: number, x0: number, y0: number, x1: number, y1: number): boolean =>
  x >= x0 && x <= x1 && y >= y0 && y <= y1;

export default [
  // ── Relicário: ruína de pedra com poças de Aura ──
  defineMap({
    id: 'relicario',
    name: 'Relicário em Ruínas',
    width: 22,
    height: 14,
    tiles: build(22, 14, (x, y) => {
      if ((x === 6 || x === 15) && (y === 5 || y === 9)) return '#'; // colunas
      if (h(x, y) % 17 === 0) return '~';
      if (h(x, y) % 23 === 0) return 'R';
      return '=';
    }),
    spawns: { start: [3, 3], 'from-ermo': [18, 10] },
    portals: [{ at: [19, 11], toMap: 'ermo-cinzento', toSpawn: 'from-relicario' }],
    npcs: [
      { id: 'dying-knight', name: 'Cavaleiro Moribundo', at: [6, 3], dialogueId: 'dying-knight', sprite: 'knight' },
    ],
    bgColor: '#14100f',
    music: 'ruins',
  }),

  // ── Ermo Cinzento: campos, lago, trilha, árvores ──
  defineMap({
    id: 'ermo-cinzento',
    name: 'Ermo Cinzento',
    width: 28,
    height: 18,
    tiles: build(28, 18, (x, y) => {
      if (box(x, y, 3, 11, 7, 15)) return 'W'; // lago
      if (box(x, y, 2, 10, 8, 16) && h(x, y) % 3 === 0) return '~';
      if (y === 8 && x > 1 && x < 26) return 'p'; // trilha
      if (h(x, y) % 11 === 0) return 'T';
      if (h(x, y) % 19 === 0) return 't';
      if (h(x, y) % 17 === 0) return 'R';
      if (h(x, y) % 13 === 0) return 'G';
      return 'g';
    }),
    spawns: {
      'from-relicario': [2, 14],
      'from-fortim': [25, 3],
      'from-fenda': [14, 15],
      'from-floresta': [7, 15],
    },
    portals: [
      { at: [1, 14], toMap: 'relicario', toSpawn: 'from-ermo' },
      { at: [26, 3], toMap: 'fortim-cinza', toSpawn: 'from-ermo' },
      { at: [14, 16], toMap: 'fenda-borda', toSpawn: 'from-ermo' },
      { at: [7, 16], toMap: 'floresta-murmura', toSpawn: 'from-ermo' },
    ],
    npcs: [
      { id: 'warden-sentry', name: 'Sentinela Vigia', at: [10, 8], dialogueId: 'warden-sentry', sprite: 'guard' },
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

  // ── Fortim Cinza: vila com casas, cercas e caminhos ──
  defineMap({
    id: 'fortim-cinza',
    name: 'Fortim Cinza',
    width: 24,
    height: 16,
    tiles: build(24, 16, (x, y) => {
      if (box(x, y, 4, 3, 6, 3) || box(x, y, 16, 3, 18, 3) || box(x, y, 4, 11, 6, 11)) return 'O';
      if (box(x, y, 4, 4, 6, 4) || box(x, y, 16, 4, 18, 4) || box(x, y, 4, 12, 6, 12)) return 'H';
      if (y === 8 && x > 1 && x < 23) return 'p'; // rua principal
      if (x === 11 && y > 1 && y < 15) return 'p'; // rua transversal
      if (y === 2 && x > 7 && x < 16) return 'x'; // cerca
      if (h(x, y) % 14 === 0) return 'G';
      if (h(x, y) % 9 === 0) return ',';
      return 'g';
    }),
    spawns: { 'from-ermo': [2, 8], start: [4, 8] },
    portals: [{ at: [1, 8], toMap: 'ermo-cinzento', toSpawn: 'from-fortim' }],
    npcs: [
      { id: 'elder-veil', name: 'Anciã Véu', at: [11, 5], dialogueId: 'elder-veil', sprite: 'elder' },
      { id: 'merchant-ovid', name: 'Mercador Óvido', at: [17, 9], dialogueId: 'merchant-ovid', sprite: 'merchant' },
      { id: 'captain-brand', name: 'Capitão Brand', at: [8, 12], dialogueId: 'captain-brand', sprite: 'guard' },
    ],
    bgColor: '#141414',
    music: 'town',
  }),

  // ── Floresta Múrmura: mata densa, rio e ponte ──
  defineMap({
    id: 'floresta-murmura',
    name: 'Floresta Múrmura',
    width: 28,
    height: 18,
    tiles: build(28, 18, (x, y) => {
      if ((x === 13 || x === 14) && y === 9) return 'b'; // ponte
      if (x === 13 || x === 14) return 'W'; // rio
      if (y === 9 && x > 1 && x < 26) return 'p'; // trilha
      if (h(x, y) % 6 === 0) return 'T';
      if (h(x, y) % 11 === 0) return 't';
      if (h(x, y) % 9 === 0) return 'G';
      if (h(x, y) % 23 === 0) return 'R';
      return 'g';
    }),
    spawns: { 'from-ermo': [2, 9] },
    portals: [{ at: [1, 9], toMap: 'ermo-cinzento', toSpawn: 'from-floresta' }],
    npcs: [
      { id: 'forest-hermit', name: 'Eremita da Mata', at: [22, 9], dialogueId: 'forest-hermit', sprite: 'villager' },
    ],
    encounter: {
      rate: 0.11,
      groups: [
        { enemies: ['scrap-hound', 'scrap-hound'], weight: 3 },
        { enemies: ['rot-swarm'], weight: 2 },
        { enemies: ['ash-bandit', 'scrap-hound'], weight: 2 },
      ],
    },
    bgColor: '#0f160f',
    music: 'wilds',
  }),

  // ── Borda da Fenda: chão rachado, muita Aura, rochas ──
  defineMap({
    id: 'fenda-borda',
    name: 'Borda da Fenda',
    width: 26,
    height: 16,
    tiles: build(26, 16, (x, y) => {
      if (h(x, y) % 5 === 0) return '~';
      if (h(x, y) % 13 === 0) return 'R';
      if (h(x, y + 1) % 19 === 0) return 'M';
      return '=';
    }),
    spawns: { 'from-ermo': [2, 8] },
    portals: [{ at: [1, 8], toMap: 'ermo-cinzento', toSpawn: 'from-fenda' }],
    npcs: [
      { id: 'fenda-presence', name: 'A Presença da Fenda', at: [20, 8], dialogueId: 'fenda-presence', sprite: 'spectre' },
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
