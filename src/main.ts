import Phaser from 'phaser';
import { GAME_CONFIG } from '@/config/game-config';
import { BootScene } from '@/scenes/boot/boot-scene';
import { PreloadScene } from '@/scenes/preload/preload-scene';
import { TitleScene } from '@/scenes/title/title-scene';

/**
 * Composition root do jogo.
 *
 * Único lugar que monta a instância do Phaser e registra as cenas. A lógica de
 * regras/combate (núcleo headless) NÃO vive aqui e nunca importa Phaser — ela
 * será injetada nas cenas a partir das próximas etapas.
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: GAME_CONFIG.colors.background,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_CONFIG.width,
    height: GAME_CONFIG.height,
  },
  render: {
    pixelArt: true,
    antialias: false,
  },
  scene: [BootScene, PreloadScene, TitleScene],
};

new Phaser.Game(config);
