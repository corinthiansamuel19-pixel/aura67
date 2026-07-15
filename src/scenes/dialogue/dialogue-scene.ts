import Phaser from 'phaser';
import { Dialogues } from '@/data/registry/content';
import type { DialogueNode } from '@/data/schemas';
import { GameContext } from '@/game/context';
import { applyChoiceActions, applyNodeActions, visibleChoices } from '@/systems/dialogue';
import { UI, hex } from '@/ui/theme';
import { makeButton } from '@/ui/widgets';

interface DialogueData {
  dialogueId: string;
  onBattle?: (enemyIds: string[]) => void;
  onClose?: () => void;
}

export class DialogueScene extends Phaser.Scene {
  private ctx!: GameContext;
  private payload!: DialogueData;
  private nodeContainer!: Phaser.GameObjects.Container;
  private closed = false;

  constructor() {
    super('Dialogue');
  }

  init(data: DialogueData): void {
    this.payload = data;
    this.closed = false;
  }

  create(): void {
    this.ctx = GameContext.get(this);
    const w = this.scale.width;
    const h = this.scale.height;
    this.add.rectangle(0, 0, w, h, hex('#05070a'), 0.35).setOrigin(0, 0);
    const panelH = 170;
    this.add
      .rectangle(0, h - panelH, w, panelH, hex(UI.panel), 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(2, hex(UI.panelBorder));
    this.nodeContainer = this.add.container(0, 0);

    const dialogue = Dialogues.get(this.payload.dialogueId);
    if (!dialogue) {
      this.close();
      return;
    }
    const start = dialogue.nodes.find((n) => n.id === dialogue.start) ?? dialogue.nodes[0];
    if (start) this.enterNode(dialogue.id, start);
  }

  private enterNode(dialogueId: string, node: DialogueNode): void {
    applyNodeActions({ store: this.ctx.store, quests: this.ctx.quests }, node);

    if (node.startBattle && node.startBattle.length > 0) {
      const ids = [...node.startBattle];
      this.close();
      this.payload.onBattle?.(ids);
      return;
    }

    this.render(dialogueId, node);
  }

  private render(dialogueId: string, node: DialogueNode): void {
    this.nodeContainer.removeAll(true);
    const w = this.scale.width;
    const h = this.scale.height;
    const baseY = h - 160;

    if (node.speaker) {
      this.nodeContainer.add(
        this.add.text(24, baseY, node.speaker, {
          fontFamily: UI.fontTitle,
          fontSize: '18px',
          color: UI.gold,
        }),
      );
    }
    this.nodeContainer.add(
      this.add.text(24, baseY + 28, node.text, {
        fontFamily: UI.fontBody,
        fontSize: '17px',
        color: UI.text,
        wordWrap: { width: w - 48 },
        lineSpacing: 3,
      }),
    );

    const choices = visibleChoices(this.ctx.store, node);
    if (choices.length > 0) {
      let cy = h - 58;
      choices.forEach((choice, i) => {
        const btn = makeButton(
          this,
          24 + 300 * (i % 3),
          cy,
          280,
          30,
          `▸ ${choice.text}`,
          () => {
            this.ctx.audio.sfx('confirm');
            applyChoiceActions({ store: this.ctx.store, quests: this.ctx.quests }, choice);
            this.advance(dialogueId, choice.next);
          },
          { align: 'left', fontSize: 15 },
        );
        this.nodeContainer.add(btn);
        if ((i + 1) % 3 === 0) cy += 34;
      });
    } else {
      const hint = this.add
        .text(w - 24, h - 24, '[Espaço/clique] continuar', {
          fontFamily: UI.fontMono,
          fontSize: '13px',
          color: UI.textDim,
        })
        .setOrigin(1, 1);
      this.nodeContainer.add(hint);
      const advance = (): void => {
        this.ctx.audio.sfx('menu');
        this.advance(dialogueId, node.next);
      };
      this.input.once('pointerdown', advance);
      this.input.keyboard?.once('keydown-SPACE', advance);
    }
  }

  private advance(dialogueId: string, nextId: string | null): void {
    if (this.closed) return;
    if (!nextId) {
      this.close();
      return;
    }
    const dialogue = Dialogues.get(dialogueId);
    const node = dialogue?.nodes.find((n) => n.id === nextId);
    if (!node) {
      this.close();
      return;
    }
    this.enterNode(dialogueId, node);
  }

  private close(): void {
    if (this.closed) return;
    this.closed = true;
    this.payload.onClose?.();
    this.scene.stop();
    this.scene.resume('World');
  }
}
