import Phaser from 'phaser';
import { createGameEventBus, type GameEventBus } from '@core/game-events';
import { makeMasterSeed } from '@core/rng';
import { GameStore } from '@/systems/game-store';
import { QuestSystem } from '@/systems/quests';
import { AudioManager } from '@/systems/audio';
import { createNewGame, type GameState } from '@/domain/game-state';
import { saveGame } from '@/systems/save';

const CTX_KEY = 'game-context';
const AUDIO_KEY = 'audio';

/** Bundle de serviços de uma partida, acessível a todas as cenas via registry. */
export class GameContext {
  readonly bus: GameEventBus;
  readonly store: GameStore;
  readonly quests: QuestSystem;
  readonly audio: AudioManager;

  constructor(state: GameState, audio: AudioManager) {
    this.bus = createGameEventBus();
    this.store = new GameStore(state, this.bus);
    this.quests = new QuestSystem(this.store);
    this.quests.attach();
    this.audio = audio;
  }

  static newGame(audio: AudioManager, seedText?: string): GameContext {
    const seed = makeMasterSeed(seedText ?? `valdaura:${Math.floor(performance.now())}`);
    return new GameContext(createNewGame(seed), audio);
  }

  static fromState(state: GameState, audio: AudioManager): GameContext {
    return new GameContext(state, audio);
  }

  save(slot: number): boolean {
    return saveGame(this.store.state, slot, Date.now());
  }

  install(game: Phaser.Game): void {
    game.registry.set(CTX_KEY, this);
  }

  static get(scene: Phaser.Scene): GameContext {
    const ctx = scene.game.registry.get(CTX_KEY) as GameContext | undefined;
    if (!ctx) throw new Error('GameContext não inicializado — comece pelo menu.');
    return ctx;
  }

  static maybe(scene: Phaser.Scene): GameContext | undefined {
    return scene.game.registry.get(CTX_KEY) as GameContext | undefined;
  }
}

/** AudioManager único, criado no Boot e compartilhado por todas as partidas. */
export function getAudio(scene: Phaser.Scene): AudioManager {
  let audio = scene.game.registry.get(AUDIO_KEY) as AudioManager | undefined;
  if (!audio) {
    audio = new AudioManager();
    scene.game.registry.set(AUDIO_KEY, audio);
  }
  return audio;
}
