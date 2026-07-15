import Phaser from 'phaser';

export const TILE_SIZE = 32;

/*
 * Tiles desenhados por código (PROVISÓRIO — trocável por um tileset de pixel art
 * real depois). Cada tile tem uma função de desenho com detalhes + leve
 * iluminação (destaque no topo, sombra embaixo). `walkable` define colisão.
 */
type Draw = (g: Phaser.GameObjects.Graphics) => void;
const S = TILE_SIZE;

function rect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, c: number, a = 1): void {
  g.fillStyle(c, a);
  g.fillRect(x, y, w, h);
}

// base com granulado determinístico + luz/sombra
function ground(g: Phaser.GameObjects.Graphics, base: number, spec: number, dark: number): void {
  rect(g, 0, 0, S, S, base);
  for (let y = 2; y < S; y += 5) {
    for (let x = (y % 10) - 2; x < S; x += 7) {
      rect(g, x, y, 2, 2, spec, 0.5);
    }
  }
  rect(g, 0, 0, S, 2, spec, 0.35);
  rect(g, 0, S - 2, S, 2, dark, 0.4);
}

const TREE_TOP = 0x3f7d43;
const TREE_MID = 0x2f6234;
const TRUNK = 0x5a3a23;

const TILES: Record<string, { walkable: boolean; draw: Draw }> = {
  // ── solos andáveis ──
  '.': { walkable: true, draw: (g) => ground(g, 0x5a8a4a, 0x6fa35c, 0x3f6636) }, // grama padrão
  g: { walkable: true, draw: (g) => ground(g, 0x5a8a4a, 0x6fa35c, 0x3f6636) },
  G: {
    walkable: true,
    draw: (g) => {
      ground(g, 0x5a8a4a, 0x6fa35c, 0x3f6636);
      rect(g, 7, 9, 2, 2, 0xffd94a); // flores
      rect(g, 8, 8, 1, 1, 0xfff2a8);
      rect(g, 20, 18, 2, 2, 0xff7ab0);
      rect(g, 21, 17, 1, 1, 0xffd0e6);
      rect(g, 14, 24, 2, 2, 0xffd94a);
    },
  },
  ',': { walkable: true, draw: (g) => ground(g, 0x4f7f42, 0x63985a, 0x395c33) },
  p: {
    walkable: true,
    draw: (g) => {
      ground(g, 0x9a7b4f, 0xb08e5e, 0x745c3a);
      rect(g, 6, 10, 3, 2, 0x745c3a, 0.6);
      rect(g, 18, 20, 3, 2, 0x745c3a, 0.6);
    },
  },
  s: {
    walkable: true,
    draw: (g) => {
      ground(g, 0xd8c58a, 0xe6d6a2, 0xb9a56d);
      rect(g, 10, 14, 2, 2, 0xb9a56d, 0.7);
    },
  },
  c: { walkable: true, draw: (g) => ground(g, 0x3b3542, 0x4a4453, 0x2a2531) }, // caverna
  '=': {
    walkable: true,
    draw: (g) => {
      rect(g, 0, 0, S, S, 0x53585f);
      rect(g, 1, 1, S - 2, S - 2, 0x5c626a);
      rect(g, 0, 0, S, 2, 0x6b7178, 0.6);
      rect(g, 0, S - 3, S, 3, 0x3d4147, 0.6);
      rect(g, S / 2, 0, 1, S, 0x40444a, 0.5);
      rect(g, 0, S / 2, S, 1, 0x40444a, 0.5);
    },
  },
  b: {
    walkable: true,
    draw: (g) => {
      rect(g, 0, 0, S, S, 0x7a5230);
      for (let x = 0; x < S; x += 8) rect(g, x, 0, 1, S, 0x5c3d22);
      rect(g, 0, 0, S, 2, 0x93663d, 0.7);
    },
  },
  '~': {
    walkable: true,
    draw: (g) => {
      rect(g, 0, 0, S, S, 0x2f7d86);
      rect(g, 2, 6, 10, 2, 0x66c6cf, 0.7);
      rect(g, 16, 16, 12, 2, 0x66c6cf, 0.6);
      rect(g, 6, 22, 8, 2, 0x8fe3ea, 0.5);
    },
  },
  // ── bloqueios ──
  '#': {
    walkable: false,
    draw: (g) => {
      rect(g, 0, 0, S, S, 0x4a505a);
      rect(g, 1, 1, S - 2, 12, 0x5a616c);
      rect(g, 1, 15, 14, 12, 0x545b66);
      rect(g, 17, 15, 14, 12, 0x545b66);
      rect(g, 0, 0, S, 2, 0x6b7480, 0.7);
      rect(g, 0, S - 3, S, 3, 0x353a42, 0.7);
    },
  },
  H: {
    walkable: false,
    draw: (g) => {
      rect(g, 0, 0, S, S, 0xb98a5a);
      for (let y = 2; y < S; y += 8) rect(g, 0, y, S, 1, 0x8f6a42);
      for (let x = 4; x < S; x += 10) rect(g, x, 0, 1, S, 0x8f6a42, 0.6);
      rect(g, 0, 0, S, 2, 0xcfa06c, 0.7);
    },
  },
  O: {
    walkable: false,
    draw: (g) => {
      rect(g, 0, 0, S, S, 0x9c3b34);
      for (let y = 0; y < S; y += 6) rect(g, 0, y, S, 1, 0x7d2b26);
      rect(g, 0, 0, S, 3, 0xbe5049, 0.7);
    },
  },
  T: {
    walkable: false,
    draw: (g) => {
      ground(g, 0x4f7f42, 0x63985a, 0x395c33);
      rect(g, 14, 18, 4, 10, TRUNK);
      g.fillStyle(TREE_MID, 1);
      g.fillCircle(16, 12, 12);
      g.fillStyle(TREE_TOP, 1);
      g.fillCircle(13, 9, 8);
      g.fillCircle(20, 11, 7);
      g.fillStyle(0x5fae5a, 0.8);
      g.fillCircle(12, 7, 3);
    },
  },
  t: {
    walkable: false,
    draw: (g) => {
      ground(g, 0x4f7f42, 0x63985a, 0x395c33);
      g.fillStyle(TREE_MID, 1);
      g.fillCircle(16, 20, 9);
      g.fillStyle(TREE_TOP, 1);
      g.fillCircle(13, 18, 5);
      g.fillCircle(20, 19, 4);
    },
  },
  R: {
    walkable: false,
    draw: (g) => {
      ground(g, 0x5a8a4a, 0x6fa35c, 0x3f6636);
      g.fillStyle(0x8a8f98, 1);
      g.fillCircle(16, 18, 11);
      g.fillStyle(0xa2a7b0, 1);
      g.fillCircle(13, 15, 6);
      rect(g, 6, 24, 20, 3, 0x5c616a, 0.6);
    },
  },
  M: {
    walkable: false,
    draw: (g) => {
      rect(g, 0, 0, S, S, 0x6a6f78);
      g.fillStyle(0x7b808a, 1);
      g.fillTriangle(0, S, S / 2, 4, S, S);
      g.fillStyle(0xe8edf2, 1);
      g.fillTriangle(S / 2 - 6, 12, S / 2, 4, S / 2 + 6, 12);
      rect(g, 0, S - 3, S, 3, 0x4d525a, 0.6);
    },
  },
  W: {
    walkable: false,
    draw: (g) => {
      rect(g, 0, 0, S, S, 0x1f5c8c);
      rect(g, 0, 0, S, S / 2, 0x246aa0, 0.5);
      rect(g, 3, 8, 12, 2, 0x5aa6d6, 0.7);
      rect(g, 16, 18, 12, 2, 0x5aa6d6, 0.6);
    },
  },
  x: {
    walkable: false,
    draw: (g) => {
      ground(g, 0x5a8a4a, 0x6fa35c, 0x3f6636);
      rect(g, 4, 8, 3, 18, 0x8a6a42);
      rect(g, 25, 8, 3, 18, 0x8a6a42);
      rect(g, 2, 12, 28, 3, 0x9c7a4e);
      rect(g, 2, 20, 28, 3, 0x9c7a4e);
    },
  },
};

export function tileDef(ch: string): { walkable: boolean; draw: Draw } {
  return TILES[ch] ?? TILES['#']!;
}

export function tileAt(tiles: readonly string[], x: number, y: number): string {
  const row = tiles[y];
  const ch = row ? row[x] : undefined;
  return ch && TILES[ch] ? ch : '#';
}

export function isWalkable(tiles: readonly string[], x: number, y: number): boolean {
  return tileDef(tileAt(tiles, x, y)).walkable;
}

// ── silhuetas de inimigos (mantidas, tintáveis) ──
const SHAPES = ['humanoid', 'beast', 'construct', 'spectre', 'swarm', 'colossus'] as const;
export type ShapeKey = (typeof SHAPES)[number];

function drawShape(g: Phaser.GameObjects.Graphics, shape: ShapeKey, s: number): void {
  const c = s / 2;
  g.fillStyle(0xffffff, 1);
  switch (shape) {
    case 'humanoid':
      g.fillRoundedRect(s * 0.3, s * 0.16, s * 0.4, s * 0.68, 5);
      g.fillCircle(c, s * 0.22, s * 0.16);
      break;
    case 'beast':
      g.fillEllipse(c, s * 0.62, s * 0.7, s * 0.5);
      g.fillTriangle(s * 0.15, s * 0.5, s * 0.4, s * 0.2, s * 0.5, s * 0.55);
      break;
    case 'construct':
      g.fillRect(s * 0.2, s * 0.2, s * 0.6, s * 0.6);
      g.fillStyle(0x000000, 0.3);
      g.fillRect(s * 0.36, s * 0.36, s * 0.28, s * 0.28);
      break;
    case 'spectre':
      g.fillTriangle(c, s * 0.08, s * 0.85, c, s * 0.16, s * 0.9);
      g.fillTriangle(c, s * 0.92, s * 0.16, s * 0.14, s * 0.85, c);
      break;
    case 'swarm':
      g.fillCircle(s * 0.35, s * 0.4, s * 0.15);
      g.fillCircle(s * 0.65, s * 0.36, s * 0.13);
      g.fillCircle(s * 0.5, s * 0.66, s * 0.17);
      break;
    case 'colossus':
      g.fillRoundedRect(s * 0.12, s * 0.2, s * 0.76, s * 0.7, 10);
      g.fillTriangle(s * 0.2, s * 0.24, s * 0.8, s * 0.24, c, s * 0.02);
      break;
  }
}

/** Gera texturas de tiles + silhuetas de inimigos + disco. Chamado no Preload. */
export function generateTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  for (const [ch, def] of Object.entries(TILES)) {
    g.clear();
    def.draw(g);
    g.generateTexture(`tile-${ch === '.' ? 'dot' : ch}`, S, S);
  }
  for (const shape of SHAPES) {
    const size = shape === 'colossus' ? 96 : 48;
    g.clear();
    drawShape(g, shape, size);
    g.generateTexture(`shape-${shape}`, size, size);
  }
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(8, 8, 8);
  g.generateTexture('disc', 16, 16);
  g.destroy();
}

export function tileTextureKey(ch: string): string {
  return `tile-${ch === '.' ? 'dot' : ch}`;
}

export function shapeTexture(shape: string): string {
  return (SHAPES as readonly string[]).includes(shape) ? `shape-${shape}` : 'shape-humanoid';
}
