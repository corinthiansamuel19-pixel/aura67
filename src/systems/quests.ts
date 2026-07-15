import { Quests } from '@/data/registry/content';
import type { Objective, Quest } from '@/data/schemas';
import type { QuestProgress } from '@/domain/game-state';
import type { GameStore } from './game-store';
import { grantXp } from './progression';

/**
 * Sistema de quests orientado a EVENTOS: observa o bus e casa contra os
 * objetivos declarativos das quests. Quests são 100% dados; a engine é genérica.
 */
export class QuestSystem {
  private offs: Array<() => void> = [];

  constructor(private readonly store: GameStore) {}

  attach(): void {
    const bus = this.store.bus;
    this.offs.push(
      bus.on('enemy:killed', ({ enemyId }) => this.onKill(enemyId)),
      bus.on('item:acquired', () => this.reevaluateAll()),
      bus.on('flag:set', () => this.reevaluateAll()),
      bus.on('map:entered', ({ mapId }) => this.onReach(mapId)),
      bus.on('npc:talked', ({ npcId }) => this.onTalk(npcId)),
    );
  }

  detach(): void {
    for (const off of this.offs) off();
    this.offs = [];
  }

  progressFor(questId: string): QuestProgress | undefined {
    return this.store.state.quests.find((q) => q.questId === questId);
  }

  isActive(questId: string): boolean {
    const p = this.progressFor(questId);
    return !!p && !p.completed;
  }

  isCompleted(questId: string): boolean {
    return this.progressFor(questId)?.completed ?? false;
  }

  /** Inicia uma quest (se os pré-requisitos estiverem cumpridos e não existir). */
  start(questId: string): boolean {
    const quest = Quests.get(questId);
    if (!quest || this.progressFor(questId)) return false;
    for (const pre of quest.prerequisites) {
      if (!this.isCompleted(pre)) return false;
    }
    this.store.state.quests.push({ questId, stageIndex: 0, counters: {}, completed: false });
    this.store.bus.emit('quest:started', { questId });
    this.store.bus.emit('toast', { text: `Nova missão: ${quest.name}`, tone: 'info' });
    this.reevaluate(questId);
    return true;
  }

  private counterKey(stageIndex: number, objIndex: number): string {
    return `${stageIndex}:${objIndex}`;
  }

  private satisfied(progress: QuestProgress, obj: Objective, objIndex: number): boolean {
    const key = this.counterKey(progress.stageIndex, objIndex);
    const count = progress.counters[key] ?? 0;
    switch (obj.type) {
      case 'kill':
        return count >= obj.count;
      case 'collect':
        return this.store.countItem(obj.itemId) >= obj.count;
      case 'reach':
      case 'talk':
        return count >= 1;
      case 'flag':
        return this.store.getFlag(obj.flag);
    }
  }

  private reevaluate(questId: string): void {
    const progress = this.progressFor(questId);
    const quest = Quests.get(questId);
    if (!progress || progress.completed || !quest) return;
    let stage = quest.stages[progress.stageIndex];
    while (stage && stage.objectives.every((obj, i) => this.satisfied(progress, obj, i))) {
      this.store.bus.emit('quest:stageAdvanced', { questId, stageId: stage.id });
      progress.stageIndex++;
      if (progress.stageIndex >= quest.stages.length) {
        this.complete(quest, progress);
        return;
      }
      stage = quest.stages[progress.stageIndex];
    }
  }

  private reevaluateAll(): void {
    for (const p of this.store.state.quests) {
      if (!p.completed) this.reevaluate(p.questId);
    }
  }

  private complete(quest: Quest, progress: QuestProgress): void {
    progress.completed = true;
    if (quest.rewardGold > 0) this.store.addGold(quest.rewardGold);
    for (const r of quest.rewardItems) this.store.addItem(r.itemId, r.qty);
    if (quest.rewardXp > 0) grantXp(this.store, quest.rewardXp);
    this.store.bus.emit('quest:completed', { questId: quest.id });
    this.store.bus.emit('toast', { text: `Missão concluída: ${quest.name}`, tone: 'good' });
  }

  private bumpCounter(questId: string, match: (obj: Objective) => boolean, cap: number): void {
    const progress = this.progressFor(questId);
    const quest = Quests.get(questId);
    if (!progress || progress.completed || !quest) return;
    const stage = quest.stages[progress.stageIndex];
    if (!stage) return;
    stage.objectives.forEach((obj, i) => {
      if (match(obj)) {
        const key = this.counterKey(progress.stageIndex, i);
        progress.counters[key] = Math.min(cap, (progress.counters[key] ?? 0) + 1);
      }
    });
    this.reevaluate(questId);
  }

  private onKill(enemyId: string): void {
    for (const p of [...this.store.state.quests]) {
      if (p.completed) continue;
      this.bumpCounter(
        p.questId,
        (obj) => obj.type === 'kill' && obj.enemyId === enemyId,
        Number.MAX_SAFE_INTEGER,
      );
    }
  }

  private onReach(mapId: string): void {
    for (const p of [...this.store.state.quests]) {
      if (p.completed) continue;
      this.bumpCounter(p.questId, (obj) => obj.type === 'reach' && obj.mapId === mapId, 1);
    }
  }

  private onTalk(npcId: string): void {
    for (const p of [...this.store.state.quests]) {
      if (p.completed) continue;
      this.bumpCounter(p.questId, (obj) => obj.type === 'talk' && obj.npcId === npcId, 1);
    }
  }
}
