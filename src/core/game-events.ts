import type { EnemyId, ItemId, MapId, NpcId, QuestId } from '@/shared/ids';

/**
 * Catálogo tipado de eventos de jogo. Sistemas (quests, áudio, UI) reagem a
 * estes sem conhecer quem os emite. Ver [[EventBus]].
 */
export interface GameEvents {
  'enemy:killed': { enemyId: EnemyId };
  'item:acquired': { itemId: ItemId; qty: number };
  'item:used': { itemId: ItemId };
  'flag:set': { flag: string; value: boolean };
  'gold:changed': { total: number };
  'quest:started': { questId: QuestId };
  'quest:stageAdvanced': { questId: QuestId; stageId: string };
  'quest:completed': { questId: QuestId };
  'party:leveledUp': { memberId: string; level: number };
  'map:entered': { mapId: MapId };
  'npc:talked': { npcId: NpcId };
  'battle:won': { xp: number; gold: number };
  'battle:lost': Record<string, never>;
  'sfx:play': { key: string };
  'music:play': { key: string };
  toast: { text: string; tone?: 'info' | 'good' | 'bad' };
}

import { EventBus } from '@core/event-bus';

export type GameEventBus = EventBus<GameEvents>;

export function createGameEventBus(): GameEventBus {
  return new EventBus<GameEvents>();
}
