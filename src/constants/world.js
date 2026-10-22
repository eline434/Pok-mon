// Layout van het veld. Posities worden met een vaste seed gegenereerd.
export const WORLD_SEED = 151;

// Rond het startpunt blijft alles vrij.
export const SPAWN_CLEAR_RADIUS = 5;

// Velden met hoog gras: hier kunnen wilde pokémon opduiken.
// Elk veld is een groepje overlappende cirkels ("blobs") -> grillige vormen.
export const TALL_GRASS_PATCHES = {
  count: 16,
  blobs: { min: 3, max: 6 },
  blobRadius: { min: 1.2, max: 2.4 },
  blobSpread: { min: 1.5, max: 3.6 }, // afstand van een blob tot het midden van het veld
  minDistance: 8, // tussen de middens van twee velden
  limit: 27, // velden blijven binnen -limit..limit
};
export const TALL_GRASS_SPACING = 1.15;

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

// Gras dat wegbuigt voor de trainer/buddy en zacht wiegt in de wind (vertex-shader in TSL).
export const GRASS_MOTION = {
  height: 0.7, // ongeveer de hoogte van een pluk: daarboven buigt het maximaal
  bendRadius: 1.4, // binnen deze afstand buigt het gras weg
  bendStrength: 0.55,
  rustle: 0.08, // extra trillen terwijl je erdoor loopt
  wind: 0.05,
};
