// De 3 NPC-trainers in het veld. Ze gebruiken allemaal trainer2.glb, met andere kleuren.
// colors: vervangt vlakjes in het 4x4 kleurenpalet van het model.
export const NPC_MODEL_URL = 'models/trainer2.glb';
export const NPC_HEIGHT = 1.6;

// Vlakjes in het palet (rij, kolom) die per NPC een andere kleur krijgen.
export const PALETTE_CELLS = {
  hair: [0, 1],
  shirt: [1, 0],
  shorts: [1, 1],
  shoes: [1, 2],
};
export const PALETTE_GRID = 4;

export const NPCS = [
  {
    id: 'lotte',
    name: 'Lotte',
    position: { x: 7, z: -11 },
    pokemon: 'oddish',
    baseLevel: 5,
    colors: { hair: '#6b3e26', shirt: '#4caf50', shorts: '#2e4a7d', shoes: '#f5f5f5' },
  },
  {
    id: 'noor',
    name: 'Noor',
    position: { x: -15, z: 2 },
    pokemon: 'poliwag',
    baseLevel: 7,
    colors: { hair: '#1f1f24', shirt: '#2f7bd6', shorts: '#e9e4d8', shoes: '#f2b632' },
  },
  {
    id: 'fien',
    name: 'Fien',
    position: { x: 14, z: 12 },
    pokemon: 'haunter',
    baseLevel: 9,
    colors: { hair: '#5b2a86', shirt: '#8e44c9', shorts: '#26222e', shoes: '#e0457b' },
  },
];

// Na elke overwinning is de pokémon van de NPC zoveel levels sterker.
export const NPC_LEVEL_STEP = 3;

// Hoe dicht je bij een NPC moet staan om te kunnen vechten, en hoe ver hij je volgt met zijn blik.
export const NPC_TALK_RADIUS = 3.5;
export const NPC_LOOK_RADIUS = 9;
// Rond NPC's komt geen hoog gras of decor.
export const NPC_CLEAR_RADIUS = 3.5;
