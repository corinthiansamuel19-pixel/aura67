/**
 * Configuração central e constantes globais do jogo.
 *
 * Fonte única de valores compartilhados (resolução base, identidade, versão).
 * Mantido como TS puro (sem dependência de Phaser) para poder ser lido tanto
 * pela apresentação quanto pelos testes/núcleo.
 */
export const GAME_CONFIG = {
  /** Resolução base de design. A escala responsiva (FIT) parte destes valores. */
  width: 1280,
  height: 720,

  /** Identidade do jogo. */
  title: 'aura67',
  world: 'Valdaura',
  version: '0.1.0',

  /** Cores-tema (identidade "Aura": brilho arcano sobre ruínas). */
  colors: {
    background: '#0b0d10',
    aura: '#5fd3c4',
    gold: '#e8d9a0',
    muted: '#8a97a0',
  },
} as const;

export type GameConfig = typeof GAME_CONFIG;
