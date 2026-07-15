import Phaser from 'phaser';

/**
 * BootScene — primeiríssima cena. Ponto de entrada do fluxo de cenas.
 *
 * Responsabilidade: configurações globais leves e imediatas, e então
 * transicionar para o Preload. NÃO carrega assets pesados aqui.
 *
 * (Etapas futuras) registro de serviços do núcleo (RNG, EventBus, GameState),
 * input global e configuração de escala fina entram neste ponto.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Preload');
  }
}
