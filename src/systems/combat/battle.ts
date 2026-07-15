import { SeededRng } from '@core/rng';
import { Enemies, Items, Skills, Statuses } from '@/data/registry/content';
import type { Effect, Targeting } from '@/data/schemas';
import {
  effectiveStats,
  isBlocked,
  maxHpOf,
  maxMpOf,
  type Combatant,
} from '@/domain/combatant';
import { computeDamage, computeHeal, computeHit } from './formulas';

type DamageEffect = Extract<Effect, { type: 'damage' }>;

export type BattleAction =
  | { kind: 'attack'; targetId: string }
  | { kind: 'skill'; skillId: string; targetIds: string[] }
  | { kind: 'item'; itemId: string; targetIds: string[] }
  | { kind: 'defend' }
  | { kind: 'flee' };

export type BattleEvent =
  | { type: 'action'; actorId: string; label: string }
  | { type: 'message'; text: string }
  | { type: 'damage'; targetId: string; amount: number; crit: boolean; element: string }
  | { type: 'heal'; targetId: string; amount: number }
  | { type: 'mp'; targetId: string; amount: number }
  | { type: 'status'; targetId: string; statusId: string; applied: boolean }
  | { type: 'death'; targetId: string }
  | { type: 'revive'; targetId: string }
  | { type: 'flee'; success: boolean };

export type BattleResult = 'win' | 'lose' | 'flee' | null;
export type BattlePhase = 'active' | 'won' | 'lost' | 'fled';

export interface BattleOptions {
  consumeItem?: (itemId: string) => boolean;
}

export class Battle {
  readonly combatants: Combatant[];
  private readonly byId = new Map<string, Combatant>();
  private readonly rng: SeededRng;
  private readonly opts: BattleOptions;

  phase: BattlePhase = 'active';
  round = 0;
  private order: string[] = [];
  private turnIndex = -1;
  private actorReady: string | null = null;
  private turnStartEvents: BattleEvent[] = [];

  constructor(allies: Combatant[], enemies: Combatant[], seed: number, opts: BattleOptions = {}) {
    this.combatants = [...allies, ...enemies];
    for (const c of this.combatants) this.byId.set(c.id, c);
    this.rng = new SeededRng(seed);
    this.opts = opts;
    this.beginRound();
    this.advance();
  }

  /* ─────────── consultas ─────────── */

  get over(): boolean {
    return this.phase !== 'active';
  }

  get result(): BattleResult {
    if (this.phase === 'won') return 'win';
    if (this.phase === 'lost') return 'lose';
    if (this.phase === 'fled') return 'flee';
    return null;
  }

  get(id: string): Combatant | undefined {
    return this.byId.get(id);
  }

  allies(): Combatant[] {
    return this.combatants.filter((c) => c.side === 'ally');
  }

  enemies(): Combatant[] {
    return this.combatants.filter((c) => c.side === 'enemy');
  }

  livingAllies(): Combatant[] {
    return this.allies().filter((c) => c.alive);
  }

  livingEnemies(): Combatant[] {
    return this.enemies().filter((c) => c.alive);
  }

  currentActor(): Combatant | undefined {
    return this.actorReady ? this.byId.get(this.actorReady) : undefined;
  }

  /** Ordem de iniciativa da rodada atual (ids), para a UI destacar. */
  turnOrder(): string[] {
    return [...this.order];
  }

  /* ─────────── alvos ─────────── */

  private poolFor(actor: Combatant, side: Targeting['side']): Combatant[] {
    if (side === 'self') return [actor];
    if (side === 'ally') return this.combatants.filter((c) => c.side === actor.side && c.alive);
    if (side === 'enemy') return this.combatants.filter((c) => c.side !== actor.side && c.alive);
    return this.combatants.filter((c) => c.alive);
  }

  private pickLowestHp(pool: Combatant[]): Combatant {
    return pool.reduce((lo, c) => (c.hp < lo.hp ? c : lo), pool[0] as Combatant);
  }

  /** Resolve alvos de uma skill: 'all'/'self' automático, 'single' usa escolha. */
  resolveTargets(actor: Combatant, targeting: Targeting, chosenIds?: string[]): Combatant[] {
    const pool = this.poolFor(actor, targeting.side);
    if (pool.length === 0) return [];
    if (targeting.side === 'self') return [actor];
    if (targeting.shape === 'all') return pool;
    if (chosenIds && chosenIds.length > 0) {
      const chosen = chosenIds
        .map((id) => this.byId.get(id))
        .filter((c): c is Combatant => !!c && c.alive);
      if (chosen.length > 0) return chosen;
    }
    if (targeting.shape === 'random') {
      const copy = [...pool];
      const picks: Combatant[] = [];
      for (let i = 0; i < targeting.count && copy.length > 0; i++) {
        picks.push(copy.splice(this.rng.int(0, copy.length - 1), 1)[0] as Combatant);
      }
      return picks;
    }
    return [this.pickLowestHp(pool)];
  }

  /* ─────────── loop de turnos ─────────── */

  private initiativeOrder(): string[] {
    return this.combatants
      .filter((c) => c.alive)
      .map((c) => ({ id: c.id, init: effectiveStats(c).spd + this.rng.range(0, 4) }))
      .sort((a, b) => b.init - a.init)
      .map((e) => e.id);
  }

  private beginRound(): void {
    this.round++;
    this.order = this.initiativeOrder();
    this.turnIndex = -1;
  }

  private advance(): void {
    this.turnStartEvents = [];
    let guard = 0;
    while (guard++ < 10000) {
      if (this.checkEnd()) {
        this.actorReady = null;
        return;
      }
      this.turnIndex++;
      if (this.turnIndex >= this.order.length) {
        this.beginRound();
        continue;
      }
      const id = this.order[this.turnIndex];
      const actor = id ? this.byId.get(id) : undefined;
      if (!actor || !actor.alive) continue;

      actor.defending = false;
      this.applyTurnStartTicks(actor, this.turnStartEvents);
      if (!actor.alive) continue;

      if (isBlocked(actor, 'action')) {
        this.turnStartEvents.push({ type: 'message', text: `${actor.name} está atordoado!` });
        this.decrementStatuses(actor);
        continue;
      }

      this.actorReady = actor.id;
      return;
    }
    this.actorReady = null;
  }

  /** Executa a ação do ator atual e devolve a timeline de eventos. */
  perform(action: BattleAction): BattleEvent[] {
    const events: BattleEvent[] = [];
    if (this.phase !== 'active') return events;
    const actor = this.actorReady ? this.byId.get(this.actorReady) : undefined;
    if (!actor || !actor.alive) {
      this.advance();
      return this.turnStartEvents;
    }

    this.resolve(actor, action, events);
    this.checkDeaths(events);

    if (this.phase === 'active' && !this.checkEnd()) {
      this.decrementStatuses(actor);
      this.advance();
      events.push(...this.turnStartEvents);
    }
    return events;
  }

  /** IA: decide a ação do inimigo atual. */
  autoAction(): BattleAction {
    const actor = this.currentActor();
    if (!actor) return { kind: 'defend' };
    const opponents = this.poolFor(actor, 'enemy');
    const friends = this.poolFor(actor, 'ally');
    const affordable = actor.skills
      .map((id) => Skills.get(id))
      .filter((s): s is NonNullable<typeof s> => !!s && actor.mp >= s.costMp);

    if (actor.ai === 'support') {
      const heal = affordable.find(
        (s) => s.targeting.side === 'ally' && s.effects.some((e) => e.type === 'heal'),
      );
      const hurt = friends
        .filter((f) => f.hp < maxHpOf(f) * 0.6)
        .sort((a, b) => a.hp / maxHpOf(a) - b.hp / maxHpOf(b));
      if (heal && hurt[0]) return { kind: 'skill', skillId: heal.id, targetIds: [hurt[0].id] };
    }

    if (actor.ai === 'defensive' && actor.hp < maxHpOf(actor) * 0.3 && this.rng.chance(0.4)) {
      return { kind: 'defend' };
    }

    const offensive = affordable.filter((s) => s.targeting.side === 'enemy');
    const preferSkill = actor.ai === 'caster' ? 0.8 : 0.5;
    if (offensive.length > 0 && opponents.length > 0 && this.rng.chance(preferSkill)) {
      const skill = this.rng.pick(offensive);
      const chosen =
        skill.targeting.shape === 'single' ? [this.pickLowestHp(opponents).id] : undefined;
      const targets = this.resolveTargets(actor, skill.targeting, chosen).map((t) => t.id);
      return { kind: 'skill', skillId: skill.id, targetIds: targets };
    }

    if (opponents.length > 0) {
      return { kind: 'attack', targetId: this.pickLowestHp(opponents).id };
    }
    return { kind: 'defend' };
  }

  /* ─────────── resolução ─────────── */

  private resolve(actor: Combatant, action: BattleAction, events: BattleEvent[]): void {
    switch (action.kind) {
      case 'defend': {
        actor.defending = true;
        events.push({ type: 'action', actorId: actor.id, label: 'Defender' });
        events.push({ type: 'message', text: `${actor.name} assume a guarda.` });
        return;
      }
      case 'flee': {
        events.push({ type: 'action', actorId: actor.id, label: 'Fugir' });
        const bossPresent = this.livingEnemies().some((e) => Enemies.get(e.enemyId ?? '')?.boss);
        const success = !bossPresent && this.rng.chance(this.fleeChance());
        events.push({ type: 'flee', success });
        if (success) this.phase = 'fled';
        else events.push({ type: 'message', text: 'A fuga falhou!' });
        return;
      }
      case 'attack': {
        const target = this.byId.get(action.targetId);
        events.push({ type: 'action', actorId: actor.id, label: 'Atacar' });
        if (target && target.alive) {
          const eff: DamageEffect = {
            type: 'damage',
            element: actor.attackElement,
            power: 5,
            scaling: [{ stat: 'atk', coeff: 1 }],
            hits: 1,
            canCrit: true,
          };
          this.applyDamage(actor, target, eff, events);
        }
        return;
      }
      case 'skill': {
        const skill = Skills.get(action.skillId);
        if (!skill) return;
        if (actor.mp < skill.costMp) {
          events.push({ type: 'message', text: `${actor.name} não tem MP para ${skill.name}.` });
          return;
        }
        actor.mp -= skill.costMp;
        if (skill.costMp > 0) events.push({ type: 'mp', targetId: actor.id, amount: -skill.costMp });
        if (skill.costHp > 0) {
          actor.hp = Math.max(0, actor.hp - skill.costHp);
          events.push({
            type: 'damage',
            targetId: actor.id,
            amount: skill.costHp,
            crit: false,
            element: 'physical',
          });
        }
        events.push({ type: 'action', actorId: actor.id, label: skill.name });
        const targets = this.resolveTargets(actor, skill.targeting, action.targetIds);
        this.applyEffects(actor, skill.effects, targets, events);
        return;
      }
      case 'item': {
        const item = Items.get(action.itemId);
        if (!item || item.kind !== 'consumable') return;
        if (this.opts.consumeItem && !this.opts.consumeItem(action.itemId)) {
          events.push({ type: 'message', text: `Sem ${item.name}.` });
          return;
        }
        events.push({ type: 'action', actorId: actor.id, label: item.name });
        const targets = action.targetIds
          .map((id) => this.byId.get(id))
          .filter((c): c is Combatant => !!c);
        this.applyEffects(actor, item.useEffects, targets, events);
        return;
      }
    }
  }

  private fleeChance(): number {
    const avg = (list: Combatant[]): number =>
      list.length === 0 ? 1 : list.reduce((s, c) => s + effectiveStats(c).spd, 0) / list.length;
    const diff = avg(this.livingAllies()) - avg(this.livingEnemies());
    return Math.min(0.9, Math.max(0.2, 0.55 + diff * 0.02));
  }

  private applyEffects(
    actor: Combatant,
    effects: readonly Effect[],
    targets: Combatant[],
    events: BattleEvent[],
  ): void {
    for (const effect of effects) {
      for (const target of targets) {
        if (!target.alive && effect.type !== 'revive') continue;
        this.applyEffect(actor, effect, target, events);
      }
    }
  }

  private applyEffect(
    actor: Combatant,
    effect: Effect,
    target: Combatant,
    events: BattleEvent[],
  ): void {
    switch (effect.type) {
      case 'damage':
        this.applyDamage(actor, target, effect, events);
        return;
      case 'heal': {
        const amount = computeHeal(
          this.rng,
          effect.power,
          effect.scaling,
          effectiveStats(actor),
          actor.level,
        );
        target.hp = Math.min(maxHpOf(target), target.hp + amount);
        events.push({ type: 'heal', targetId: target.id, amount });
        return;
      }
      case 'applyStatus': {
        if (!Statuses.has(effect.statusId)) return;
        if (this.rng.chance(effect.chance)) {
          this.applyStatus(target, effect.statusId, effect.duration, effect.stacks);
          events.push({ type: 'status', targetId: target.id, statusId: effect.statusId, applied: true });
        } else {
          events.push({ type: 'status', targetId: target.id, statusId: effect.statusId, applied: false });
        }
        return;
      }
      case 'restore': {
        if (effect.resource === 'hp') {
          target.hp = Math.min(maxHpOf(target), target.hp + effect.amount);
          events.push({ type: 'heal', targetId: target.id, amount: effect.amount });
        } else {
          target.mp = Math.min(maxMpOf(target), target.mp + effect.amount);
          events.push({ type: 'mp', targetId: target.id, amount: effect.amount });
        }
        return;
      }
      case 'cleanse': {
        const before = target.statuses.length;
        target.statuses = target.statuses.filter((s) => {
          const def = Statuses.get(s.statusId);
          return def ? !effect.kinds.includes(def.kind) : true;
        });
        if (target.statuses.length < before) {
          events.push({ type: 'message', text: `${target.name} é purificado.` });
        }
        return;
      }
      case 'revive': {
        if (!target.alive) {
          target.alive = true;
          target.hp = Math.max(1, Math.round(maxHpOf(target) * effect.hpPercent));
          events.push({ type: 'revive', targetId: target.id });
        }
        return;
      }
    }
  }

  private applyDamage(
    actor: Combatant,
    target: Combatant,
    effect: DamageEffect,
    events: BattleEvent[],
  ): void {
    const aStats = effectiveStats(actor);
    const dStats = effectiveStats(target);
    if (!computeHit(this.rng, aStats, dStats)) {
      events.push({ type: 'message', text: `${target.name} esquiva!` });
      return;
    }
    const resist = target.resistances[effect.element] ?? 1;
    for (let i = 0; i < effect.hits; i++) {
      const r = computeDamage(this.rng, effect, aStats, actor.level, dStats, resist);
      target.hp = Math.max(0, target.hp - r.amount);
      events.push({
        type: 'damage',
        targetId: target.id,
        amount: r.amount,
        crit: r.crit,
        element: effect.element,
      });
      if (target.hp <= 0) break;
    }
  }

  private applyStatus(target: Combatant, statusId: string, duration: number, stacks: number): void {
    const def = Statuses.get(statusId);
    if (!def) return;
    const existing = target.statuses.find((s) => s.statusId === statusId);
    if (existing) {
      if (def.stackable) existing.stacks = Math.min(def.maxStacks, existing.stacks + stacks);
      existing.duration = Math.max(existing.duration, duration);
    } else {
      target.statuses.push({
        statusId,
        duration,
        stacks: Math.min(def.maxStacks, stacks),
      });
    }
  }

  private applyTurnStartTicks(actor: Combatant, events: BattleEvent[]): void {
    for (const s of actor.statuses) {
      const def = Statuses.get(s.statusId);
      if (!def) continue;
      for (const tick of def.tickEffects) {
        if (tick.type === 'damage') {
          const dmg = Math.max(1, Math.round(tick.power * s.stacks));
          actor.hp = Math.max(0, actor.hp - dmg);
          events.push({
            type: 'damage',
            targetId: actor.id,
            amount: dmg,
            crit: false,
            element: tick.element,
          });
        } else if (tick.type === 'heal') {
          const amt = Math.max(1, Math.round(tick.power * s.stacks));
          actor.hp = Math.min(maxHpOf(actor), actor.hp + amt);
          events.push({ type: 'heal', targetId: actor.id, amount: amt });
        }
      }
    }
    if (actor.hp <= 0 && actor.alive) {
      actor.alive = false;
      events.push({ type: 'death', targetId: actor.id });
    }
  }

  private decrementStatuses(actor: Combatant): void {
    actor.statuses = actor.statuses
      .map((s) => ({ ...s, duration: s.duration - 1 }))
      .filter((s) => s.duration > 0);
  }

  private checkDeaths(events: BattleEvent[]): void {
    for (const c of this.combatants) {
      if (c.alive && c.hp <= 0) {
        c.alive = false;
        events.push({ type: 'death', targetId: c.id });
      }
    }
  }

  private checkEnd(): boolean {
    if (this.phase !== 'active') return true;
    if (this.livingEnemies().length === 0) {
      this.phase = 'won';
      return true;
    }
    if (this.livingAllies().length === 0) {
      this.phase = 'lost';
      return true;
    }
    return false;
  }
}
