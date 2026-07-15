import { describe, it, expect } from 'vitest';
import { Content, validateReferences } from './content';

describe('conteúdo de Valdaura', () => {
  it('carrega todos os registries com conteúdo', () => {
    expect(Content.elements.size).toBeGreaterThan(0);
    expect(Content.statuses.size).toBeGreaterThan(0);
    expect(Content.skills.size).toBeGreaterThan(0);
    expect(Content.items.size).toBeGreaterThan(0);
    expect(Content.classes.size).toBe(4);
    expect(Content.enemies.size).toBeGreaterThan(0);
    expect(Content.maps.size).toBeGreaterThan(0);
    expect(Content.dialogues.size).toBeGreaterThan(0);
    expect(Content.quests.size).toBeGreaterThan(0);
  });

  it('integridade referencial (content:check) passa', () => {
    expect(() => validateReferences()).not.toThrow();
  });
});
