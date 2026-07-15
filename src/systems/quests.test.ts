import { describe, it, expect } from 'vitest';
import { createGameEventBus } from '@core/game-events';
import { createNewGame } from '@/domain/game-state';
import { GameStore } from './game-store';
import { QuestSystem } from './quests';

function setup() {
  const store = new GameStore(createNewGame(1), createGameEventBus());
  const quests = new QuestSystem(store);
  quests.attach();
  return { store, quests };
}

describe('QuestSystem', () => {
  it('conclui quest de matar após N abates e entrega recompensa', () => {
    const { store, quests } = setup();
    quests.start('q-cull-swarm');
    expect(quests.isActive('q-cull-swarm')).toBe(true);
    for (let i = 0; i < 3; i++) store.bus.emit('enemy:killed', { enemyId: 'rot-swarm' });
    expect(quests.isCompleted('q-cull-swarm')).toBe(true);
    expect(store.countItem('greater-elixir')).toBe(1);
  });

  it('quest de alcançar mapa completa ao entrar', () => {
    const { store, quests } = setup();
    quests.start('q-reach-fortim');
    store.bus.emit('map:entered', { mapId: 'fortim-cinza' });
    expect(quests.isCompleted('q-reach-fortim')).toBe(true);
  });

  it('quest multi-estágio: flag avança, abate do chefe conclui', () => {
    const { store, quests } = setup();
    quests.start('q-seek-core');
    store.setFlag('talked-elder', true);
    expect(quests.progressFor('q-seek-core')?.stageIndex).toBe(1);
    store.bus.emit('enemy:killed', { enemyId: 'ashfont-colossus' });
    expect(quests.isCompleted('q-seek-core')).toBe(true);
  });
});
