import * as THREE from 'three/webgpu';
import {
  MODELS,
  COUNTS,
  SPAWN_CLEAR_RADIUS,
  BORDER_INNER,
  BORDER_OUTER,
  TALL_GRASS_ZONES,
} from '../constants/world.js';
import { loadPrototype, createInstances } from './decor.js';

const isFree = (x, z, margin, taken, minDistance) => {
  if (x * x + z * z < (SPAWN_CLEAR_RADIUS + margin) ** 2) return false;
  for (const zone of TALL_GRASS_ZONES) {
    if ((x - zone.x) ** 2 + (z - zone.z) ** 2 < (zone.radius + margin) ** 2) return false;
  }
  return taken.every((p) => (p.x - x) ** 2 + (p.z - z) ** 2 > minDistance ** 2);
};

// Willekeurige posities binnen het speelveld, buiten zones en spawn.
const scatter = (random, count, { limit, margin, minDistance, scale: [minScale, maxScale] }, taken) => {
  const result = [];
  for (let tries = 0; result.length < count && tries < count * 50; tries++) {
    const x = random.range(-limit, limit);
    const z = random.range(-limit, limit);
    if (!isFree(x, z, margin, taken, minDistance)) continue;
    const item = { x, z, rotation: random.range(0, Math.PI * 2), scale: random.range(minScale, maxScale) };
    result.push(item);
    taken.push(item);
  }
  return result;
};

// Bomen in een vierkante band rond het veld.
const border = (random, count) => {
  const result = [];
  for (let i = 0; i < count; i++) {
    const along = random.range(-BORDER_OUTER, BORDER_OUTER);
    const depth = random.range(BORDER_INNER, BORDER_OUTER) * (random.next() < 0.5 ? -1 : 1);
    const [x, z] = i % 2 === 0 ? [along, depth] : [depth, along];
    result.push({ x, z, rotation: random.range(0, Math.PI * 2), scale: random.range(0.9, 1.4) });
  }
  return result;
};

export const createScenery = async (random) => {
  const [tree, bush, flowerGroup, flowers, flower] = await Promise.all([
    loadPrototype(MODELS.tree),
    loadPrototype(MODELS.bush),
    loadPrototype(MODELS.flowerGroup),
    loadPrototype(MODELS.flowers),
    loadPrototype(MODELS.flower),
  ]);

  const taken = [];
  const limit = BORDER_INNER - 4;
  const trees = [
    ...border(random, COUNTS.borderTrees),
    ...scatter(random, COUNTS.trees, { limit, margin: 2, minDistance: 4, scale: [0.8, 1.2] }, taken),
  ];
  const bushes = scatter(random, COUNTS.bushes, { limit, margin: 1, minDistance: 2, scale: [0.8, 1.3] }, taken);
  const allFlowers = scatter(random, COUNTS.flowers, { limit, margin: 0.5, minDistance: 0.8, scale: [0.8, 1.4] }, taken);

  // Bloemen verdelen over de drie soorten.
  const third = Math.ceil(allFlowers.length / 3);

  const group = new THREE.Group();
  group.add(
    createInstances(tree, trees, { castShadow: true }),
    createInstances(bush, bushes, { castShadow: true }),
    createInstances(flowerGroup, allFlowers.slice(0, third)),
    createInstances(flowers, allFlowers.slice(third, third * 2)),
    createInstances(flower, allFlowers.slice(third * 2)),
  );

  return { group };
};
