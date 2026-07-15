import type { DialogueChoice, DialogueNode } from '@/data/schemas';
import type { GameStore } from './game-store';
import type { QuestSystem } from './quests';

/** Contexto para aplicar as ações declarativas dos nós/escolhas de diálogo. */
export interface DialogueActionCtx {
  store: GameStore;
  quests: QuestSystem;
  onBattle?: (enemyIds: string[]) => void;
}

/** Escolhas visíveis dado o estado (filtra por requireFlag). */
export function visibleChoices(store: GameStore, node: DialogueNode): DialogueChoice[] {
  return node.choices.filter((c) => c.requireFlag === undefined || store.getFlag(c.requireFlag));
}

/** Aplica os efeitos de entrar num nó (ordem: quest -> item -> flag -> batalha). */
export function applyNodeActions(ctx: DialogueActionCtx, node: DialogueNode): void {
  if (node.startQuest) ctx.quests.start(node.startQuest);
  if (node.giveItem) ctx.store.addItem(node.giveItem.itemId, node.giveItem.qty);
  if (node.setFlag) ctx.store.setFlag(node.setFlag, true);
  if (node.startBattle && node.startBattle.length > 0 && ctx.onBattle) {
    ctx.onBattle(node.startBattle);
  }
}

/** Aplica os efeitos de escolher uma opção. */
export function applyChoiceActions(ctx: DialogueActionCtx, choice: DialogueChoice): void {
  if (choice.startQuest) ctx.quests.start(choice.startQuest);
  if (choice.giveItem) ctx.store.addItem(choice.giveItem.itemId, choice.giveItem.qty);
  if (choice.setFlag) ctx.store.setFlag(choice.setFlag, true);
}
