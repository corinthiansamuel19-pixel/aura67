import type { SeededRng } from '@core/rng';
import { Enemies } from '@/data/registry/content';
import type { GameStore } from './game-store';
import { grantXp, type LevelUp } from './progression';

export interface RewardItem {
  itemId: string;
  qty: number;
}

export interface BattleRewards {
  xp: number;
  gold: number;
  items: RewardItem[];
}

/** Rola XP, ouro e drops dos inimigos derrotados (determinístico com o RNG). */
export function rollRewards(enemyIds: readonly string[], rng: SeededRng): BattleRewards {
  let xp = 0;
  let gold = 0;
  const merged = new Map<string, number>();
  for (const id of enemyIds) {
    const enemy = Enemies.get(id);
    if (!enemy) continue;
    xp += enemy.xp;
    gold += rng.int(enemy.gold[0], enemy.gold[1]);
    for (const drop of enemy.drops) {
      if (rng.chance(drop.chance)) {
        const qty = rng.int(drop.qty[0], drop.qty[1]);
        if (qty > 0) merged.set(drop.itemId, (merged.get(drop.itemId) ?? 0) + qty);
      }
    }
  }
  return {
    xp,
    gold,
    items: [...merged].map(([itemId, qty]) => ({ itemId, qty })),
  };
}

/** Aplica recompensas ao estado: ouro, itens e XP (com level-ups). */
export function applyRewards(store: GameStore, rewards: BattleRewards): LevelUp[] {
  store.addGold(rewards.gold);
  for (const item of rewards.items) store.addItem(item.itemId, item.qty);
  return grantXp(store, rewards.xp);
}
