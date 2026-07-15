import { Items } from '@/data/registry/content';
import { computeStats, type EquipSlot } from '@/domain/party';
import type { GameStore } from './game-store';

function reclamp(store: GameStore, memberId: string): void {
  const member = store.member(memberId);
  if (!member) return;
  const stats = computeStats(member.classId, member.level, member.equipment);
  member.hp = Math.min(member.hp, stats.maxHp);
  member.mp = Math.min(member.mp, stats.maxMp);
}

/** Equipa um item do inventário no membro; devolve o anterior ao inventário. */
export function equipItem(store: GameStore, memberId: string, itemId: string): boolean {
  const member = store.member(memberId);
  const item = Items.get(itemId);
  if (!member || !item) return false;
  if (item.kind !== 'weapon' && item.kind !== 'armor') return false;
  if (!store.hasItem(itemId)) return false;

  const slot: EquipSlot = item.kind === 'weapon' ? 'weapon' : item.slot;
  store.removeItem(itemId, 1);

  const previous = member.equipment[slot];
  if (previous !== undefined) store.addItem(previous, 1);

  member.equipment[slot] = itemId;
  reclamp(store, memberId);
  return true;
}

/** Desequipa o item de um slot, devolvendo-o ao inventário. */
export function unequip(store: GameStore, memberId: string, slot: EquipSlot): boolean {
  const member = store.member(memberId);
  if (!member) return false;
  const current = member.equipment[slot];
  if (current === undefined) return false;
  delete member.equipment[slot];
  store.addItem(current, 1);
  reclamp(store, memberId);
  return true;
}
