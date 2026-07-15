/**
 * Event bus tipado (pub/sub) para comunicação desacoplada entre sistemas
 * transversais (quests, áudio, UI reagindo à gameplay).
 *
 * Genérico sobre um mapa de eventos { nome: payload }. Retorna uma função de
 * cancelamento em `on` para facilitar o auto-unsubscribe no dispose das cenas.
 */
export class EventBus<Events extends object> {
  private readonly handlers = new Map<keyof Events, Set<(payload: unknown) => void>>();

  on<K extends keyof Events>(key: K, fn: (payload: Events[K]) => void): () => void {
    let set = this.handlers.get(key);
    if (!set) {
      set = new Set();
      this.handlers.set(key, set);
    }
    const wrapped = fn as (payload: unknown) => void;
    set.add(wrapped);
    return () => {
      set?.delete(wrapped);
    };
  }

  once<K extends keyof Events>(key: K, fn: (payload: Events[K]) => void): () => void {
    const off = this.on(key, (payload) => {
      off();
      fn(payload);
    });
    return off;
  }

  emit<K extends keyof Events>(key: K, payload: Events[K]): void {
    const set = this.handlers.get(key);
    if (!set) {
      return;
    }
    // Cópia defensiva: um handler pode se desinscrever durante a emissão.
    for (const fn of [...set]) {
      (fn as (payload: Events[K]) => void)(payload);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
