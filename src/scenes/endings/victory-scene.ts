import Phaser from 'phaser';
import { getAudio } from '@/game/context';
import { UI } from '@/ui/theme';
import { makeButton } from '@/ui/widgets';

const CREDITS = [
  'O Colosso-Coroa tomba, e a Fenda silencia — por ora.',
  'O que você fará com o destino da Aura fica para outra era.',
  '',
  'aura67 — Crônicas de Valdaura',
  'Um protótipo de RPG por turnos.',
  'Arquitetura, sistemas e conteúdo gerados como demonstração técnica.',
];

export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('Victory');
  }

  create(): void {
    const cx = this.scale.width / 2;
    this.cameras.main.setBackgroundColor('#0a0d12');
    const audio = getAudio(this);
    audio.stopMusic();
    audio.sfx('victory');

    this.add
      .text(cx, 90, 'Vitória', { fontFamily: UI.fontTitle, fontSize: '54px', color: UI.aura })
      .setOrigin(0.5);

    CREDITS.forEach((line, i) => {
      this.add
        .text(cx, 170 + i * 34, line, {
          fontFamily: i < 2 ? UI.fontBody : UI.fontMono,
          fontSize: i < 2 ? '18px' : '15px',
          color: i < 2 ? UI.text : UI.textDim,
          align: 'center',
          wordWrap: { width: this.scale.width - 120 },
        })
        .setOrigin(0.5);
    });

    makeButton(this, cx, this.scale.height - 70, 240, 44, 'Menu Principal', () => {
      this.scene.start('MainMenu');
    });
  }
}
