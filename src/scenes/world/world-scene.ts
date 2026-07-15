import Phaser from 'phaser';
import { Maps } from '@/data/registry/content';
import type { GameMap, Npc } from '@/data/schemas';
import type { Facing } from '@/domain/game-state';
import { SeededRng, deriveSeed } from '@core/rng';
import { GameContext } from '@/game/context';
import { TILE_SIZE, isWalkable, shapeTexture } from '@/rendering/textures';
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
  private player!: Phaser.GameObjects.Image;
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
        this.add
          .image(x * TILE_SIZE, y * TILE_SIZE, `tile-${ch}`)
          .setOrigin(0, 0);
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
      const sprite = this.add
        .image(npc.at[0] * TILE_SIZE + TILE_SIZE / 2, npc.at[1] * TILE_SIZE + TILE_SIZE / 2, shapeTexture('humanoid'))
        .setTint(hex(npc.color))
        .setDisplaySize(TILE_SIZE * 0.8, TILE_SIZE * 0.8);
      this.add
        .text(sprite.x, sprite.y - TILE_SIZE * 0.7, npc.name, {
          fontFamily: UI.fontMono,
          fontSize: '11px',
          color: UI.textDim,
        })
        .setOrigin(0.5);
      return { npc, sprite };
    });
  }

  private renderPlayer(x: number, y: number): void {
    this.player = this.add
      .image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 'shape-hero')
      .setTint(hex(UI.aura))
      .setDisplaySize(TILE_SIZE * 0.82, TILE_SIZE * 0.82)
      .setDepth(10);
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
      // Debug (apenas dev): força um encontro de teste.
      kb.on('keydown-B', () => {
        if (!this.moving && !this.busy) this.beginBattle(['scrap-hound', 'ash-bandit']);
      });
    }
  }

  override update(): void {
    if (this.moving || this.busy) return;
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
    const { x, y } = this.playerCell();
    const { dx, dy } = DIRS[dir];
    const nx = x + dx;
    const ny = y + dy;
    if (!isWalkable(this.tiles, nx, ny) || this.npcAt(nx, ny)) return;

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

function questLine(questId: string, stageIndex: number): string {
  const quest = Quests.get(questId);
  if (!quest) return '';
  const stage = quest.stages[stageIndex];
  return stage ? `◈ ${quest.name}: ${stage.text}` : `◈ ${quest.name}`;
}
