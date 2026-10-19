// Pokémon die in het hoge gras kunnen opduiken.
// stars: zeldzaamheid (0 = vaak, 4 = heel zeldzaam), height in meter.
// motion: 'hop' (standaard), 'float' (zweeft op `hover` meter), 'flop' (spartelt).
// Alle modellen kijken standaard naar -z; `rotation` corrigeert naar +z.
const FACE_FORWARD = Math.PI;

export const SPECIES = [
  { id: 'eevee', name: 'Eevee', stars: 0, height: 0.84 },
  { id: 'charmander', name: 'Charmander', stars: 0, height: 1.05 },
  { id: 'squirtle', name: 'Squirtle', stars: 0, height: 0.98, rotation: (Math.PI * 5) / 4 },
  { id: 'magikarp', name: 'Magikarp', stars: 0, height: 1.12, motion: 'flop', rotation: Math.PI / 2 },
  { id: 'pikachu', name: 'Pikachu', stars: 0, height: 0.91 },
  { id: 'oddish', name: 'Oddish', stars: 0, height: 0.84 },
  { id: 'bellsprout', name: 'Bellsprout', stars: 0, height: 1.26 },
  { id: 'cubone', name: 'Cubone', stars: 1, height: 0.91 },
  { id: 'poliwag', name: 'Poliwag', stars: 1, height: 0.91 },
  { id: 'jigglypuff', name: 'Jigglypuff', stars: 1, height: 0.84 },
  { id: 'magnemite', name: 'Magnemite', stars: 1, height: 0.84, motion: 'float', hover: 0.6 },
  { id: 'snorlax', name: 'Snorlax', stars: 2, height: 2 },
  { id: 'haunter', name: 'Haunter', stars: 2, height: 1.4, motion: 'float', hover: 0.5 },
  { id: 'mew', name: 'Mew', stars: 4, height: 0.84, motion: 'float', hover: 0.8 },
].map((species) => ({
  motion: 'hop',
  hover: 0,
  rotation: FACE_FORWARD,
  model: `models/pokemon/${species.id}.glb`,
  ...species,
}));

export const getSpecies = (id) => SPECIES.find((species) => species.id === id);

// Per aantal sterren: kans om op te duiken, vangkans per pokéball, kans om te vluchten na een mislukte worp.
export const RARITY = {
  0: { weight: 10, catchRate: 0.55, fleeRate: 0.1 },
  1: { weight: 4, catchRate: 0.4, fleeRate: 0.15 },
  2: { weight: 1.5, catchRate: 0.25, fleeRate: 0.25 },
  4: { weight: 0.5, catchRate: 0.1, fleeRate: 0.4 },
};

// Elke ENCOUNTER_STEP meter in hoog gras: ENCOUNTER_CHANCE kans op een encounter.
export const ENCOUNTER_STEP = 1;
export const ENCOUNTER_CHANCE = 0.08;
// Na een encounter eerst zoveel meter vrij lopen.
export const ENCOUNTER_GRACE = 4;

export const WILD_LEVEL = { min: 3, max: 7, perStar: 2 };

export const POKEBALL_MODEL = { url: 'models/pokeball.glb', height: 0.3 };
