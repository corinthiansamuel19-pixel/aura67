import Phaser from 'phaser';

/** Paleta e tipografia da UI (identidade "Aura sobre ruínas"). */
export const UI = {
  bg: '#0b0d10',
  panel: '#141a20',
  panelBorder: '#2a3540',
  overlay: 'rgba(6,8,10,0.72)',
  text: '#d9e0e6',
  textDim: '#8a97a0',
  gold: '#e8d9a0',
  aura: '#5fd3c4',
  danger: '#ff6b6b',
  good: '#8fe0a0',
  hp: '#7ad17a',
  mp: '#6ba4ff',
  xp: '#e8d9a0',
  selected: '#5fd3c4',
  fontTitle: 'Georgia, serif',
  fontBody: 'system-ui, "Segoe UI", sans-serif',
  fontMono: 'ui-monospace, monospace',
} as const;

/** Converte '#rrggbb' para inteiro 0xRRGGBB do Phaser. */
export function hex(color: string): number {
  return Phaser.Display.Color.HexStringToColor(color).color;
}
