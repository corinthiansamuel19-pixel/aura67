import Phaser from 'phaser';
import { GAME_CONFIG } from '@/config/game-config';

/**
 * TitleScene — tela de título (placeholder da Etapa 1).
 *
 * Mostra a identidade do jogo com um brilho de Aura pulsante. O fluxo de
 * "Novo Jogo" (entrar no mundo) chega na Etapa 2 (vertical slice jogável).
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const { colors, version } = GAME_CONFIG;
    const width = this.scale.width;
    const height = this.scale.height;
    const cx = width / 2;
    const cy = height / 2;

    this.cameras.main.setBackgroundColor(colors.background);

    // Camada de brilho (Aura) atrás do título, pulsando.
    const glow = this.add
      .text(cx, cy - 40, 'AURA67', {
        fontFamily: 'Georgia, serif',
        fontSize: '96px',
        color: colors.aura,
      })
      .setOrigin(0.5)
      .setAlpha(0.22);

    this.add
      .text(cx, cy - 40, 'AURA67', {
        fontFamily: 'Georgia, serif',
        fontSize: '92px',
        color: colors.gold,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 42, 'Crônicas de Valdaura', {
        fontFamily: 'Georgia, serif',
        fontSize: '26px',
        color: '#b9c2c8',
      })
      .setOrigin(0.5);

    const hint = this.add
      .text(cx, cy + 150, 'Novo Jogo — disponível na Etapa 2', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: colors.muted,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: glow,
      alpha: 0.6,
      scale: 1.04,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: hint,
      alpha: 0.35,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(width - 12, height - 10, `v${version} — Etapa 1`, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#4a555c',
      })
      .setOrigin(1, 1);
  }
}
