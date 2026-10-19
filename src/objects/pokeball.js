import { POKEBALL_MODEL } from '../constants/pokemon.js';
import { loadPrototype } from './decor.js';
import { createModelGroup } from './pokemon.js';

let prototype = null;

export const loadPokeballModel = async () => {
  prototype = await loadPrototype(POKEBALL_MODEL);
};

// Model wordt rond zijn midden gezet zodat hij mooi rond zijn as draait.
export const createPokeball = () => {
  const group = createModelGroup(prototype);
  group.children.forEach((mesh) => (mesh.position.y = -POKEBALL_MODEL.height / 2));
  return group;
};
