import { defineQuest } from '@/data/schemas';

export default [
  defineQuest({
    id: 'q-reach-fortim',
    name: 'Rumo ao Fortim',
    description: 'O cavaleiro moribundo mandou você buscar a Anciã Véu no Fortim Cinza.',
    giver: 'dying-knight',
    stages: [
      {
        id: 's1',
        text: 'Cruze o Ermo e alcance o Fortim Cinza.',
        objectives: [{ type: 'reach', mapId: 'fortim-cinza', text: 'Alcance o Fortim Cinza' }],
      },
    ],
    rewardXp: 25,
    rewardGold: 15,
  }),

  defineQuest({
    id: 'q-cull-swarm',
    name: 'Praga do Ermo',
    description: 'A Sentinela Vigia pediu que você extermine os Enxames da Fenda.',
    giver: 'warden-sentry',
    stages: [
      {
        id: 's1',
        text: 'Extermine 3 Enxames da Fenda no Ermo.',
        objectives: [{ type: 'kill', enemyId: 'rot-swarm', count: 3, text: 'Enxames exterminados' }],
      },
    ],
    rewardXp: 45,
    rewardGold: 20,
    rewardItems: [{ itemId: 'greater-elixir', qty: 1 }],
  }),

  defineQuest({
    id: 'q-seek-core',
    name: 'O Destino da Aura',
    description: 'A Anciã Véu te enviou à Borda da Fenda para enfrentar o Colosso-Coroa.',
    giver: 'elder-veil',
    stages: [
      {
        id: 's1',
        text: 'Ouça o conselho da Anciã Véu.',
        objectives: [{ type: 'flag', flag: 'talked-elder', text: 'Falar com a Anciã Véu' }],
      },
      {
        id: 's2',
        text: 'Enfrente o Colosso-Coroa na Borda da Fenda.',
        objectives: [
          { type: 'kill', enemyId: 'ashfont-colossus', count: 1, text: 'Derrote o Colosso-Coroa' },
        ],
      },
    ],
    rewardXp: 250,
    rewardGold: 120,
    rewardItems: [{ itemId: 'phoenix-ember', qty: 1 }],
  }),
];
