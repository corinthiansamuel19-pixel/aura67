/**
 * Registry congelado e indexado por ID. Valida cada item com o schema no load,
 * detecta IDs duplicados e oferece acesso O(1) por ID.
 */
export class Registry<T extends { id: string }> {
  private readonly byId = new Map<string, T>();

  constructor(
    public readonly kind: string,
    items: readonly T[],
  ) {
    for (const item of items) {
      if (this.byId.has(item.id)) {
        throw new Error(`[${kind}] ID de conteúdo duplicado: '${item.id}'`);
      }
      this.byId.set(item.id, Object.freeze(item));
    }
  }

  get(id: string): T | undefined {
    return this.byId.get(id);
  }

  require(id: string): T {
    const value = this.byId.get(id);
    if (!value) {
      throw new Error(`[${this.kind}] ID de conteúdo não encontrado: '${id}'`);
    }
    return value;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  all(): T[] {
    return [...this.byId.values()];
  }

  ids(): string[] {
    return [...this.byId.keys()];
  }

  byTag(tag: string): T[] {
    return this.all().filter((item) => {
      const tags = (item as { tags?: unknown }).tags;
      return Array.isArray(tags) && tags.includes(tag);
    });
  }

  get size(): number {
    return this.byId.size;
  }
}

/**
 * Constrói um Registry validando cada módulo de conteúdo com o schema fornecido.
 * `modules` vem de import.meta.glob(..., { eager: true, import: 'default' }).
 */
export function buildRegistry<T extends { id: string }>(
  kind: string,
  schema: { parse: (data: unknown) => T },
  modules: Record<string, unknown>,
): Registry<T> {
  const items: T[] = [];
  for (const [path, raw] of Object.entries(modules)) {
    const list = Array.isArray(raw) ? raw : [raw];
    for (const entry of list) {
      try {
        items.push(schema.parse(entry));
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        throw new Error(`[${kind}] conteúdo inválido em ${path}:\n${detail}`);
      }
    }
  }
  return new Registry(kind, items);
}
