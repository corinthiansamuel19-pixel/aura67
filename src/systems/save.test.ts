import { describe, it, expect, beforeEach } from 'vitest';
import { createNewGame } from '@/domain/game-state';
import { saveGame, loadGame, saveMeta, deleteSave } from './save';

const mem: Record<string, string> = {};
const mockStorage = {
  getItem: (k: string): string | null => mem[k] ?? null,
  setItem: (k: string, v: string): void => {
    mem[k] = v;
  },
  removeItem: (k: string): void => {
    delete mem[k];
  },
  clear: (): void => {
    for (const k of Object.keys(mem)) delete mem[k];
  },
  key: (i: number): string | null => Object.keys(mem)[i] ?? null,
  get length(): number {
    return Object.keys(mem).length;
  },
};

beforeEach(() => {
  globalThis.localStorage = mockStorage as unknown as Storage;
  mockStorage.clear();
});

describe('save/load', () => {
  it('roundtrip preserva o estado', () => {
    const state = createNewGame(42);
    state.gold = 999;
    expect(saveGame(state, 0, 1000)).toBe(true);
    const loaded = loadGame(0);
    expect(loaded?.gold).toBe(999);
    expect(loaded?.seed).toBe(42);
    expect(loaded?.party.length).toBe(4);
  });

  it('slot vazio retorna null', () => {
    expect(loadGame(1)).toBeNull();
  });

  it('meta reflete o save; delete remove', () => {
    saveGame(createNewGame(1), 2, 1234);
    const m = saveMeta(2);
    expect(m.exists).toBe(true);
    expect(m.mapId).toBe('relicario');
    deleteSave(2);
    expect(saveMeta(2).exists).toBe(false);
  });
});
