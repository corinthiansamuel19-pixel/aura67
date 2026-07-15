import Phaser from 'phaser';
import { GAME_CONFIG } from '@/config/game-config';
import { UI } from '@/ui/theme';
import { makeButton } from '@/ui/widgets';
import { GameContext, getAudio } from '@/game/context';
import { allSaveMetas, hasAnySave, loadGame } from '@/systems/save';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    this.cameras.main.setBackgroundColor(UI.bg);
    getAudio(this).startMusic('title');

    const glow = this.add
      .text(cx, cy - 150, 'AURA67', { fontFamily: UI.fontTitle, fontSize: '92px', color: UI.aura })
      .setOrigin(0.5)
      .setAlpha(0.22);
    this.add
      .text(cx, cy - 150, 'AURA67', { fontFamily: UI.fontTitle, fontSize: '88px', color: UI.gold })
      .setOrigin(0.5);
    this.add
      .text(cx, cy - 90, 'Crônicas de Valdaura', {
        fontFamily: UI.fontTitle,
        fontSize: '24px',
        color: '#b9c2c8',
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: glow,
      alpha: 0.55,
      scale: 1.05,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const canContinue = hasAnySave();
    makeButton(this, cx, cy, 260, 46, 'Novo Jogo', () => this.newGame());
    makeButton(
      this,
      cx,
      cy + 60,
      260,
      46,
      canContinue ? 'Continuar' : 'Continuar (sem save)',
      () => {
        if (canContinue) this.continueGame();
      },
      { color: canContinue ? UI.text : UI.textDim },
    );
    makeButton(this, cx, cy + 120, 260, 46, 'Silenciar/Ativar Áudio', () => {
      getAudio(this).unlock();
      const muted = getAudio(this).toggleMute();
      this.toast(muted ? 'Áudio silenciado' : 'Áudio ativado');
    });

    this.add
      .text(cx, this.scale.height - 28, 'Setas/WASD mover · E interagir · I menu · combate por turnos', {
        fontFamily: UI.fontMono,
        fontSize: '13px',
        color: UI.textDim,
      })
      .setOrigin(0.5);
    this.add
      .text(this.scale.width - 10, this.scale.height - 8, `v${GAME_CONFIG.version}`, {
        fontFamily: UI.fontMono,
        fontSize: '12px',
        color: '#48535b',
      })
      .setOrigin(1, 1);
  }

  private newGame(): void {
    const audio = getAudio(this);
    audio.unlock();
    const ctx = GameContext.newGame(audio);
    ctx.install(this.game);
    this.scene.start('World', { fresh: true });
  }

  private continueGame(): void {
    const audio = getAudio(this);
    audio.unlock();
    const meta = allSaveMetas().find((m) => m.exists);
    if (!meta) return;
    const state = loadGame(meta.slot);
    if (!state) {
      this.toast('Save corrompido.');
      return;
    }
    GameContext.fromState(state, audio).install(this.game);
    this.scene.start('World', { fresh: false });
  }

  private toast(text: string): void {
    const t = this.add
      .text(this.scale.width / 2, this.scale.height - 70, text, {
        fontFamily: UI.fontBody,
        fontSize: '16px',
        color: UI.aura,
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: t, alpha: 0, duration: 1400, delay: 600, onComplete: () => t.destroy() });
  }
}
