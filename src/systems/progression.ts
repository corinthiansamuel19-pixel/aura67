import { computeStats, skillsUpTo, xpToNext, type PartyMember } from '@/domain/party';
import type { GameStore } from './game-store';

export interface LevelUp {
  memberId: string;
  name: string;
  from: number;
  to: number;
  newSkills: string[];
}

function levelUpMember(member: PartyMember, emit: (level: number) => void): LevelUp | null {
  const from = member.level;
  const newSkills: string[] = [];
  while (member.xp >= xpToNext(member.level)) {
    member.xp -= xpToNext(member.level);
    member.level++;
    const before = new Set(member.learnedSkills);
    member.learnedSkills = skillsUpTo(member.classId, member.level);
    for (const s of member.learnedSkills) if (!before.has(s)) newSkills.push(s);
    // Sobe de nível já restaura HP/MP ao novo máximo.
    const stats = computeStats(member.classId, member.level, member.equipment);
    member.hp = stats.maxHp;
    member.mp = stats.maxMp;
    emit(member.level);
  }
  return member.level > from ? { memberId: member.id, name: member.name, from, to: member.level, newSkills } : null;
}

/** Concede XP a todos os membros vivos, aplicando level-ups. */
export function grantXp(store: GameStore, amount: number): LevelUp[] {
  const ups: LevelUp[] = [];
  for (const member of store.party) {
    if (member.hp <= 0) continue;
    member.xp += amount;
    const up = levelUpMember(member, (level) => store.bus.emit('party:leveledUp', { memberId: member.id, level }));
    if (up) ups.push(up);
  }
  return ups;
}
