import Phaser from 'phaser';
import { Items, Quests } from '@/data/registry/content';
import { computeStats, EQUIP_SLOTS, type EquipSlot, type PartyMember } from '@/domain/party';
import { equipItem } from '@/systems/equipment';
import { useFieldItem } from '@/systems/field';
import { allSaveMetas, loadGame } from '@/systems/save';
import { GameContext, getAudio } from '@/game/context';
import { UI, hex } from '@/ui/theme';
import { makeButton, makePanel, type ButtonOpts } from '@/ui/widgets';

interface MenuData {
  onClose?: () => void;
}

type Tab = 'party' | 'inv' | 'quests' | 'options';

const SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: 'Arma',
  head: 'Cabeça',
  body: 'Corpo',
  hands: 'Mãos',
  feet: 'Pés',
  accessory: 'Acessório',
};

export class GameMenuScene extends Phaser.Scene {
  private ctx!: GameContext;
  private payload!: MenuData;
  private tab: Tab = 'party';
  private content!: Phaser.GameObjects.Container;
  private closed = false;

  constructor() {
    super('GameMenu');
  }

  init(data: MenuData): void {
    this.payload = data;
    this.tab = 'party';
    this.closed = false;
  }

  create(): void {
    this.ctx = GameContext.get(this);
    const w = this.scale.width;
    const h = this.scale.height;
    this.add.rectangle(0, 0, w, h, hex('#05070a'), 0.72).setOrigin(0, 0);
    makePanel(this, 100, 48, w - 200, h - 96);

    const tabs: [Tab, string][] = [
      ['party', 'Party'],
      ['inv', 'Inventário'],
      ['quests', 'Jornal'],
      ['options', 'Opções'],
    ];
    tabs.forEach(([id, label], i) => {
      makeButton(this, 200 + i * 150, 78, 140, 32, label, () => {
        this.ctx.audio.sfx('menu');
        this.tab = id;
        this.render();
      });
    });
    makeButton(this, w - 170, 78, 90, 32, 'Fechar (I)', () => this.close());
    this.input.keyboard?.on('keydown-I', () => this.close());
    this.input.keyboard?.on('keydown-ESC', () => this.close());

    this.content = this.add.container(0, 0);
    this.render();
  }

  private render(): void {
    this.content.removeAll(true);
    switch (this.tab) {
      case 'party':
        this.renderParty();
        break;
      case 'inv':
        this.renderInventory();
        break;
      case 'quests':
        this.renderQuests();
        break;
      case 'options':
        this.renderOptions();
        break;
    }
  }

  /** Texto adicionado ao container de conteúdo (limpo a cada troca de aba). */
  private text(x: number, y: number, s: string, color: string = UI.text, size = 14): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, s, { fontFamily: UI.fontMono, fontSize: `${size}px`, color });
    this.content.add(t);
    return t;
  }

  /** Botão adicionado ao container de conteúdo. */
  private cbtn(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    cb: () => void,
    opts?: ButtonOpts,
  ): void {
    const b = makeButton(this, x, y, w, h, label, cb, opts ?? {});
    this.content.add(b);
  }

  /* ── Party ── */
  private renderParty(): void {
    this.ctx.store.party.forEach((m, i) => {
      const x = 130 + (i % 2) * 520;
      const y = 130 + Math.floor(i / 2) * 250;
      const stats = computeStats(m.classId, m.level, m.equipment);
      this.text(x, y, `${m.name}  ·  Lv ${m.level}`, UI.gold, 18);
      this.text(
        x,
        y + 26,
        `HP ${m.hp}/${stats.maxHp}   MP ${m.mp}/${stats.maxMp}   XP ${m.xp}`,
        m.hp <= 0 ? UI.danger : UI.text,
      );
      this.text(
        x,
        y + 48,
        `ATK ${stats.atk}  DEF ${stats.def}  MAG ${stats.mag}  RES ${stats.res}  SPD ${stats.spd}`,
        UI.textDim,
        13,
      );
      this.text(
        x,
        y + 66,
        `Crit ${Math.round(stats.critChance * 100)}%  Eva ${Math.round(stats.evasion * 100)}%`,
        UI.textDim,
        13,
      );
      EQUIP_SLOTS.forEach((slot, si) => {
        const itemId = m.equipment[slot];
        const label = itemId ? Items.get(itemId)?.name ?? itemId : '—';
        this.cbtn(
          x + 5 + (si % 2) * 250,
          y + 108 + Math.floor(si / 2) * 30,
          240,
          26,
          `${SLOT_LABEL[slot]}: ${label}`,
          () => this.openEquipPicker(m, slot),
          { align: 'left', fontSize: 12 },
        );
      });
    });
  }

  private openEquipPicker(member: PartyMember, slot: EquipSlot): void {
    this.content.removeAll(true);
    this.text(130, 120, `Equipar ${SLOT_LABEL[slot]} — ${member.name}`, UI.gold, 18);
    const candidates = this.ctx.store.state.inventory.filter((e) => {
      const item = Items.get(e.itemId);
      if (!item) return false;
      if (slot === 'weapon') return item.kind === 'weapon';
      return item.kind === 'armor' && item.slot === slot;
    });
    if (candidates.length === 0) this.text(130, 160, 'Nenhum item compatível no inventário.', UI.textDim);
    candidates.slice(0, 12).forEach((entry, i) => {
      const item = Items.require(entry.itemId);
      this.cbtn(
        130,
        160 + i * 32,
        420,
        28,
        `${item.name}  x${entry.qty}`,
        () => {
          if (equipItem(this.ctx.store, member.id, entry.itemId)) this.ctx.audio.sfx('confirm');
          this.render();
        },
        { align: 'left', fontSize: 13 },
      );
    });
    this.cbtn(130, 160 + Math.min(candidates.length, 12) * 32 + 12, 160, 30, 'Voltar', () => this.render());
  }

  /* ── Inventário ── */
  private renderInventory(): void {
    const inv = this.ctx.store.state.inventory;
    this.text(130, 118, `Ouro: ${this.ctx.store.state.gold}`, UI.gold, 16);
    if (inv.length === 0) this.text(130, 160, 'Inventário vazio.', UI.textDim);
    inv.slice(0, 22).forEach((entry, i) => {
      const item = Items.get(entry.itemId);
      if (!item) return;
      const x = 130 + (i % 2) * 500;
      const y = 158 + Math.floor(i / 2) * 34;
      this.text(x, y, `${item.name}  x${entry.qty}`, UI.text, 14);
      this.text(x, y + 15, item.description.slice(0, 46), UI.textDim, 11);
      if (item.kind === 'consumable' && item.usableInField) {
        this.cbtn(x + 360, y + 8, 90, 24, 'Usar', () => this.useItem(entry.itemId), { fontSize: 12 });
      }
    });
  }

  private useItem(itemId: string): void {
    const party = this.ctx.store.party;
    const item = Items.get(itemId);
    const isRevive = item?.kind === 'consumable' && item.useEffects.some((e) => e.type === 'revive');
    const ratio = (m: PartyMember): number =>
      m.hp / computeStats(m.classId, m.level, m.equipment).maxHp;
    const target = isRevive
      ? party.find((m) => m.hp <= 0)
      : [...party].filter((m) => m.hp > 0).sort((a, b) => ratio(a) - ratio(b))[0];
    if (!target) {
      this.ctx.bus.emit('toast', { text: 'Nenhum alvo válido.', tone: 'bad' });
      return;
    }
    if (useFieldItem(this.ctx.store, itemId, target)) {
      this.ctx.audio.sfx('heal');
      this.ctx.bus.emit('toast', { text: `${item?.name} usado em ${target.name}.`, tone: 'good' });
    }
    this.render();
  }

  /* ── Jornal ── */
  private renderQuests(): void {
    this.text(130, 118, 'Missões', UI.gold, 18);
    const quests = this.ctx.store.state.quests;
    if (quests.length === 0) {
      this.text(130, 160, 'Nenhuma missão ainda. Explore e converse com NPCs.', UI.textDim);
    }
    let y = 156;
    for (const p of quests) {
      const quest = Quests.get(p.questId);
      if (!quest) continue;
      this.text(130, y, `${p.completed ? '✔' : '◈'} ${quest.name}`, p.completed ? UI.good : UI.gold, 16);
      const stage = quest.stages[Math.min(p.stageIndex, quest.stages.length - 1)];
      this.text(150, y + 20, p.completed ? 'Concluída.' : stage?.text ?? '', UI.textDim, 13);
      y += 52;
    }
  }

  /* ── Opções ── */
  private renderOptions(): void {
    const audio = getAudio(this);
    this.text(130, 118, 'Áudio', UI.gold, 18);
    const rows: [string, () => number, (d: number) => void][] = [
      ['Master', () => audio.volumes.master, (d) => audio.setMaster(audio.volumes.master + d)],
      ['SFX', () => audio.volumes.sfx, (d) => audio.setSfx(audio.volumes.sfx + d)],
      ['Música', () => audio.volumes.music, (d) => audio.setMusic(audio.volumes.music + d)],
    ];
    rows.forEach(([label, get, setD], i) => {
      const y = 152 + i * 34;
      const valText = this.text(130, y, `${label}: ${Math.round(get() * 100)}%`, UI.text, 14);
      this.cbtn(320, y + 8, 40, 26, '-', () => {
        setD(-0.1);
        valText.setText(`${label}: ${Math.round(get() * 100)}%`);
      });
      this.cbtn(366, y + 8, 40, 26, '+', () => {
        setD(0.1);
        valText.setText(`${label}: ${Math.round(get() * 100)}%`);
      });
    });
    this.cbtn(430, 160, 120, 26, 'Mudo', () => audio.toggleMute());

    this.text(130, 300, 'Salvar / Carregar', UI.gold, 18);
    allSaveMetas().forEach((meta, slot) => {
      const y = 336 + slot * 44;
      const info = meta.exists
        ? `Slot ${slot + 1}: Lv${meta.leaderLevel} · ${meta.mapId}`
        : `Slot ${slot + 1}: vazio`;
      this.text(130, y + 6, info, UI.text, 14);
      this.cbtn(470, y + 6, 90, 28, 'Salvar', () => {
        if (this.ctx.save(slot)) this.ctx.bus.emit('toast', { text: `Salvo no slot ${slot + 1}.`, tone: 'good' });
        this.render();
      });
      if (meta.exists) this.cbtn(568, y + 6, 90, 28, 'Carregar', () => this.loadSlot(slot));
    });

    this.cbtn(130, this.scale.height - 128, 280, 34, 'Sair para o Menu Principal', () => {
      this.scene.stop('World');
      this.scene.stop();
      this.scene.start('MainMenu');
    });
  }

  private loadSlot(slot: number): void {
    const state = loadGame(slot);
    if (!state) {
      this.ctx.bus.emit('toast', { text: 'Save corrompido.', tone: 'bad' });
      return;
    }
    GameContext.fromState(state, getAudio(this)).install(this.game);
    this.scene.stop('World');
    this.scene.stop();
    this.scene.start('World', { fresh: false });
  }

  private close(): void {
    if (this.closed) return;
    this.closed = true;
    this.payload.onClose?.();
    this.scene.stop();
    this.scene.resume('World');
  }
}
