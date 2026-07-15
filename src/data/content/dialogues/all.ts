import { defineDialogue } from '@/data/schemas';

export default [
  defineDialogue({
    id: 'dying-knight',
    start: 'start',
    nodes: [
      {
        id: 'start',
        speaker: 'Cavaleiro Moribundo',
        text: 'Você... desperta. O Silêncio Branco levou tudo... menos você.',
        next: 'shard',
      },
      {
        id: 'shard',
        speaker: 'Cavaleiro Moribundo',
        text: 'Tome — um Estilhaço do Núcleo. Ele o reconhece. Você é um Aurífice.',
        giveItem: { itemId: 'aura-shard', qty: 1 },
        next: 'go',
      },
      {
        id: 'go',
        speaker: 'Cavaleiro Moribundo',
        text: 'Vá ao Fortim Cinza, a leste, cruzando o Ermo. Encontre a Anciã Véu... antes que as facções encontrem você.',
        startQuest: 'q-reach-fortim',
        setFlag: 'met-dying-knight',
        next: null,
      },
    ],
  }),

  defineDialogue({
    id: 'warden-sentry',
    start: 'start',
    nodes: [
      {
        id: 'start',
        speaker: 'Sentinela Vigia',
        text: 'O ermo range de Aura, andarilho. O que procura?',
        choices: [
          { text: 'O que houve aqui?', next: 'lore' },
          { text: 'Preciso de trabalho.', next: 'quest', startQuest: 'q-cull-swarm' },
          { text: 'Nada. Adeus.', next: null },
        ],
      },
      {
        id: 'lore',
        speaker: 'Sentinela Vigia',
        text: 'A Coroa se rompeu e a Aura vazou. Nós, os Vigias, tentamos curar o que restou.',
        next: 'start',
      },
      {
        id: 'quest',
        speaker: 'Sentinela Vigia',
        text: 'Os Enxames da Fenda infestam estas trilhas. Extermine três e a recompensa é sua.',
        next: null,
      },
    ],
  }),

  defineDialogue({
    id: 'elder-veil',
    start: 'start',
    nodes: [
      {
        id: 'start',
        speaker: 'Anciã Véu',
        text: 'Então o Estilhaço achou um novo portador. Sente-se, Aurífice — há muito a decidir.',
        choices: [
          { text: 'Fale-me do Ocaso.', next: 'lore' },
          { text: 'O que devo fazer?', next: 'hook' },
        ],
      },
      {
        id: 'lore',
        speaker: 'Anciã Véu',
        text: 'O Império ergueu a Coroa para sugar Aura do mundo. A ganância a rompeu. O medieval e o pós-apocalipse são o antes e o depois de uma só noite.',
        next: 'start',
      },
      {
        id: 'hook',
        speaker: 'Anciã Véu',
        text: 'A Fenda sangra Aura. Vá à sua borda e enfrente o que cresce lá — o Colosso-Coroa. Só então saberemos seu destino.',
        startQuest: 'q-seek-core',
        setFlag: 'talked-elder',
        next: null,
      },
    ],
  }),

  defineDialogue({
    id: 'forest-hermit',
    start: 'start',
    nodes: [
      {
        id: 'start',
        speaker: 'Eremita da Mata',
        text: 'A floresta ainda respira sob a poeira da Aura. Pise leve, Aurífice — nem tudo aqui quer te devorar.',
        next: null,
      },
    ],
  }),

  defineDialogue({
    id: 'merchant-ovid',
    start: 'start',
    nodes: [
      {
        id: 'start',
        speaker: 'Mercador Óvido',
        text: 'As lojas abrem quando o mundo permitir. Por ora, só posso desejar-lhe sorte — e vender silêncio.',
        next: null,
      },
    ],
  }),

  defineDialogue({
    id: 'captain-brand',
    start: 'start',
    nodes: [
      {
        id: 'start',
        speaker: 'Capitão Brand',
        text: 'Sobreviventes se unem ou morrem sozinhos. Sua companhia luta bem — mantenha-a viva.',
        next: null,
      },
    ],
  }),

  defineDialogue({
    id: 'fenda-presence',
    start: 'start',
    nodes: [
      {
        id: 'start',
        speaker: 'A Presença da Fenda',
        text: 'Pequeno faiscar de Aura... veio devolver o que roubou, ou alimentar a Fenda?',
        choices: [
          { text: 'Vim enfrentá-la.', next: 'fight' },
          { text: 'Ainda não.', next: null },
        ],
      },
      {
        id: 'fight',
        speaker: 'A Presença da Fenda',
        text: 'Então canalize, Aurífice — ou seja consumido.',
        startBattle: ['ashfont-colossus'],
        next: null,
      },
    ],
  }),
];
