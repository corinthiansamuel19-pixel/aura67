import type { GameState } from '@/domain/game-state';
import type { GameEventBus } from '@core/game-events';
import type { PartyMember } from '@/domain/party';

/**
 * Funil ÚNICO de mutações do estado persistente. Todas as mudanças passam por
 * métodos com intenção explícita que emitem eventos — nada de globais mutáveis.
 */
export class GameStore {
  constructor(
    public state: GameState,
    public readonly bus: GameEventBus,
  ) {}

  get party(): PartyMember[] {
    return this.state.party;
  }

  leader(): PartyMember {
    const first = this.state.party[0];
    if (!first) throw new Error('Party vazia');
    return first;
  }

  member(id: string): PartyMember | undefined {
    return this.state.party.find((m) => m.id === id);
  }

  /* ── inventário ── */

  countItem(itemId: string): number {
    return this.state.inventory.find((e) => e.itemId === itemId)?.qty ?? 0;
  }

  hasItem(itemId: string): boolean {
    return this.countItem(itemId) > 0;
  }

  addItem(itemId: string, qty = 1): void {
    if (qty <= 0) return;
    const entry = this.state.inventory.find((e) => e.itemId === itemId);
    if (entry) entry.qty += qty;
    else this.state.inventory.push({ itemId, qty });
    this.bus.emit('item:acquired', { itemId, qty });
  }

  removeItem(itemId: string, qty = 1): boolean {
    const entry = this.state.inventory.find((e) => e.itemId === itemId);
    if (!entry || entry.qty < qty) return false;
    entry.qty -= qty;
    if (entry.qty <= 0) {
      this.state.inventory = this.state.inventory.filter((e) => e.itemId !== itemId);
    }
    return true;
  }

  /* ── economia ── */

  addGold(n: number): void {
    this.state.gold = Math.max(0, this.state.gold + n);
    this.bus.emit('gold:changed', { total: this.state.gold });
  }

  spendGold(n: number): boolean {
    if (this.state.gold < n) return false;
    this.state.gold -= n;
    this.bus.emit('gold:changed', { total: this.state.gold });
    return true;
  }

  /* ── flags ── */

  setFlag(flag: string, value = true): void {
    this.state.flags[flag] = value;
    this.bus.emit('flag:set', { flag, value });
  }

  getFlag(flag: string): boolean {
    return this.state.flags[flag] ?? false;
  }
}
