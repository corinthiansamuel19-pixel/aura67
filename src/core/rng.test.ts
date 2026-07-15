import { describe, it, expect } from 'vitest';
import { SeededRng, deriveSeed, hashSeed } from '@core/rng';

describe('SeededRng', () => {
  it('é determinístico para a mesma semente', () => {
    const a = new SeededRng(12345);
    const b = new SeededRng(12345);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produz sequências diferentes para sementes diferentes', () => {
    const a = new SeededRng(1);
    const b = new SeededRng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('int respeita os limites', () => {
    const r = new SeededRng(7);
    for (let i = 0; i < 500; i++) {
      const v = r.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });

  it('getState/setState retomam a sequência', () => {
    const r = new SeededRng(99);
    r.next();
    r.next();
    const s = r.getState();
    const nextA = r.next();
    r.setState(s);
    const nextB = r.next();
    expect(nextA).toBe(nextB);
  });

  it('weightedIndex favorece o maior peso', () => {
    const r = new SeededRng(42);
    const counts = [0, 0, 0];
    for (let i = 0; i < 3000; i++) {
      counts[r.weightedIndex([1, 8, 1])]!++;
    }
    expect(counts[1]!).toBeGreaterThan(counts[0]!);
    expect(counts[1]!).toBeGreaterThan(counts[2]!);
  });
});

describe('deriveSeed / hashSeed', () => {
  it('deriva sementes estáveis e distintas por nome', () => {
    const master = 1000;
    expect(deriveSeed(master, 'combat')).toBe(deriveSeed(master, 'combat'));
    expect(deriveSeed(master, 'combat')).not.toBe(deriveSeed(master, 'loot'));
  });

  it('hashSeed é estável', () => {
    expect(hashSeed('valdaura')).toBe(hashSeed('valdaura'));
  });
});
