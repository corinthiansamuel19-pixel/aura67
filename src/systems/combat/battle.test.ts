import { describe, it, expect } from 'vitest';
import { createMember } from '@/domain/party';
import { combatantFromEnemy, combatantFromMember } from '@/domain/combatant';
import { Enemies } from '@/data/registry/content';
import { Battle, type BattleAction } from './battle';

function runToEnd(seed: number, playerStrategy: 'attack' | 'skill' = 'attack') {
  const allies = [
    combatantFromMember(createMember('knight')),
    combatantFromMember(createMember('aurifice')),
  ];
  const enemies = [
    combatantFromEnemy(Enemies.require('scrap-hound'), 'e1'),
    combatantFromEnemy(Enemies.require('scrap-hound'), 'e2'),
  ];
  const battle = new Battle(allies, enemies, seed);

  let guard = 0;
  const eventCount: number[] = [];
  while (!battle.over && guard++ < 1000) {
    const actor = battle.currentActor();
    if (!actor) break;
    let action: BattleAction;
    if (actor.isPlayer) {
      const target = battle.livingEnemies()[0];
      if (!target) {
        action = { kind: 'defend' };
      } else if (playerStrategy === 'skill' && actor.skills[0]) {
        action = { kind: 'skill', skillId: actor.skills[0], targetIds: [target.id] };
      } else {
        action = { kind: 'attack', targetId: target.id };
      }
    } else {
      action = battle.autoAction();
    }
    eventCount.push(battle.perform(action).length);
  }
  return { result: battle.result, rounds: battle.round, turns: guard, eventCount };
}

describe('Battle', () => {
  it('a party derrota inimigos fracos', () => {
    expect(runToEnd(123).result).toBe('win');
  });

  it('é determinístico para a mesma semente', () => {
    expect(runToEnd(777)).toEqual(runToEnd(777));
  });

  it('sementes diferentes podem divergir na duração', () => {
    // não garante resultado diferente, mas a batalha sempre termina
    expect(runToEnd(1).result).not.toBeNull();
    expect(runToEnd(2).result).not.toBeNull();
  });

  it('skills são usáveis e a party ainda vence', () => {
    expect(runToEnd(55, 'skill').result).toBe('win');
  });
});
