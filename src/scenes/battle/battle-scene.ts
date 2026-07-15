import Phaser from 'phaser';
import { SeededRng, deriveSeed } from '@core/rng';
import { Enemies, Items, Skills, Statuses } from '@/data/registry/content';
import type { Targeting } from '@/data/schemas';
import {
  combatantFromEnemy,
  combatantFromMember,
  effectiveStats,
  type Combatant,
} from '@/domain/combatant';
import { computeStats } from '@/domain/party';
import { Battle, type BattleAction, type BattleEvent } from '@/systems/combat/battle';
import { applyRewards, rollRewards } from '@/systems/loot';
import { GameContext } from '@/game/context';
import { shapeTexture } from '@/rendering/textures';
import { UI, hex } from '@/ui/theme';
import { StatBar, makeButton } from '@/ui/widgets';

interface BattleData {
  enemyIds: string[];
  seed: number;
  onComplete: (result: 'win' | 'lose' | 'flee') => void;
}

interface View {
  c: Combatant;
  sprite: Phaser.GameObjects.Image;
  hp: StatBar;
  mp: StatBar | null;
  name: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Text;
  marker: Phaser.GameObjects.Text;
}

export class BattleScene extends Phaser.Scene {
  private ctx!: GameContext;
  private battle!: Battle;
  private payload!: BattleData;
  private views = new Map<string, View>();

  private menu!: Phaser.GameObjects.Container;
  private logText!: Phaser.GameObjects.Text;
  private log: string[] = [];
  private turnText!: Phaser.GameObjects.Text;

  private targetCb: ((id: string) => void) | null = null;
  private targetSet = new Set<string>();

  constructor() {
    super('Battle');
  }

  init(data: BattleData): void {
    this.payload = data;
    this.views.clear();
    this.log = [];
    this.targetCb = null;
    this.targetSet.clear();
  }

  create(): void {
    this.ctx = GameContext.get(this);
    this.cameras.main.setBackgroundColor('#0a0c12');
    this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, hex('#0a0c12'))
      .setOrigin(0, 0);
    this.add
      .rectangle(0, this.scale.height * 0.62, this.scale.width, 2, hex(UI.panelBorder))
      .setOrigin(0, 0.5);

    const allies = this.ctx.store.party.map((m) => combatantFromMember(m));
    const enemies = this.payload.enemyIds.map((id, i) =>
      combatantFromEnemy(Enemies.require(id), `enemy-${i}`),
    );
    this.battle = new Battle(allies, enemies, this.payload.seed, {
      consumeItem: (itemId) => this.ctx.store.removeItem(itemId, 1),
    });

    this.layout(enemies, true);
    this.layout(allies, false);

    this.ctx.audio.startMusic('battle');

    this.turnText = this.add
      .text(this.scale.width / 2, 16, '', { fontFamily: UI.fontTitle, fontSize: '20px', color: UI.gold })
      .setOrigin(0.5);
    this.logText = this.add.text(12, this.scale.height - 132, '', {
      fontFamily: UI.fontMono,
      fontSize: '13px',
      color: UI.textDim,
      lineSpacing: 2,
    });
    this.menu = this.add.container(0, 0);

    this.updateViews();
    this.nextStep();
  }

  private layout(list: Combatant[], enemySide: boolean): void {
    const y = enemySide ? this.scale.height * 0.34 : this.scale.height * 0.56;
    const n = list.length;
    const spread = Math.min(this.scale.width - 160, n * 160);
    const startX = this.scale.width / 2 - spread / 2 + spread / (2 * n);
    list.forEach((c, i) => {
      const x = n === 1 ? this.scale.width / 2 : startX + (spread / n) * i;
      const size = c.spriteShape === 'colossus' ? 120 : 68;
      const sprite = this.add
        .image(x, y, shapeTexture(c.spriteShape))
        .setTint(hex(c.spriteColor))
        .setDisplaySize(size, size);
      if (!enemySide) sprite.setFlipY(false);
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => this.onSpriteClick(c.id));

      const name = this.add
        .text(x, y + size / 2 + 6, `${c.name} Lv${c.level}`, {
          fontFamily: UI.fontMono,
          fontSize: '12px',
          color: UI.text,
        })
        .setOrigin(0.5);
      const hp = new StatBar(this, x - 55, y + size / 2 + 24, 110, 12, hex(UI.hp), true);
      const mp = enemySide ? null : new StatBar(this, x - 55, y + size / 2 + 40, 110, 7, hex(UI.mp), false);
      const status = this.add
        .text(x, y - size / 2 - 12, '', { fontFamily: UI.fontMono, fontSize: '11px', color: UI.aura })
        .setOrigin(0.5);
      const marker = this.add
        .text(x, y - size / 2 - 26, '▼', { fontFamily: UI.fontBody, fontSize: '18px', color: UI.gold })
        .setOrigin(0.5)
        .setVisible(false);

      this.views.set(c.id, { c, sprite, hp, mp, name, status, marker });
    });
  }

  private updateViews(): void {
    for (const v of this.views.values()) {
      const stats = effectiveStats(v.c);
      v.hp.set(v.c.hp, stats.maxHp);
      if (v.mp) v.mp.set(v.c.mp, stats.maxMp);
      v.sprite.setAlpha(v.c.alive ? 1 : 0.25);
      v.name.setColor(v.c.alive ? UI.text : UI.danger);
      v.status.setText(
        v.c.statuses
          .map((s) => {
            const def = Statuses.get(s.statusId);
            return def ? `${def.name}${s.stacks > 1 ? `x${s.stacks}` : ''}` : '';
          })
          .join(' '),
      );
    }
  }

  /* ── loop ── */

  private nextStep(): void {
    this.clearTargets();
    if (this.battle.over) {
      this.finish();
      return;
    }
    const actor = this.battle.currentActor();
    if (!actor) {
      this.finish();
      return;
    }
    this.turnText.setText(`Turno de ${actor.name}  ·  Rodada ${this.battle.round}`);
    this.highlightActor(actor.id);
    if (actor.isPlayer) {
      this.showRootMenu(actor);
    } else {
      this.hideMenu();
      this.time.delayedCall(420, () => {
        const events = this.battle.perform(this.battle.autoAction());
        this.animate(events, () => this.nextStep());
      });
    }
  }

  private highlightActor(id: string): void {
    const v = this.views.get(id);
    if (v) this.tweens.add({ targets: v.sprite, scale: v.sprite.scale * 1.08, duration: 160, yoyo: true });
  }

  private submit(action: BattleAction): void {
    this.hideMenu();
    this.clearTargets();
    const events = this.battle.perform(action);
    this.animate(events, () => this.nextStep());
  }

  /* ── menus ── */

  private hideMenu(): void {
    this.menu.removeAll(true);
  }

  private showRootMenu(actor: Combatant): void {
    this.hideMenu();
    const x = 120;
    const y = this.scale.height - 96;
    const opts: [string, () => void][] = [
      ['Atacar', () => this.beginTarget(actor, 'enemy', (id) => this.submit({ kind: 'attack', targetId: id }))],
      ['Habilidade', () => this.showSkillMenu(actor)],
      ['Item', () => this.showItemMenu(actor)],
      ['Defender', () => this.submit({ kind: 'defend' })],
      ['Fugir', () => this.submit({ kind: 'flee' })],
    ];
    opts.forEach(([label, cb], i) => {
      const col = i < 3 ? 0 : 1;
      const row = i < 3 ? i : i - 3;
      const btn = makeButton(this, x + col * 150, y + row * 34 - 34, 140, 30, label, () => {
        this.ctx.audio.sfx('menu');
        cb();
      });
      this.menu.add(btn);
    });
  }

  private showSkillMenu(actor: Combatant): void {
    this.hideMenu();
    const x = 120;
    let y = this.scale.height - 128;
    actor.skills.forEach((sid) => {
      const skill = Skills.get(sid);
      if (!skill) return;
      const affordable = actor.mp >= skill.costMp;
      const btn = makeButton(
        this,
        x,
        y,
        220,
        26,
        `${skill.name}  (${skill.costMp} MP)`,
        () => {
          if (!affordable) return;
          this.ctx.audio.sfx('menu');
          this.pickSkill(actor, sid);
        },
        { fontSize: 14, color: affordable ? UI.text : UI.textDim, align: 'left' },
      );
      this.menu.add(btn);
      y += 28;
    });
    this.menu.add(
      makeButton(this, x + 250, this.scale.height - 108, 100, 28, 'Voltar', () => this.showRootMenu(actor)),
    );
  }

  private pickSkill(actor: Combatant, skillId: string): void {
    const skill = Skills.require(skillId);
    const t = skill.targeting;
    if (t.side === 'self' || t.shape === 'all' || t.shape === 'random') {
      const ids = this.battle.resolveTargets(actor, t).map((c) => c.id);
      this.submit({ kind: 'skill', skillId, targetIds: ids });
      return;
    }
    this.beginTarget(actor, t.side, (id) => this.submit({ kind: 'skill', skillId, targetIds: [id] }));
  }

  private showItemMenu(actor: Combatant): void {
    this.hideMenu();
    const x = 120;
    let y = this.scale.height - 128;
    const consumables = this.ctx.store.state.inventory.filter((e) => {
      const item = Items.get(e.itemId);
      return item?.kind === 'consumable' && item.usableInBattle;
    });
    if (consumables.length === 0) {
      this.menu.add(
        this.add.text(x, y, 'Sem itens de combate.', {
          fontFamily: UI.fontBody,
          fontSize: '14px',
          color: UI.textDim,
        }),
      );
    }
    consumables.slice(0, 5).forEach((entry) => {
      const item = Items.require(entry.itemId);
      const btn = makeButton(
        this,
        x,
        y,
        240,
        26,
        `${item.name} x${entry.qty}`,
        () => {
          this.ctx.audio.sfx('menu');
          this.beginTarget(actor, 'ally', (id) =>
            this.submit({ kind: 'item', itemId: entry.itemId, targetIds: [id] }),
          );
        },
        { fontSize: 14, align: 'left' },
      );
      this.menu.add(btn);
      y += 28;
    });
    this.menu.add(
      makeButton(this, x + 270, this.scale.height - 108, 100, 28, 'Voltar', () => this.showRootMenu(actor)),
    );
  }

  /* ── seleção de alvo ── */

  private beginTarget(actor: Combatant, side: Targeting['side'], cb: (id: string) => void): void {
    this.hideMenu();
    const candidates = this.battle.targetCandidates(actor, side);
    if (candidates.length === 0) {
      this.showRootMenu(actor);
      return;
    }
    if (candidates.length === 1) {
      cb(candidates[0]!.id);
      return;
    }
    this.targetCb = cb;
    this.targetSet = new Set(candidates.map((c) => c.id));
    for (const id of this.targetSet) this.views.get(id)?.marker.setVisible(true);
    const prompt = this.add
      .text(this.scale.width / 2, this.scale.height - 150, 'Escolha o alvo (clique) · Esc cancela', {
        fontFamily: UI.fontBody,
        fontSize: '14px',
        color: UI.aura,
      })
      .setOrigin(0.5);
    this.menu.add(prompt);
    this.input.keyboard?.once('keydown-ESC', () => {
      this.clearTargets();
      this.showRootMenu(actor);
    });
  }

  private onSpriteClick(id: string): void {
    if (this.targetCb && this.targetSet.has(id)) {
      const cb = this.targetCb;
      this.clearTargets();
      cb(id);
    }
  }

  private clearTargets(): void {
    this.targetCb = null;
    this.targetSet.clear();
    for (const v of this.views.values()) v.marker.setVisible(false);
  }

  /* ── animação da timeline ── */

  private animate(events: BattleEvent[], done: () => void): void {
    let i = 0;
    const step = (): void => {
      if (i >= events.length) {
        this.updateViews();
        done();
        return;
      }
      const e = events[i++];
      const delay = e ? this.applyEvent(e) : 0;
      this.updateViews();
      this.time.delayedCall(delay, step);
    };
    step();
  }

  private applyEvent(e: BattleEvent): number {
    switch (e.type) {
      case 'action':
        this.pushLog(`▸ ${this.nameOf(e.actorId)}: ${e.label}`);
        return 160;
      case 'message':
        this.pushLog(e.text);
        return 200;
      case 'damage': {
        const v = this.views.get(e.targetId);
        if (v) {
          this.floating(v, `${e.amount}`, e.crit ? UI.gold : hex2(e.element), e.crit ? 26 : 18);
          this.flash(v, UI.danger);
          this.ctx.audio.sfx(e.crit ? 'crit' : 'hit');
        }
        return 260;
      }
      case 'heal': {
        const v = this.views.get(e.targetId);
        if (v) {
          this.floating(v, `+${e.amount}`, UI.good, 18);
          this.ctx.audio.sfx('heal');
        }
        return 220;
      }
      case 'mp': {
        const v = this.views.get(e.targetId);
        if (v) this.floating(v, `${e.amount > 0 ? '+' : ''}${e.amount} MP`, UI.mp, 14);
        return 120;
      }
      case 'status': {
        const v = this.views.get(e.targetId);
        const def = Statuses.get(e.statusId);
        if (v && def) {
          this.floating(v, e.applied ? def.name : `${def.name}?`, def.color, 14);
          if (e.applied) this.ctx.audio.sfx('magic');
        }
        return 200;
      }
      case 'death': {
        const v = this.views.get(e.targetId);
        if (v) {
          this.ctx.audio.sfx('death');
          this.tweens.add({ targets: v.sprite, alpha: 0.25, angle: 90, duration: 260 });
          this.pushLog(`${this.nameOf(e.targetId)} caiu.`);
        }
        return 300;
      }
      case 'revive': {
        const v = this.views.get(e.targetId);
        if (v) {
          this.tweens.add({ targets: v.sprite, alpha: 1, angle: 0, duration: 260 });
          this.ctx.audio.sfx('heal');
        }
        return 240;
      }
      case 'flee':
        this.pushLog(e.success ? 'A party fugiu!' : 'A fuga falhou!');
        return 220;
    }
  }

  private floating(v: View, text: string, color: string | number, size: number): void {
    const c = typeof color === 'number' ? `#${color.toString(16).padStart(6, '0')}` : color;
    const t = this.add
      .text(v.sprite.x, v.sprite.y - 20, text, { fontFamily: UI.fontMono, fontSize: `${size}px`, color: c })
      .setOrigin(0.5)
      .setDepth(50);
    this.tweens.add({ targets: t, y: t.y - 36, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  private flash(v: View, color: string): void {
    const original = v.sprite.tintTopLeft;
    v.sprite.setTint(hex(color));
    this.tweens.add({
      targets: v.sprite,
      duration: 90,
      onComplete: () => v.sprite.setTint(original),
    });
    this.tweens.add({ targets: v.sprite, x: v.sprite.x + 4, duration: 40, yoyo: true, repeat: 2 });
  }

  private nameOf(id: string): string {
    return this.views.get(id)?.c.name ?? '???';
  }

  private pushLog(line: string): void {
    this.log.push(line);
    if (this.log.length > 6) this.log.shift();
    this.logText.setText(this.log.join('\n'));
  }

  /* ── fim de batalha ── */

  private finish(): void {
    this.hideMenu();
    const result = this.battle.result ?? 'lose';
    this.ctx.audio.stopMusic();

    if (result === 'lose') {
      this.ctx.audio.sfx('defeat');
      this.showEndBanner('Derrota...', UI.danger, () => this.payload.onComplete('lose'));
      return;
    }

    // vitória ou fuga: emite abates, aplica recompensas, escreve de volta HP/MP
    const defeated = this.battle.enemies().filter((e) => !e.alive);
    for (const e of defeated) if (e.enemyId) this.ctx.bus.emit('enemy:killed', { enemyId: e.enemyId });

    let summary = '';
    if (result === 'win') {
      const rng = new SeededRng(deriveSeed(this.ctx.store.state.seed, 'loot', this.ctx.store.state.encounterCounter));
      const rewards = rollRewards(this.payload.enemyIds, rng);
      const ups = applyRewards(this.ctx.store, rewards);
      summary = `+${rewards.xp} XP · +${rewards.gold} ouro`;
      if (rewards.items.length > 0) {
        summary += `\n${rewards.items.map((r) => `${Items.get(r.itemId)?.name ?? r.itemId} x${r.qty}`).join(', ')}`;
      }
      if (ups.length > 0) {
        this.ctx.audio.sfx('levelup');
        summary += `\n${ups.map((u) => `${u.name} subiu p/ Lv${u.to}!`).join('\n')}`;
      }
      if (defeated.some((e) => Enemies.get(e.enemyId ?? '')?.boss)) {
        this.ctx.store.setFlag('defeated-colossus', true);
      }
    }
    this.writeBack();

    this.ctx.audio.sfx(result === 'win' ? 'victory' : 'menu');
    const title = result === 'win' ? 'Vitória!' : 'Fuga bem-sucedida';
    this.showEndBanner(`${title}\n${summary}`, UI.good, () => this.payload.onComplete(result));
  }

  private writeBack(): void {
    for (const c of this.battle.allies()) {
      if (!c.memberId) continue;
      const m = this.ctx.store.member(c.memberId);
      if (!m) continue;
      if (c.alive) {
        m.hp = c.hp;
        m.mp = c.mp;
      } else {
        const stats = computeStats(m.classId, m.level, m.equipment);
        m.hp = Math.max(1, Math.round(stats.maxHp * 0.25));
        m.mp = c.mp;
      }
    }
  }

  private showEndBanner(text: string, color: string, done: () => void): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, hex('#05070a'), 0.6).setOrigin(0, 0).setDepth(90);
    this.add
      .text(cx, cy - 10, text, { fontFamily: UI.fontTitle, fontSize: '30px', color, align: 'center' })
      .setOrigin(0.5)
      .setDepth(91);
    const hint = this.add
      .text(cx, cy + 70, 'Clique ou Espaço para continuar', {
        fontFamily: UI.fontBody,
        fontSize: '15px',
        color: UI.textDim,
      })
      .setOrigin(0.5)
      .setDepth(91);
    this.tweens.add({ targets: hint, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
    const go = (): void => done();
    this.input.once('pointerdown', go);
    this.input.keyboard?.once('keydown-SPACE', go);
  }
}

function hex2(element: string): string {
  const map: Record<string, string> = {
    physical: '#ffffff',
    fire: '#ff7a3d',
    arcane: '#9a6bff',
    toxin: '#8ad152',
    aura: '#5fd3c4',
  };
  return map[element] ?? '#ffffff';
}
