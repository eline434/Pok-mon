import { SPECIES, RARITY, ENCOUNTER_STEP, ENCOUNTER_CHANCE, ENCOUNTER_GRACE } from '../constants/pokemon.js';

// Kiest een soort op basis van zeldzaamheid (gewogen loting).
export const pickSpecies = () => {
  const total = SPECIES.reduce((sum, species) => sum + RARITY[species.stars].weight, 0);
  let roll = Math.random() * total;
  for (const species of SPECIES) {
    roll -= RARITY[species.stars].weight;
    if (roll <= 0) return species;
  }
  return SPECIES[0];
};

// Houdt bij hoeveel de trainer in hoog gras loopt; per meter een kans op een encounter.
export const createEncounterChecker = (startPosition) => {
  const last = { x: startPosition.x, z: startPosition.z };
  let distance = 0;
  let grace = 0;

  const update = (position, inTallGrass) => {
    const step = Math.hypot(position.x - last.x, position.z - last.z);
    last.x = position.x;
    last.z = position.z;

    if (!inTallGrass) {
      distance = 0;
      return null;
    }
    if (grace > 0) {
      grace -= step;
      return null;
    }

    distance += step;
    while (distance >= ENCOUNTER_STEP) {
      distance -= ENCOUNTER_STEP;
      if (Math.random() < ENCOUNTER_CHANCE) return pickSpecies();
    }
    return null;
  };

  const cooldown = () => {
    grace = ENCOUNTER_GRACE;
    distance = 0;
  };

  return { update, cooldown };
};
