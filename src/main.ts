import Phaser from 'phaser';
import { GAME_CONFIG } from '@/config/game-config';
import { BootScene } from '@/scenes/boot/boot-scene';
import { PreloadScene } from '@/scenes/preload/preload-scene';
import { MainMenuScene } from '@/scenes/main-menu/main-menu-scene';
import { WorldScene } from '@/scenes/world/world-scene';
import { BattleScene } from '@/scenes/battle/battle-scene';
import { DialogueScene } from '@/scenes/dialogue/dialogue-scene';
import { GameOverScene } from '@/scenes/endings/game-over-scene';
import { VictoryScene } from '@/scenes/endings/victory-scene';

/**
 * Composition root. Monta a instância do Phaser e registra todas as cenas.
 * A lógica de regras (núcleo headless) nunca importa Phaser.
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: GAME_CONFIG.colors.background,
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_CONFIG.width,
    height: GAME_CONFIG.height,
  },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    WorldScene,
    BattleScene,
    DialogueScene,
    GameOverScene,
    VictoryScene,
  ],
};

new Phaser.Game(config);
