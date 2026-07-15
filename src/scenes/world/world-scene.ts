import Phaser from 'phaser';
import { Maps } from '@/data/registry/content';
import type { GameMap, Npc } from '@/data/schemas';
import type { Facing } from '@/domain/game-state';
import { SeededRng, deriveSeed } from '@core/rng';
import { GameContext } from '@/game/context';
import { TILE_SIZE, isWalkable, shapeTexture, tileTextureKey } from '@/rendering/textures';
import { heroIdleTexture, npcTexture, weaponTexture } from '@/rendering/actor';
import { Items } from '@/data/registry/content';
import { UI, hex } from '@/ui/theme';
import { StatBar } from '@/ui/widgets';
import type { MusicTheme } from '@/systems/audio';

interface WorldData {
  fresh?: boolean;
}

const DIRS: Record<Facing, { dx: number; dy: number }> = {
  down: { dx: 0, dy: 1 },
  up: { dx: 0, dy: -1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export class WorldScene extends Phaser.Scene {
  private ctx!: GameContext;
  private map!: GameMap;
  private tiles: string[] = [];
  private player!: Phaser.GameObjects.Sprite;
  private weapon!: Phaser.GameObjects.Image;
  private npcs: { npc: Npc; sprite: Phaser.GameObjects.Image }[] = [];
  private moving = false;
  private facing: Facing = 'down';
  private busy = false;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyMap: Record<string, Phaser.Input.Keyboard.Key> = {};

  private hud!: Phaser.GameObjects.Container;
  private goldText!: Phaser.GameObjects.Text;
  private questText!: Phaser.GameObjects.Text;
  private partyBars: { hp: StatBar; mp: StatBar; name: Phaser.GameObjects.Text }[] = [];
  private minimapDot?: Phaser.GameObjects.Rectangle;
  private minimapScale = 4;
  private minimapX = 0;
  private minimapY = 0;
  private busOffs: Array<() => void> = [];

  constructor() {
    super('World');
  }

  init(data: WorldData): void {
    this.moving = false;
    this.busy = false;
    void data;
  }

  create(): void {
    this.ctx = GameContext.get(this);
    const loc = this.ctx.store.state.location;
    this.map = Maps.require(loc.mapId);
    this.facing = loc.facing;
    this.cameras.main.setBackgroundColor(this.map.bgColor);

    this.buildTiles();
    this.renderMap();
    this.renderNpcs();
    this.renderPlayer(loc.x, loc.y);
    this.setupCamera();
    this.setupInput();
    this.buildHud();

    this.buildMinimap();
    this.ctx.audio.startMusic((this.map.music as MusicTheme) ?? 'wilds');
    this.ctx.bus.emit('map:entered', { mapId: this.map.id });

    this.busOffs.push(
      this.ctx.bus.on('gold:changed', () => this.refreshHud()),
      this.ctx.bus.on('toast', ({ text, tone }) => this.showToast(text, tone)),
      this.ctx.bus.on('quest:completed', () => this.refreshHud()),
      this.ctx.bus.on('quest:started', () => this.refreshHud()),
      this.ctx.bus.on('quest:stageAdvanced', () => this.refreshHud()),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const off of this.busOffs) off();
      this.busOffs = [];
    });

    this.refreshHud();
  }

  private buildTiles(): void {
    this.tiles = [...this.map.tiles];
    const setWalkable = (x: number, y: number): void => {
      const row = this.tiles[y];
      if (row === undefined) return;
      if (row[x] !== undefined && !isWalkable(this.tiles, x, y)) {
        this.tiles[y] = row.substring(0, x) + '.' + row.substring(x + 1);
      }
    };
    for (const [, coord] of Object.entries(this.map.spawns)) setWalkable(coord[0], coord[1]);
    for (const p of this.map.portals) setWalkable(p.at[0], p.at[1]);
    for (const n of this.map.npcs) setWalkable(n.at[0], n.at[1]);
  }

  private renderMap(): void {
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const ch = this.tiles[y]?.[x] ?? '#';
        this.add.image(x * TILE_SIZE, y * TILE_SIZE, tileTextureKey(ch)).setOrigin(0, 0);
      }
    }
    // marca portais com um brilho de Aura
    for (const p of this.map.portals) {
      this.add
        .image(p.at[0] * TILE_SIZE + TILE_SIZE / 2, p.at[1] * TILE_SIZE + TILE_SIZE / 2, 'disc')
        .setTint(hex(UI.aura))
        .setAlpha(0.5)
        .setScale(1.4);
    }
  }

  private renderNpcs(): void {
    this.npcs = this.map.npcs.map((npc) => {
      const px = npc.at[0] * TILE_SIZE + TILE_SIZE / 2;
      const py = npc.at[1] * TILE_SIZE + TILE_SIZE / 2;
      let sprite: Phaser.GameObjects.Image;
      if (npc.sprite === 'spectre') {
        sprite = this.add
          .image(px, py, shapeTexture('spectre'))
          .setTint(hex(npc.color))
          .setDisplaySize(TILE_SIZE * 0.95, TILE_SIZE * 0.95)
          .setDepth(15);
      } else {
        sprite = this.add
          .image(px, py, npcTexture(npc.sprite))
          .setOrigin(0.5, 0.82)
          .setScale(1.2)
          .setDepth(15);
      }
      this.add
        .text(px, py - TILE_SIZE * 0.95, npc.name, {
          fontFamily: UI.fontMono,
          fontSize: '11px',
          color: UI.gold,
        })
        .setOrigin(0.5)
        .setDepth(15);
      return { npc, sprite };
    });
  }

  private renderPlayer(x: number, y: number): void {
    const px = x * TILE_SIZE + TILE_SIZE / 2;
    const py = y * TILE_SIZE + TILE_SIZE / 2;
    this.player = this.add
      .sprite(px, py, heroIdleTexture('down'))
      .setOrigin(0.5, 0.82)
      .setScale(1.25)
      .setDepth(20);
    this.weapon = this.add.image(px, py, weaponTexture(this.leaderWeaponViz())).setDepth(21).setScale(1);
    this.applyFacing(this.facing);
  }

  private leaderWeaponViz(): string {
    const wId = this.ctx.store.leader().equipment.weapon;
    const item = wId ? Items.get(wId) : undefined;
    return item && item.kind === 'weapon' ? item.viz : 'sword';
  }

  private animDir(): 'down' | 'up' | 'side' {
    return this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
  }

  /** Ajusta textura/flip/arma conforme a direção atual (parado). */
  private applyFacing(dir: Facing): void {
    this.facing = dir;
    const ad = this.animDir();
    this.player.setFlipX(dir === 'left');
    if (!this.player.anims.isPlaying) this.player.setTexture(heroIdleTexture(ad));
    this.positionWeapon();
  }

  private positionWeapon(): void {
    if (!this.weapon) return;
    const p = this.player;
    const oy = -2;
    let ox: number;
    let behind = false;
    if (this.facing === 'down') ox = 9;
    else if (this.facing === 'up') {
      ox = -9;
      behind = true;
    } else if (this.facing === 'right') ox = 10;
    else ox = -10;
    this.weapon.setFlipX(this.facing === 'left');
    this.weapon.setPosition(p.x + ox, p.y + oy);
    this.weapon.setDepth(behind ? 19 : 22);
    this.weapon.setVisible(this.ctx.store.leader().equipment.weapon !== undefined);
  }

  private setupCamera(): void {
    const w = this.map.width * TILE_SIZE;
    const h = this.map.height * TILE_SIZE;
    const cam = this.cameras.main;
    const zoom = Math.min(this.scale.width / w, (this.scale.height - 120) / h, 2.4);
    cam.setZoom(zoom);
    if (w * zoom <= this.scale.width && h * zoom <= this.scale.height) {
      // mapa cabe inteiro na tela: centraliza e não precisa seguir
      cam.centerOn(w / 2, h / 2);
    } else {
      cam.setBounds(0, 0, w, h);
      cam.startFollow(this.player, true, 0.15, 0.15);
    }
  }

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    this.cursors = kb.createCursorKeys();
    this.keyMap = kb.addKeys('W,A,S,D,E,I') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-E', () => this.interact());
    kb.on('keydown-I', () => this.openMenu());
    if (import.meta.env.DEV) {
      // Debug (apenas dev): B força encontro; 1-5 teletransportam entre mapas.
      kb.on('keydown-B', () => {
        if (!this.moving && !this.busy) this.beginBattle(['scrap-hound', 'ash-bandit']);
      });
      const jumps: Record<string, string> = {
        ONE: 'relicario',
        TWO: 'ermo-cinzento',
        THREE: 'fortim-cinza',
        FOUR: 'floresta-murmura',
        FIVE: 'fenda-borda',
      };
      for (const [key, mapId] of Object.entries(jumps)) {
        kb.on(`keydown-${key}`, () => this.debugTeleport(mapId));
      }
    }
  }

  private debugTeleport(mapId: string): void {
    if (this.busy || this.moving) return;
    const target = Maps.get(mapId);
    if (!target) return;
    const spawn = target.spawns['start'] ?? Object.values(target.spawns)[0] ?? [2, 2];
    this.ctx.store.state.location = { mapId, x: spawn[0], y: spawn[1], facing: 'down' };
    this.scene.restart();
  }

  override update(): void {
    if (this.player) {
      this.positionWeapon();
      this.updateMinimap();
    }
    if (this.moving || this.busy) return;
    if (this.player.anims.isPlaying) {
      this.player.anims.stop();
      this.player.setTexture(heroIdleTexture(this.animDir()));
    }
    let dir: Facing | null = null;
    if (this.cursors.left.isDown || this.keyMap.A?.isDown) dir = 'left';
    else if (this.cursors.right.isDown || this.keyMap.D?.isDown) dir = 'right';
    else if (this.cursors.up.isDown || this.keyMap.W?.isDown) dir = 'up';
    else if (this.cursors.down.isDown || this.keyMap.S?.isDown) dir = 'down';
    if (dir) this.tryMove(dir);
  }

  private playerCell(): { x: number; y: number } {
    return {
      x: Math.round((this.player.x - TILE_SIZE / 2) / TILE_SIZE),
      y: Math.round((this.player.y - TILE_SIZE / 2) / TILE_SIZE),
    };
  }

  private npcAt(x: number, y: number): Npc | undefined {
    return this.npcs.find((n) => n.npc.at[0] === x && n.npc.at[1] === y)?.npc;
  }

  private tryMove(dir: Facing): void {
    this.facing = dir;
    this.player.setFlipX(dir === 'left');
    const { x, y } = this.playerCell();
    const { dx, dy } = DIRS[dir];
    const nx = x + dx;
    const ny = y + dy;
    if (!isWalkable(this.tiles, nx, ny) || this.npcAt(nx, ny)) {
      this.player.setTexture(heroIdleTexture(this.animDir()));
      return;
    }

    this.player.play(`hero-walk-${this.animDir()}`, true);
    this.moving = true;
    this.ctx.store.state.location = { mapId: this.map.id, x: nx, y: ny, facing: dir };
    this.tweens.add({
      targets: this.player,
      x: nx * TILE_SIZE + TILE_SIZE / 2,
      y: ny * TILE_SIZE + TILE_SIZE / 2,
      duration: 110,
      ease: 'Linear',
      onComplete: () => {
        this.moving = false;
        this.ctx.audio.sfx('step');
        this.onArrive(nx, ny);
      },
    });
  }

  private onArrive(x: number, y: number): void {
    const portal = this.map.portals.find((p) => p.at[0] === x && p.at[1] === y);
    if (portal) {
      this.changeMap(portal.toMap, portal.toSpawn);
      return;
    }
    if (this.map.encounter && this.rollEncounter()) {
      this.startEncounter();
    }
  }

  private rollEncounter(): boolean {
    if (!this.map.encounter) return false;
    const st = this.ctx.store.state;
    st.encounterCounter++;
    const rng = new SeededRng(deriveSeed(st.seed, 'encounter', st.encounterCounter));
    return rng.chance(this.map.encounter.rate);
  }

  private startEncounter(): void {
    const enc = this.map.encounter;
    if (!enc) return;
    const st = this.ctx.store.state;
    const rng = new SeededRng(deriveSeed(st.seed, 'enc-pick', st.encounterCounter));
    const idx = rng.weightedIndex(enc.groups.map((g) => g.weight));
    const group = enc.groups[idx];
    if (!group) return;
    this.beginBattle([...group.enemies]);
  }

  private beginBattle(enemyIds: string[]): void {
    this.busy = true;
    this.ctx.audio.sfx('encounter');
    const seed = deriveSeed(this.ctx.store.state.seed, 'battle', this.ctx.store.state.encounterCounter, enemyIds.join(','));
    this.scene.launch('Battle', {
      enemyIds,
      seed,
      onComplete: (result: 'win' | 'lose' | 'flee') => this.onBattleEnd(result),
    });
    this.scene.pause();
  }

  private onBattleEnd(result: 'win' | 'lose' | 'flee'): void {
    this.busy = false;
    if (result === 'lose') {
      this.scene.stop('Battle');
      this.scene.stop();
      this.scene.start('GameOver');
      return;
    }
    this.scene.stop('Battle');
    this.scene.resume();
    this.refreshHud();
    if (this.ctx.quests.isCompleted('q-seek-core') || this.ctx.store.getFlag('defeated-colossus')) {
      this.scene.start('Victory');
    }
  }

  private interact(): void {
    if (this.moving || this.busy) return;
    const { x, y } = this.playerCell();
    const { dx, dy } = DIRS[this.facing];
    const npc = this.npcAt(x + dx, y + dy) ?? this.npcAt(x, y);
    if (!npc) return;
    this.ctx.bus.emit('npc:talked', { npcId: npc.id });
    if (npc.dialogueId) {
      this.busy = true;
      this.scene.launch('Dialogue', {
        dialogueId: npc.dialogueId,
        onBattle: (ids: string[]) => this.beginBattle(ids),
        onClose: () => {
          this.busy = false;
          this.refreshHud();
        },
      });
      this.scene.pause();
    }
  }

  private openMenu(): void {
    if (this.moving || this.busy) return;
    if (!this.scene.manager.getScene('GameMenu')) {
      this.showToast('Menu (I) disponível em breve');
      return;
    }
    this.busy = true;
    this.scene.launch('GameMenu', { onClose: () => (this.busy = false) });
    this.scene.pause();
  }

  /* ── troca de mapa ── */
  private changeMap(mapId: string, spawn: string): void {
    const target = Maps.get(mapId);
    if (!target) return;
    const at = target.spawns[spawn] ?? [1, 1];
    this.ctx.store.state.location = { mapId, x: at[0], y: at[1], facing: this.facing };
    this.cameras.main.fadeOut(160, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart();
    });
  }

  /* ── HUD ── */
  private buildHud(): void {
    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(100);
    const width = this.scale.width;

    this.questText = this.add
      .text(12, 10, '', { fontFamily: UI.fontBody, fontSize: '14px', color: UI.gold, wordWrap: { width: 360 } })
      .setScrollFactor(0);
    this.goldText = this.add
      .text(width - 12, 10, '', { fontFamily: UI.fontMono, fontSize: '15px', color: UI.gold })
      .setOrigin(1, 0)
      .setScrollFactor(0);
    this.hud.add([this.questText, this.goldText]);

    const party = this.ctx.store.party;
    const barW = 150;
    const gap = 8;
    const totalW = party.length * (barW + gap);
    let bx = (width - totalW) / 2 + gap / 2;
    const by = this.scale.height - 46;
    this.partyBars = party.map((m) => {
      const name = this.add
        .text(bx, by - 14, m.name, { fontFamily: UI.fontMono, fontSize: '12px', color: UI.text })
        .setScrollFactor(0);
      const hp = new StatBar(this, bx, by, barW, 12, hex(UI.hp), true);
      const mp = new StatBar(this, bx, by + 16, barW, 8, hex(UI.mp), false);
      hp.container.setScrollFactor(0);
      mp.container.setScrollFactor(0);
      this.hud.add([name, hp.container, mp.container]);
      bx += barW + gap;
      return { hp, mp, name };
    });
  }

  private buildMinimap(): void {
    const pad = 10;
    const maxDim = Math.max(this.map.width, this.map.height);
    this.minimapScale = Math.max(2, Math.floor(150 / maxDim));
    const mw = this.map.width * this.minimapScale;
    const mh = this.map.height * this.minimapScale;
    this.minimapX = this.scale.width - mw - pad;
    this.minimapY = 40;

    const container = this.add.container(0, 0).setScrollFactor(0).setDepth(150);
    const frame = this.add
      .rectangle(this.minimapX - 3, this.minimapY - 3, mw + 6, mh + 6, hex('#0a0d10'), 0.85)
      .setOrigin(0, 0)
      .setStrokeStyle(1, hex(UI.panelBorder))
      .setScrollFactor(0);
    container.add(frame);

    const g = this.add.graphics().setScrollFactor(0);
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const ch = this.tiles[y]?.[x] ?? '#';
        g.fillStyle(minimapColor(ch), 1);
        g.fillRect(this.minimapX + x * this.minimapScale, this.minimapY + y * this.minimapScale, this.minimapScale, this.minimapScale);
      }
    }
    container.add(g);

    for (const p of this.map.portals) {
      container.add(
        this.add
          .rectangle(this.minimapX + p.at[0] * this.minimapScale, this.minimapY + p.at[1] * this.minimapScale, this.minimapScale + 1, this.minimapScale + 1, hex(UI.aura))
          .setOrigin(0, 0)
          .setScrollFactor(0),
      );
    }
    for (const n of this.map.npcs) {
      container.add(
        this.add
          .rectangle(this.minimapX + n.at[0] * this.minimapScale, this.minimapY + n.at[1] * this.minimapScale, this.minimapScale + 1, this.minimapScale + 1, hex(UI.gold))
          .setOrigin(0, 0)
          .setScrollFactor(0),
      );
    }

    this.minimapDot = this.add
      .rectangle(0, 0, this.minimapScale + 2, this.minimapScale + 2, 0xffffff)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(151);
    this.updateMinimap();
  }

  private updateMinimap(): void {
    if (!this.minimapDot) return;
    const { x, y } = this.playerCell();
    this.minimapDot.setPosition(this.minimapX + x * this.minimapScale, this.minimapY + y * this.minimapScale);
  }

  private refreshHud(): void {
    this.goldText.setText(`Ouro: ${this.ctx.store.state.gold}`);
    this.questText.setText(this.activeQuestLine());
    const party = this.ctx.store.party;
    this.partyBars.forEach((bar, i) => {
      const m = party[i];
      if (!m) return;
      const stats = computeStats(m.classId, m.level, m.equipment);
      bar.hp.set(m.hp, stats.maxHp);
      bar.mp.set(m.mp, stats.maxMp);
      bar.name.setColor(m.hp <= 0 ? UI.danger : UI.text);
    });
  }

  private activeQuestLine(): string {
    const active = this.ctx.store.state.quests.find((q) => !q.completed);
    if (!active) return 'Explore Valdaura...';
    return questLine(active.questId, active.stageIndex);
  }

  private showToast(text: string, tone?: 'info' | 'good' | 'bad'): void {
    const color = tone === 'good' ? UI.good : tone === 'bad' ? UI.danger : UI.aura;
    const t = this.add
      .text(this.scale.width / 2, 64, text, { fontFamily: UI.fontBody, fontSize: '16px', color })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);
    this.tweens.add({ targets: t, y: 48, alpha: 0, duration: 1800, delay: 500, onComplete: () => t.destroy() });
  }
}

import { computeStats } from '@/domain/party';
import { Quests } from '@/data/registry/content';

function minimapColor(ch: string): number {
  switch (ch) {
    case '#':
    case 'H':
    case 'O':
      return 0x4a505a;
    case 'T':
    case 't':
      return 0x2f6234;
    case 'W':
      return 0x1f5c8c;
    case 'R':
    case 'M':
      return 0x8a8f98;
    case '~':
      return 0x2f7d86;
    case '=':
      return 0x5c626a;
    case 'p':
      return 0x9a7b4f;
    case 's':
      return 0xd8c58a;
    case 'x':
      return 0x8a6a42;
    default:
      return 0x5a8a4a;
  }
}

function questLine(questId: string, stageIndex: number): string {
  const quest = Quests.get(questId);
  if (!quest) return '';
  const stage = quest.stages[stageIndex];
  return stage ? `◈ ${quest.name}: ${stage.text}` : `◈ ${quest.name}`;
}
