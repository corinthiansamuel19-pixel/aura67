import { describe, it, expect } from 'vitest';
import { GAME_CONFIG } from '@/config/game-config';

// Teste de fumaça: garante que a config base existe e que o Vitest + aliases
// (@/*) estão funcionando desde a Etapa 1.
describe('GAME_CONFIG', () => {
  it('define a resolução base 1280x720', () => {
    expect(GAME_CONFIG.width).toBe(1280);
    expect(GAME_CONFIG.height).toBe(720);
  });

  it('nomeia o mundo como Valdaura', () => {
    expect(GAME_CONFIG.world).toBe('Valdaura');
    expect(GAME_CONFIG.title).toBe('aura67');
  });
});
