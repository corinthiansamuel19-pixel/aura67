import { Items } from '@/data/registry/content';
import { computeStats, type PartyMember } from '@/domain/party';
import type { GameStore } from './game-store';

/** Usa um consumível fora de combate (cura/restaura/revive) em um membro. */
export function useFieldItem(store: GameStore, itemId: string, member: PartyMember): boolean {
  const item = Items.get(itemId);
  if (!item || item.kind !== 'consumable' || !item.usableInField) return false;
  if (!store.hasItem(itemId)) return false;

  const stats = computeStats(member.classId, member.level, member.equipment);
  let did = false;
  for (const e of item.useEffects) {
    if (e.type === 'restore') {
      if (e.resource === 'hp') {
        if (member.hp <= 0) continue;
        member.hp = Math.min(stats.maxHp, member.hp + e.amount);
      } else {
        member.mp = Math.min(stats.maxMp, member.mp + e.amount);
      }
      did = true;
    } else if (e.type === 'heal') {
      if (member.hp > 0) {
        member.hp = Math.min(stats.maxHp, member.hp + e.power);
        did = true;
      }
    } else if (e.type === 'revive') {
      if (member.hp <= 0) {
        member.hp = Math.max(1, Math.round(stats.maxHp * e.hpPercent));
        did = true;
      }
    }
  }
  if (did) store.removeItem(itemId, 1);
  return did;
}
