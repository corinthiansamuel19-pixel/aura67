/**
 * RNG determinístico e semeado (mulberry32).
 *
 * Todo aleatório do jogo passa por aqui — nunca Math.random cru — para garantir
 * combate reproduzível, testes estáveis e save/replay confiável.
 */
export class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Próximo float em [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Inteiro em [minInclusive, maxInclusive]. */
  int(minInclusive: number, maxInclusive: number): number {
    if (maxInclusive < minInclusive) {
      return minInclusive;
    }
    return minInclusive + Math.floor(this.next() * (maxInclusive - minInclusive + 1));
  }

  /** Float em [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Verdadeiro com probabilidade p (0..1). */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Escolhe um elemento aleatório do array (assume array não-vazio). */
  pick<T>(arr: readonly T[]): T {
    const item = arr[this.int(0, arr.length - 1)];
    if (item === undefined) {
      throw new Error('SeededRng.pick: array vazio');
    }
    return item;
  }

  /**
   * Escolhe um índice com base em pesos (roleta). Retorna 0 se a soma for 0.
   */
  weightedIndex(weights: readonly number[]): number {
    const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
    if (total <= 0) {
      return 0;
    }
    let roll = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      roll -= Math.max(0, weights[i] ?? 0);
      if (roll < 0) {
        return i;
      }
    }
    return weights.length - 1;
  }

  /** Fisher–Yates: retorna uma nova cópia embaralhada. */
  shuffle<T>(arr: readonly T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const a = out[i] as T;
      const b = out[j] as T;
      out[i] = b;
      out[j] = a;
    }
    return out;
  }

  /** Estado serializável (para persistir/retomar a sequência). */
  getState(): number {
    return this.state >>> 0;
  }

  setState(state: number): void {
    this.state = state >>> 0;
  }
}

/** Hash estável de string -> semente (para derivar streams nomeados). */
export function hashSeed(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Deriva uma sub-semente determinística a partir de uma semente-mestra e partes
 * nomeadas (ex.: deriveSeed(master, 'combat', encounterId)).
 */
export function deriveSeed(master: number, ...parts: (string | number)[]): number {
  let seed = master >>> 0;
  for (const part of parts) {
    seed = (seed ^ hashSeed(String(part))) >>> 0;
    seed = Math.imul(seed, 2654435761) >>> 0;
  }
  return seed >>> 0;
}

/** Gera uma semente-mestra a partir de uma string (ex.: nome do save). */
export function makeMasterSeed(text: string): number {
  return hashSeed(text);
}
