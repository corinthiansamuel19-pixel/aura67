import Phaser from 'phaser';
import { hex } from '@/ui/theme';

export const TILE_SIZE = 32;

/** Definição de tile: char do mapa -> cor + se bloqueia passagem. */
export const TILES: Record<string, { color: string; accent: string; walkable: boolean }> = {
  '.': { color: '#1d2430', accent: '#232c3a', walkable: true },
  ',': { color: '#20301f', accent: '#2a3d28', walkable: true },
  '=': { color: '#2b2b30', accent: '#3a3a42', walkable: true },
  '~': { color: '#12313a', accent: '#1c5563', walkable: true },
  '#': { color: '#39414d', accent: '#4a5462', walkable: false },
  T: { color: '#20361f', accent: '#3f6b3a', walkable: false },
  W: { color: '#123044', accent: '#1c4a68', walkable: false },
};

export function tileAt(tiles: readonly string[], x: number, y: number): string {
  const row = tiles[y];
  const ch = row ? row[x] : undefined;
  return ch && TILES[ch] ? ch : '#';
}

export function isWalkable(tiles: readonly string[], x: number, y: number): boolean {
  return TILES[tileAt(tiles, x, y)]?.walkable ?? false;
}

const SHAPES = ['humanoid', 'beast', 'construct', 'spectre', 'swarm', 'colossus', 'hero'] as const;
export type ShapeKey = (typeof SHAPES)[number];

function drawTile(g: Phaser.GameObjects.Graphics, def: { color: string; accent: string }): void {
  g.fillStyle(hex(def.color), 1);
  g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  g.fillStyle(hex(def.accent), 1);
  g.fillRect(1, 1, TILE_SIZE - 2, 2);
  g.fillRect(1, 1, 2, TILE_SIZE - 2);
  g.lineStyle(1, 0x000000, 0.25);
  g.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
}

function drawShape(g: Phaser.GameObjects.Graphics, shape: ShapeKey, s: number): void {
  const c = s / 2;
  g.fillStyle(0xffffff, 1);
  switch (shape) {
    case 'hero':
      g.fillRoundedRect(s * 0.28, s * 0.12, s * 0.44, s * 0.76, 6);
      g.fillCircle(c, s * 0.2, s * 0.16);
      break;
    case 'humanoid':
      g.fillRoundedRect(s * 0.3, s * 0.18, s * 0.4, s * 0.66, 5);
      g.fillCircle(c, s * 0.24, s * 0.15);
      break;
    case 'beast':
      g.fillTriangle(s * 0.1, s * 0.85, s * 0.9, s * 0.85, c, s * 0.2);
      break;
    case 'construct':
      g.fillRect(s * 0.2, s * 0.2, s * 0.6, s * 0.6);
      g.fillStyle(0x000000, 0.25);
      g.fillRect(s * 0.35, s * 0.35, s * 0.3, s * 0.3);
      break;
    case 'spectre':
      g.fillTriangle(c, s * 0.1, s * 0.85, c, s * 0.15, s * 0.9);
      g.fillTriangle(c, s * 0.9, s * 0.15, s * 0.15, s * 0.85, c);
      break;
    case 'swarm':
      g.fillCircle(s * 0.35, s * 0.4, s * 0.16);
      g.fillCircle(s * 0.65, s * 0.35, s * 0.14);
      g.fillCircle(s * 0.5, s * 0.65, s * 0.18);
      g.fillCircle(s * 0.3, s * 0.68, s * 0.12);
      break;
    case 'colossus':
      g.fillRoundedRect(s * 0.12, s * 0.2, s * 0.76, s * 0.7, 10);
      g.fillTriangle(s * 0.2, s * 0.24, s * 0.8, s * 0.24, c, s * 0.02);
      break;
  }
}

/** Gera todas as texturas placeholder (chamado uma vez no Preload). */
export function generateTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);

  for (const [ch, def] of Object.entries(TILES)) {
    g.clear();
    drawTile(g, def);
    g.generateTexture(`tile-${ch}`, TILE_SIZE, TILE_SIZE);
  }

  for (const shape of SHAPES) {
    const size = shape === 'colossus' ? 96 : shape === 'hero' ? 40 : 44;
    g.clear();
    drawShape(g, shape, size);
    g.generateTexture(`shape-${shape}`, size, size);
  }

  // partícula circular branca reutilizável (tintável)
  g.clear();
  g.fillStyle(0xffffff, 1);
  g.fillCircle(8, 8, 8);
  g.generateTexture('disc', 16, 16);

  g.destroy();
}

export function shapeTexture(shape: string): string {
  return (SHAPES as readonly string[]).includes(shape) ? `shape-${shape}` : 'shape-humanoid';
}
