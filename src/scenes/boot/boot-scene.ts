import Phaser from 'phaser';
import { getAudio } from '@/game/context';

/**
 * BootScene — primeira cena. Inicializa serviços globais (áudio) e vai ao Preload.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    getAudio(this); // instancia o AudioManager único no registry
    this.scene.start('Preload');
  }
}
