import * as THREE from 'three/webgpu';
import {
  TALL_GRASS_PATCHES,
  TALL_GRASS_SPACING,
  MODELS,
  WORLD_SEED,
  SPAWN_CLEAR_RADIUS,
} from '../constants/world.js';
import { TALL_GRASS_GROUND_COLOR } from '../constants/colors.js';
import { createRandom } from '../utils/random.js';
import { NPCS, NPC_CLEAR_RADIUS } from '../constants/npcs.js';
import { loadPrototype, createInstances, writeInstanceMatrices } from './decor.js';
import { createGrassMaterial } from './grassMaterial.js';

// Layout van de grasvelden (vaste seed): lijst van cirkels { x, z, radius }.
const createBlobs = () => {
  const random = createRandom(WORLD_SEED + 2);
  const { count, blobs, blobRadius, blobSpread, minDistance, limit } = TALL_GRASS_PATCHES;
  const centers = [];
  const result = [];

  for (let tries = 0; centers.length < count && tries < count * 100; tries++) {
    const x = random.range(-limit, limit);
    const z = random.range(-limit, limit);
    if (Math.hypot(x, z) < SPAWN_CLEAR_RADIUS + 4) continue;
    if (centers.some((c) => Math.hypot(c.x - x, c.z - z) < minDistance)) continue;
    centers.push({ x, z });

    const blobCount = Math.floor(random.range(blobs.min, blobs.max + 1));
    for (let i = 0; i < blobCount; i++) {
      const angle = random.range(0, Math.PI * 2);
      const distance = i === 0 ? 0 : random.range(blobSpread.min, blobSpread.max);
      const blob = {
        x: x + Math.cos(angle) * distance,
        z: z + Math.sin(angle) * distance,
        radius: random.range(blobRadius.min, blobRadius.max),
      };
      // Geen gras op de plek van een NPC-trainer.
      const nearNpc = NPCS.some(
        ({ position }) => Math.hypot(position.x - blob.x, position.z - blob.z) < blob.radius + NPC_CLEAR_RADIUS,
      );
      if (!nearNpc) result.push(blob);
    }
  }
  return result;
};

export const TALL_GRASS_BLOBS = createBlobs();

const insideBlob = (x, z, margin = 0) =>
  TALL_GRASS_BLOBS.some((blob) => (x - blob.x) ** 2 + (z - blob.z) ** 2 < (blob.radius - margin) ** 2);

// Plukken gras op één verschoven raster over het hele veld, enkel binnen de blobs (geen dubbels bij overlap).
const createGrassTransforms = (random) => {
  const transforms = [];
  const extent = TALL_GRASS_PATCHES.limit + TALL_GRASS_PATCHES.blobSpread.max + TALL_GRASS_PATCHES.blobRadius.max;
  for (let x = -extent; x <= extent; x += TALL_GRASS_SPACING) {
    for (let z = -extent; z <= extent; z += TALL_GRASS_SPACING) {
      const px = x + random.range(-0.3, 0.3);
      const pz = z + random.range(-0.3, 0.3);
      if (!insideBlob(px, pz, 0.25)) continue;
      transforms.push({
        x: px,
        z: pz,
        rotation: random.range(0, Math.PI * 2),
        scale: random.range(0.55, 0.8),
      });
    }
  }
  return transforms;
};

export const createTallGrass = async (random) => {
  const group = new THREE.Group();

  // Donkerdere ondergrond zodat je de zones herkent.
  const groundMaterial = new THREE.MeshStandardNodeMaterial({ color: TALL_GRASS_GROUND_COLOR, roughness: 1 });
  for (const blob of TALL_GRASS_BLOBS) {
    const ground = new THREE.Mesh(new THREE.CircleGeometry(blob.radius, 32), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(blob.x, 0.01, blob.z);
    ground.receiveShadow = true;
    group.add(ground);
  }

  // Gras krijgt een node-materiaal dat wegbuigt voor de trainer en wiegt in de wind.
  const grass = (await loadPrototype(MODELS.grass)).map(({ geometry, material }) => ({
    geometry,
    material: createGrassMaterial(material),
  }));
  const transforms = createGrassTransforms(random);
  const instances = createInstances(grass, transforms);
  group.add(instances);

  // Gras rond de gegeven punten plat leggen (bv. tijdens een encounter), zodat je de pokémon ziet.
  const flatten = (points, radius) => {
    writeInstanceMatrices(instances, ({ x, z }) =>
      points.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < radius * radius) ? 0.15 : 1,
    );
  };
  const restore = () => writeInstanceMatrices(instances);

  return { group, flatten, restore };
};

// Staat een positie in hoog gras? (gebruikt voor encounters)
export const isInTallGrass = (position) => insideBlob(position.x, position.z);
