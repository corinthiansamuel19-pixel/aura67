import Phaser from 'phaser';
import { UI, hex } from './theme';

export function makePanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 1,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics({ x, y });
  g.fillStyle(hex(UI.panel), alpha);
  g.fillRoundedRect(0, 0, w, h, 8);
  g.lineStyle(1, hex(UI.panelBorder), 1);
  g.strokeRoundedRect(0, 0, w, h, 8);
  return g;
}

export interface ButtonOpts {
  fontSize?: number;
  color?: string;
  align?: 'center' | 'left';
}

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  opts: ButtonOpts = {},
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, w, h, hex(UI.panel)).setStrokeStyle(1, hex(UI.panelBorder));
  const align = opts.align ?? 'center';
  const txt = scene.add
    .text(align === 'left' ? -w / 2 + 12 : 0, 0, label, {
      fontFamily: UI.fontBody,
      fontSize: `${opts.fontSize ?? 18}px`,
      color: opts.color ?? UI.text,
    })
    .setOrigin(align === 'left' ? 0 : 0.5, 0.5);
  container.add([bg, txt]);
  container.setSize(w, h);
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerover', () => {
    bg.setFillStyle(hex(UI.panelBorder));
    txt.setColor(UI.aura);
  });
  bg.on('pointerout', () => {
    bg.setFillStyle(hex(UI.panel));
    txt.setColor(opts.color ?? UI.text);
  });
  bg.on('pointerdown', onClick);
  container.setData('label', txt);
  container.setData('bg', bg);
  return container;
}

/** Barra de valor (HP/MP/XP) com preenchimento e texto opcional. */
export class StatBar {
  readonly container: Phaser.GameObjects.Container;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text | null;
  private readonly w: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    colorHex: number,
    showText = false,
  ) {
    this.w = w;
    this.container = scene.add.container(x, y);
    const bg = scene.add.rectangle(0, 0, w, h, hex('#0a0d10')).setOrigin(0, 0.5);
    bg.setStrokeStyle(1, hex(UI.panelBorder));
    this.fill = scene.add.rectangle(1, 0, w - 2, h - 2, colorHex).setOrigin(0, 0.5);
    this.label = showText
      ? scene.add
          .text(w / 2, 0, '', { fontFamily: UI.fontMono, fontSize: '11px', color: '#0b0d10' })
          .setOrigin(0.5)
      : null;
    this.container.add([bg, this.fill]);
    if (this.label) this.container.add(this.label);
  }

  set(current: number, max: number): void {
    const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
    this.fill.width = Math.max(0, (this.w - 2) * ratio);
    if (this.label) this.label.setText(`${Math.max(0, Math.round(current))}/${Math.round(max)}`);
  }
}
