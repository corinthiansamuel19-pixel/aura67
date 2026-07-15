import Phaser from 'phaser';
import { GAME_CONFIG } from '@/config/game-config';
import { generateTextures } from '@/rendering/textures';
import {
  generateHeroTextures,
  generateNpcTextures,
  generateWeaponTextures,
  registerHeroAnims,
} from '@/rendering/actor';

/**
 * PreloadScene — gera as texturas placeholder e exibe a barra de carregamento.
 * (Etapa futura: carregamento de assets reais entra aqui.)
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create(): void {
    const { colors } = GAME_CONFIG;
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    this.cameras.main.setBackgroundColor(colors.background);

    this.add
      .text(cx, cy - 90, 'AURA67', {
        fontFamily: 'Georgia, serif',
        fontSize: '72px',
        color: colors.gold,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cy - 28, 'Crônicas de Valdaura', {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: colors.aura,
      })
      .setOrigin(0.5);

    // Gera todas as texturas procedurais (tiles, herói, armas, silhuetas).
    generateTextures(this);
    generateHeroTextures(this);
    generateNpcTextures(this);
    generateWeaponTextures(this);
    registerHeroAnims(this);

    const barWidth = 440;
    const barX = cx - barWidth / 2;
    const barY = cy + 40;
    const border = this.add.graphics();
    border.lineStyle(2, 0x3a4750, 1);
    border.strokeRect(barX, barY, barWidth, 18);
    const fill = this.add.graphics();
    const label = this.add
      .text(cx, barY + 44, 'Canalizando Aura... 0%', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: colors.muted,
      })
      .setOrigin(0.5);

    const progress = { value: 0 };
    const auraColor = Phaser.Display.Color.HexStringToColor(colors.aura).color;
    this.tweens.add({
      targets: progress,
      value: 1,
      duration: 1100,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const v = progress.value;
        fill.clear();
        fill.fillStyle(auraColor, 1);
        fill.fillRect(barX + 2, barY + 2, (barWidth - 4) * v, 14);
        label.setText(`Canalizando Aura... ${Math.round(v * 100)}%`);
      },
      onComplete: () => {
        this.time.delayedCall(160, () => this.scene.start('MainMenu'));
      },
    });
  }
}
