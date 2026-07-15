import Phaser from 'phaser';
import { GameContext, getAudio } from '@/game/context';
import { allSaveMetas, loadGame } from '@/systems/save';
import { UI } from '@/ui/theme';
import { makeButton } from '@/ui/widgets';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    this.cameras.main.setBackgroundColor('#0a0506');
    getAudio(this).stopMusic();

    this.add
      .text(cx, cy - 80, 'Consumido pela Aura', {
        fontFamily: UI.fontTitle,
        fontSize: '44px',
        color: UI.danger,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cy - 24, 'A party tombou no ermo cintilante.', {
        fontFamily: UI.fontBody,
        fontSize: '18px',
        color: UI.textDim,
      })
      .setOrigin(0.5);

    const hasSave = allSaveMetas().some((m) => m.exists);
    if (hasSave) {
      makeButton(this, cx, cy + 50, 240, 44, 'Carregar Save', () => {
        const meta = allSaveMetas().find((m) => m.exists);
        if (!meta) return;
        const state = loadGame(meta.slot);
        if (!state) return;
        GameContext.fromState(state, getAudio(this)).install(this.game);
        this.scene.start('World', { fresh: false });
      });
    }
    makeButton(this, cx, cy + (hasSave ? 106 : 50), 240, 44, 'Menu Principal', () => {
      this.scene.start('MainMenu');
    });
  }
}
