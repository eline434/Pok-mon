// Layout van het veld. Posities worden met een vaste seed gegenereerd.
export const WORLD_SEED = 151;

// Rond het startpunt blijft alles vrij.
export const SPAWN_CLEAR_RADIUS = 5;

// Zones met hoog gras: hier kunnen wilde pokémon opduiken (Fase 3).
export const TALL_GRASS_ZONES = [
  { x: -14, z: -10, radius: 7 },
  { x: 15, z: -16, radius: 6 },
  { x: 10, z: 13, radius: 6.5 },
  { x: -16, z: 16, radius: 5 },
];
export const TALL_GRASS_SPACING = 1.6;

// Decor-modellen: url + hoogte in meter (modellen worden hierop geschaald).
export const MODELS = {
  grass: { url: 'models/grass.glb', height: 0.9 },
  tree: { url: 'models/tree.glb', height: 5 },
  bush: { url: 'models/bush.glb', height: 1.1 },
  flowerGroup: { url: 'models/flower-group.glb', height: 0.7 },
  flowers: { url: 'models/flower-2.glb', height: 0.5 },
  flower: { url: 'models/flower-3.glb', height: 0.6 },
};

// Bomenrand: houdt de speler binnen en verbergt de rand van het veld.
export const PLAYER_LIMIT = 31;
export const BORDER_INNER = 34;
export const BORDER_OUTER = 40;

export const COUNTS = {
  borderTrees: 90,
  trees: 18,
  bushes: 30,
  flowers: 140,
};
