import * as THREE from 'three/webgpu';
import {
  MODELS,
  COUNTS,
  SPAWN_CLEAR_RADIUS,
  BORDER_INNER,
  BORDER_OUTER,
} from '../constants/world.js';
import { loadPrototype, createInstances, writeInstanceMatrices } from './decor.js';
import { TALL_GRASS_BLOBS } from './tallGrass.js';

const isFree = (x, z, margin, taken, minDistance) => {
  if (x * x + z * z < (SPAWN_CLEAR_RADIUS + margin) ** 2) return false;
  for (const blob of TALL_GRASS_BLOBS) {
    if ((x - blob.x) ** 2 + (z - blob.z) ** 2 < (blob.radius + margin) ** 2) return false;
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

// Hoe ver een model (bv. een groepje dennen) zich horizontaal uitstrekt vanaf zijn midden.
const getFootprint = (parts) => {
  let footprint = 0;
  for (const { geometry } of parts) {
    geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox;
    footprint = Math.max(footprint, Math.hypot(Math.max(-min.x, max.x), Math.max(-min.z, max.z)));
  }
  return footprint;
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

  const layer = (parts, transforms, options) => ({
    instances: createInstances(parts, transforms, options),
    transforms,
    footprint: getFootprint(parts),
  });

  const layers = [
    layer(tree, trees, { castShadow: true }),
    layer(bush, bushes, { castShadow: true }),
    layer(flowerGroup, allFlowers.slice(0, third)),
    layer(flowers, allFlowers.slice(third, third * 2)),
    layer(flower, allFlowers.slice(third * 2)),
  ];

  const group = new THREE.Group();
  layers.forEach(({ instances }) => group.add(instances));

  // Decor rond de gegeven punten verbergen (bv. bomen die een encounter in de weg staan).
  const hideNear = (points, radius) => {
    for (const { instances, transforms, footprint } of layers) {
      writeInstanceMatrices(instances, transforms, ({ x, z, scale }) => {
        const reach = radius + footprint * scale;
        return points.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < reach * reach) ? 0 : 1;
      });
    }
  };
  const restore = () => layers.forEach(({ instances, transforms }) => writeInstanceMatrices(instances, transforms));

  return { group, hideNear, restore };
};
