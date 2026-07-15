import type { PartyMember } from './party';
import { createMember } from './party';

export type Facing = 'down' | 'up' | 'left' | 'right';

export interface InventoryEntry {
  itemId: string;
  qty: number;
}

export interface QuestProgress {
  questId: string;
  stageIndex: number;
  counters: Record<string, number>;
  completed: boolean;
}

export interface GameLocation {
  mapId: string;
  x: number;
  y: number;
  facing: Facing;
}

/** Todo o estado PERSISTENTE do jogo (o que é serializado no save). */
export interface GameState {
  version: number;
  seed: number;
  party: PartyMember[];
  inventory: InventoryEntry[];
  gold: number;
  flags: Record<string, boolean>;
  quests: QuestProgress[];
  location: GameLocation;
  playtimeMs: number;
  encounterCounter: number;
}

export const SAVE_VERSION = 1;

/** Novo jogo: party de 4 (o Aurífice + companheiros), kit inicial, no Relicário. */
export function createNewGame(seed: number): GameState {
  const party: PartyMember[] = [
    createMember('aurifice', 'Aurífice'),
    createMember('knight', 'Bran'),
    createMember('warden', 'Sela'),
    createMember('scavenger', 'Ravi'),
  ];
  const inventory: InventoryEntry[] = [
    { itemId: 'minor-poultice', qty: 5 },
    { itemId: 'aura-vial', qty: 3 },
    { itemId: 'antidote', qty: 2 },
  ];
  return {
    version: SAVE_VERSION,
    seed,
    party,
    inventory,
    gold: 30,
    flags: {},
    quests: [],
    location: { mapId: 'relicario', x: 3, y: 3, facing: 'down' },
    playtimeMs: 0,
    encounterCounter: 0,
  };
}
