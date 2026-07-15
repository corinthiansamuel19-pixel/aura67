import { describe, it, expect } from 'vitest';
import { SeededRng } from '@core/rng';
import { createGameEventBus } from '@core/game-events';
import { createNewGame } from '@/domain/game-state';
import { GameStore } from './game-store';
import { grantXp } from './progression';
import { applyRewards, rollRewards } from './loot';
import { equipItem } from './equipment';

function makeStore(): GameStore {
  return new GameStore(createNewGame(1), createGameEventBus());
}

describe('inventário', () => {
  it('adiciona e remove itens', () => {
    const s = makeStore();
    s.addItem('scrap-metal', 3);
    expect(s.countItem('scrap-metal')).toBe(3);
    expect(s.removeItem('scrap-metal', 2)).toBe(true);
    expect(s.countItem('scrap-metal')).toBe(1);
    expect(s.removeItem('scrap-metal', 5)).toBe(false);
  });
});

describe('progressão', () => {
  it('concede XP e sobe de nível', () => {
    const s = makeStore();
    const ups = grantXp(s, 1000);
    expect(ups.length).toBeGreaterThan(0);
    expect(s.leader().level).toBeGreaterThan(1);
  });
});

describe('loot', () => {
  it('rola recompensas determinísticas', () => {
    const a = rollRewards(['scrap-hound', 'scrap-hound'], new SeededRng(5));
    const b = rollRewards(['scrap-hound', 'scrap-hound'], new SeededRng(5));
    expect(a).toEqual(b);
    expect(a.xp).toBe(24);
  });

  it('aplica recompensas ao estado', () => {
    const s = makeStore();
    const goldBefore = s.state.gold;
    applyRewards(s, { xp: 0, gold: 10, items: [{ itemId: 'scrap-metal', qty: 2 }] });
    expect(s.state.gold).toBe(goldBefore + 10);
    expect(s.countItem('scrap-metal')).toBe(2);
  });
});

describe('equipamento', () => {
  it('equipa trocando o item anterior', () => {
    const s = makeStore();
    s.addItem('aura-blade', 1);
    const knight = s.party.find((m) => m.classId === 'knight');
    expect(knight).toBeDefined();
    const before = knight!.equipment.weapon;
    expect(equipItem(s, knight!.id, 'aura-blade')).toBe(true);
    expect(knight!.equipment.weapon).toBe('aura-blade');
    if (before) expect(s.countItem(before)).toBe(1);
  });
});
