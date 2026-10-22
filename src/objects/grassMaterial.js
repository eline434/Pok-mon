import * as THREE from 'three/webgpu';
import { positionLocal, uniform, vec2, vec3, float, sin, smoothstep, max } from 'three/tsl';
import { GRASS_MOTION } from '../constants/world.js';

// Gedeelde uniforms: posities van trainer en buddy, hoeveel je beweegt, tijd.
export const grassUniforms = {
  uPlayer: uniform(new THREE.Vector2()),
  uBuddy: uniform(new THREE.Vector2(9999, 9999)),
  uMoving: uniform(0), // 0 = stil, 1 = lopen (vloeiend)
  uTime: uniform(0),
};

// Duwt een vertex weg van een punt: geeft de verschuiving in xz terug.
const pushAway = (position, point, heightFactor) => {
  const offset = position.xz.sub(point);
  const distance = offset.length();
  const strength = smoothstep(float(GRASS_MOTION.bendRadius), float(0), distance);
  const direction = offset.div(max(distance, float(0.001)));
  return { push: direction.mul(strength.mul(GRASS_MOTION.bendStrength).mul(heightFactor)), strength };
};

// Vervangt het (gewone) GLTF-materiaal door een node-materiaal met een vertex-verschuiving.
// positionLocal is hier al na de instance-matrix toegepast, dus = wereldpositie (de meshes staan op de oorsprong).
export const createGrassMaterial = (original) => {
  const material = new THREE.MeshStandardNodeMaterial({
    color: original.color,
    roughness: original.roughness,
    metalness: original.metalness,
    side: original.side,
  });

  const { uPlayer, uBuddy, uMoving, uTime } = grassUniforms;
  const position = positionLocal;

  // 0 aan de grond, 1 bovenaan: de voet van het gras blijft staan, de top buigt.
  const height = position.y.div(GRASS_MOTION.height).clamp(0, 1);
  const heightFactor = height.mul(height);

  const player = pushAway(position, uPlayer, heightFactor);
  const buddy = pushAway(position, uBuddy, heightFactor.mul(0.7));
  const bend = player.push.add(buddy.push);

  // Ritselen rond de trainer terwijl hij loopt + zachte wind overal.
  const rustle = sin(uTime.mul(18).add(position.x.mul(4)).add(position.z.mul(3)))
    .mul(player.strength.mul(uMoving).mul(GRASS_MOTION.rustle).mul(heightFactor));
  const wind = sin(uTime.mul(1.6).add(position.x.mul(0.35)).add(position.z.mul(0.25)))
    .mul(GRASS_MOTION.wind)
    .mul(heightFactor);

  const sway = vec2(wind.add(rustle), wind.mul(0.6));
  const offset = bend.add(sway);

  // Weggeduwd gras zakt ook een beetje (het buigt, het wordt niet langer).
  const sink = bend.length().mul(0.45);

  material.positionNode = vec3(position.x.add(offset.x), position.y.sub(sink), position.z.add(offset.y));
  return material;
};

export const updateGrassUniforms = (delta, playerPosition, buddyPosition, moving) => {
  grassUniforms.uTime.value += delta;
  grassUniforms.uPlayer.value.set(playerPosition.x, playerPosition.z);
  if (buddyPosition) grassUniforms.uBuddy.value.set(buddyPosition.x, buddyPosition.z);
  else grassUniforms.uBuddy.value.set(9999, 9999);
  grassUniforms.uMoving.value = THREE.MathUtils.damp(grassUniforms.uMoving.value, moving ? 1 : 0, 6, delta);
};
