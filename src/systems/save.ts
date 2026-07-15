import type { GameState } from '@/domain/game-state';
import { SAVE_VERSION } from '@/domain/game-state';
import { GAME_CONFIG } from '@/config/game-config';

/**
 * Persistência offline em localStorage com envelope VERSIONADO e cadeia de
 * migração. Falha de forma graciosa (nunca apaga saves em caso de corrupção).
 * (localStorage escolhido por simplicidade/robustez neste escopo; o envelope já
 * prepara a migração para IndexedDB no futuro.)
 */
const PREFIX = 'aura67:save:';
export const SAVE_SLOTS = 3;

export interface SaveEnvelope {
  schemaVersion: number;
  gameVersion: string;
  savedAt: number;
  playtimeMs: number;
  data: GameState;
}

export interface SaveMeta {
  slot: number;
  exists: boolean;
  savedAt?: number;
  mapId?: string;
  leaderLevel?: number;
  playtimeMs?: number;
  partyNames?: string[];
}

function slotKey(slot: number): string {
  return `${PREFIX}${slot}`;
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState, slot: number, now: number): boolean {
  const store = storage();
  if (!store) return false;
  try {
    const envelope: SaveEnvelope = {
      schemaVersion: SAVE_VERSION,
      gameVersion: GAME_CONFIG.version,
      savedAt: now,
      playtimeMs: state.playtimeMs,
      data: state,
    };
    store.setItem(slotKey(slot), JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

/** Cadeia de migração de schema de save (v1 é a base; futuras vão aqui). */
function migrate(envelope: SaveEnvelope): GameState | null {
  if (envelope.schemaVersion > SAVE_VERSION) return null; // save mais novo que o build
  // Ex. futuro: if (envelope.schemaVersion === 1) { ...migra p/ 2... }
  return envelope.data;
}

export function loadGame(slot: number): GameState | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(slotKey(slot));
    if (!raw) return null;
    const envelope = JSON.parse(raw) as SaveEnvelope;
    if (!envelope || typeof envelope.schemaVersion !== 'number' || !envelope.data) return null;
    return migrate(envelope);
  } catch {
    return null;
  }
}

export function saveMeta(slot: number): SaveMeta {
  const store = storage();
  if (!store) return { slot, exists: false };
  try {
    const raw = store.getItem(slotKey(slot));
    if (!raw) return { slot, exists: false };
    const env = JSON.parse(raw) as SaveEnvelope;
    const d = env.data;
    return {
      slot,
      exists: true,
      savedAt: env.savedAt,
      mapId: d.location.mapId,
      leaderLevel: d.party[0]?.level ?? 1,
      playtimeMs: env.playtimeMs,
      partyNames: d.party.map((p) => p.name),
    };
  } catch {
    return { slot, exists: false };
  }
}

export function allSaveMetas(): SaveMeta[] {
  return Array.from({ length: SAVE_SLOTS }, (_, i) => saveMeta(i));
}

export function deleteSave(slot: number): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(slotKey(slot));
  } catch {
    /* noop */
  }
}

export function hasAnySave(): boolean {
  return allSaveMetas().some((m) => m.exists);
}
