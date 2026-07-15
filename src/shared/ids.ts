/**
 * Aliases de ID de conteúdo. Referências entre conteúdos são SEMPRE por ID
 * (string kebab-case, ex.: 'mutant-ghoul'), nunca por objeto embutido — isso
 * mantém os dados desacoplados e o save-game pequeno e estável.
 *
 * (Nota de escopo) Optamos por aliases simples em vez de branded types para
 * reduzir atrito ao longo de toda a base; a integridade das referências é
 * garantida em runtime pelo content-registry.
 */
export type ElementId = string;
export type ItemId = string;
export type SkillId = string;
export type StatusId = string;
export type ClassId = string;
export type EnemyId = string;
export type MapId = string;
export type NpcId = string;
export type DialogueId = string;
export type QuestId = string;
export type LootTableId = string;
