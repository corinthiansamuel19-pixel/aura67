import Phaser from 'phaser';

/*
 * Humanos desenhados por código (PROVISÓRIO — trocável por pixel art real).
 * Figura articulada (cabeça, cabelo, rosto, tronco, braços, pernas, botas) com
 * 3 frames por direção para caminhada, paletas por papel (herói/NPCs) e armas
 * na mão por categoria.
 */
const W = 20;
const H = 30;

export interface Palette {
  skin: number;
  skin2: number;
  hair: number;
  hair2: number;
  tunic: number;
  tunic2: number;
}

const HERO: Palette = {
  skin: 0xe6b88a,
  skin2: 0xcf9a6b,
  hair: 0x5a3b22,
  hair2: 0x744f2e,
  tunic: 0x3f7d54,
  tunic2: 0x2e5e40,
};
const BELT = 0x5a3d24;
const PANTS = 0x35507a;
const BOOT = 0x2a2320;
const OUT = 0x14101a;

const NPC_PALETTES: Record<string, Palette> = {
  villager: { skin: 0xe0b184, skin2: 0xc79666, hair: 0x3a2a1a, hair2: 0x4d3a26, tunic: 0x8a6a3f, tunic2: 0x6b5030 },
  guard: { skin: 0xe0b184, skin2: 0xc79666, hair: 0x2a2a2e, hair2: 0x3a3a40, tunic: 0x6a7280, tunic2: 0x515863 },
  merchant: { skin: 0xe6b88a, skin2: 0xcf9a6b, hair: 0x9a9aa0, hair2: 0xb4b4ba, tunic: 0x6b4a8a, tunic2: 0x513670 },
  elder: { skin: 0xdcae80, skin2: 0xc39562, hair: 0xd8d8d8, hair2: 0xf0f0f0, tunic: 0x33507a, tunic2: 0x263c5c },
  knight: { skin: 0xe0b184, skin2: 0xc79666, hair: 0x4a3a2a, hair2: 0x5e4a34, tunic: 0x8a9098, tunic2: 0x6b7078 },
};

type Dir = 'down' | 'up' | 'side';

function px(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, c: number): void {
  g.fillStyle(c, 1);
  g.fillRect(x, y, w, h);
}

function legs(g: Phaser.GameObjects.Graphics, dir: Dir, frame: number, pal: Palette): void {
  const a = frame === 1 ? 1 : 0;
  const b = frame === 2 ? 1 : 0;
  if (dir === 'side') {
    const front = frame === 1 ? 2 : frame === 2 ? -1 : 0;
    px(g, 8 + front, 21, 4, 6, PANTS);
    px(g, 8 + front, 26, 4, 3, BOOT);
    px(g, 9 - front, 21, 4, 6, pal.tunic2);
    px(g, 9 - front, 26, 4, 3, BOOT);
  } else {
    px(g, 7, 21 + a, 3, 6 - a, PANTS);
    px(g, 7, 26 + a, 3, 3, BOOT);
    px(g, 11, 21 + b, 3, 6 - b, PANTS);
    px(g, 11, 26 + b, 3, 3, BOOT);
  }
}

function drawHuman(g: Phaser.GameObjects.Graphics, dir: Dir, frame: number, pal: Palette): void {
  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(W / 2, H - 1, 14, 4);
  legs(g, dir, frame, pal);

  if (dir === 'side') {
    px(g, 7, 12, 6, 10, pal.tunic);
    px(g, 7, 12, 6, 2, pal.tunic2);
    px(g, 7, 20, 6, 2, BELT);
    const arm = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    px(g, 10, 13, 3, 7, pal.skin);
    px(g, 10 + arm, 19, 3, 2, pal.skin);
    px(g, 8, 4, 6, 8, pal.skin);
    px(g, 13, 7, 1, 3, pal.skin2);
    px(g, 7, 2, 6, 4, pal.hair);
    px(g, 7, 5, 2, 5, pal.hair);
    px(g, 11, 6, 1, 1, OUT);
  } else if (dir === 'up') {
    px(g, 4, 13, 3, 8, pal.skin);
    px(g, 13, 13, 3, 8, pal.skin);
    px(g, 5, 12, 10, 10, pal.tunic);
    px(g, 5, 12, 10, 2, pal.tunic2);
    px(g, 5, 20, 10, 2, BELT);
    px(g, 6, 3, 8, 9, pal.hair);
    px(g, 7, 2, 6, 2, pal.hair2);
  } else {
    px(g, 4, 13, 3, 8, pal.skin);
    px(g, 13, 13, 3, 8, pal.skin);
    px(g, 4, 20, 3, 2, pal.skin);
    px(g, 13, 20, 3, 2, pal.skin);
    px(g, 5, 12, 10, 10, pal.tunic);
    px(g, 5, 12, 10, 2, pal.tunic2);
    px(g, 5, 20, 10, 2, BELT);
    px(g, 9, 21, 2, 1, 0xcaa54a);
    px(g, 7, 5, 6, 8, pal.skin);
    px(g, 6, 3, 8, 4, pal.hair);
    px(g, 6, 5, 2, 4, pal.hair);
    px(g, 12, 5, 2, 4, pal.hair);
    px(g, 8, 8, 1, 2, OUT);
    px(g, 11, 8, 1, 2, OUT);
    px(g, 9, 11, 2, 1, pal.skin2);
  }
}

const DIRS: Dir[] = ['down', 'up', 'side'];

export function generateHeroTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  for (const dir of DIRS) {
    for (let f = 0; f < 3; f++) {
      g.clear();
      drawHuman(g, dir, f, HERO);
      g.generateTexture(`hero-${dir}-${f}`, W, H);
    }
  }
  g.destroy();
}

export function generateNpcTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  for (const [role, pal] of Object.entries(NPC_PALETTES)) {
    g.clear();
    drawHuman(g, 'down', 0, pal);
    g.generateTexture(`npc-${role}`, W, H);
  }
  g.destroy();
}

export function registerHeroAnims(scene: Phaser.Scene): void {
  const mk = (dir: Dir): void => {
    const key = `hero-walk-${dir}`;
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: [{ key: `hero-${dir}-1` }, { key: `hero-${dir}-0` }, { key: `hero-${dir}-2` }, { key: `hero-${dir}-0` }],
      frameRate: 8,
      repeat: -1,
    });
  };
  DIRS.forEach(mk);
}

export function heroIdleTexture(dir: Dir): string {
  return `hero-${dir}-0`;
}

export function npcTexture(role: string): string {
  return NPC_PALETTES[role] ? `npc-${role}` : 'npc-villager';
}

/* ── Armas ── */
export type WeaponViz = 'sword' | 'axe' | 'spear' | 'bow' | 'dagger' | 'staff' | 'mace';

function drawWeapon(g: Phaser.GameObjects.Graphics, viz: WeaponViz): void {
  switch (viz) {
    case 'sword':
      px(g, 5, 1, 2, 14, 0xd7dde6);
      px(g, 5, 1, 1, 14, 0xf2f5fa);
      px(g, 3, 14, 6, 2, 0xcaa54a);
      px(g, 5, 16, 2, 4, 0x6b4a2b);
      break;
    case 'dagger':
      px(g, 5, 4, 2, 9, 0xd7dde6);
      px(g, 4, 13, 4, 1, 0xcaa54a);
      px(g, 5, 14, 2, 3, 0x6b4a2b);
      break;
    case 'axe':
      px(g, 6, 2, 2, 18, 0x6b4a2b);
      px(g, 2, 2, 6, 6, 0xbfc6d0);
      px(g, 2, 2, 6, 2, 0xe4e9f0);
      break;
    case 'mace':
      px(g, 6, 6, 2, 14, 0x6b4a2b);
      g.fillStyle(0x9aa0aa, 1);
      g.fillCircle(7, 5, 4);
      break;
    case 'spear':
      px(g, 6, 4, 2, 20, 0x6b4a2b);
      px(g, 5, 0, 4, 5, 0xd7dde6);
      break;
    case 'bow':
      g.lineStyle(2, 0x7a5230, 1);
      g.beginPath();
      g.arc(4, 11, 9, -1.1, 1.1);
      g.strokePath();
      px(g, 12, 2, 1, 18, 0xe4e9f0);
      break;
    case 'staff':
      px(g, 6, 5, 2, 18, 0x7a5230);
      g.fillStyle(0x5fd3c4, 1);
      g.fillCircle(7, 4, 4);
      g.fillStyle(0xbff4ec, 1);
      g.fillCircle(6, 3, 1.5);
      break;
  }
}

const VIZ: WeaponViz[] = ['sword', 'axe', 'spear', 'bow', 'dagger', 'staff', 'mace'];

export function generateWeaponTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  for (const viz of VIZ) {
    g.clear();
    drawWeapon(g, viz);
    g.generateTexture(`weapon-${viz}`, 14, 24);
  }
  g.destroy();
}

export function weaponTexture(viz: string): string {
  return (VIZ as readonly string[]).includes(viz) ? `weapon-${viz}` : 'weapon-sword';
}
