import * as THREE from 'three/webgpu';
import { TALL_GRASS_ZONES, TALL_GRASS_SPACING, MODELS } from '../constants/world.js';
import { TALL_GRASS_GROUND_COLOR } from '../constants/colors.js';
import { loadPrototype, createInstances } from './decor.js';

// Plukken gras op een verschoven raster binnen elke cirkelvormige zone.
const createGrassTransforms = (random) => {
  const transforms = [];
  for (const zone of TALL_GRASS_ZONES) {
    const r = zone.radius;
    for (let x = -r; x <= r; x += TALL_GRASS_SPACING) {
      for (let z = -r; z <= r; z += TALL_GRASS_SPACING) {
        const px = x + random.range(-0.4, 0.4);
        const pz = z + random.range(-0.4, 0.4);
        if (px * px + pz * pz > (r - 0.6) ** 2) continue;
        transforms.push({
          x: zone.x + px,
          z: zone.z + pz,
          rotation: random.range(0, Math.PI * 2),
          scale: random.range(0.6, 0.85),
        });
      }
    }
  }
  return transforms;
};

export const createTallGrass = async (random) => {
  const group = new THREE.Group();

  // Donkerdere ondergrond zodat je de zones herkent.
  const groundMaterial = new THREE.MeshStandardNodeMaterial({ color: TALL_GRASS_GROUND_COLOR, roughness: 1 });
  for (const zone of TALL_GRASS_ZONES) {
    const ground = new THREE.Mesh(new THREE.CircleGeometry(zone.radius, 40), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(zone.x, 0.01, zone.z);
    ground.receiveShadow = true;
    group.add(ground);
  }

  const grass = await loadPrototype(MODELS.grass);
  group.add(createInstances(grass, createGrassTransforms(random)));

  return { group };
};

// Staat een positie in hoog gras? (gebruikt voor encounters)
export const isInTallGrass = (position) =>
  TALL_GRASS_ZONES.some((zone) => {
    const dx = position.x - zone.x;
    const dz = position.z - zone.z;
    return dx * dx + dz * dz < zone.radius * zone.radius;
  });
