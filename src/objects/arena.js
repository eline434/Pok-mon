import * as THREE from 'three/webgpu';
import { TRAINING } from '../constants/config.js';
import { ARENA_GRASS_COLOR, ARENA_TRACK_COLOR, ARENA_LINE_COLOR } from '../constants/colors.js';

// Trainingsplek buiten het veld: grasvlak met een zandpiste waarover de ballen rollen (langs x).
export const createArena = () => {
  const group = new THREE.Group();
  group.position.set(TRAINING.arenaPosition.x, 0, TRAINING.arenaPosition.z);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 60).rotateX(-Math.PI / 2),
    new THREE.MeshStandardNodeMaterial({ color: ARENA_GRASS_COLOR, roughness: 1 }),
  );
  ground.receiveShadow = true;

  const track = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 2.4).rotateX(-Math.PI / 2),
    new THREE.MeshStandardNodeMaterial({ color: ARENA_TRACK_COLOR, roughness: 1 }),
  );
  track.position.y = 0.01;
  track.receiveShadow = true;

  // Witte lijnen langs de piste.
  const lineMaterial = new THREE.MeshBasicNodeMaterial({ color: ARENA_LINE_COLOR });
  const lineGeometry = new THREE.PlaneGeometry(26, 0.08).rotateX(-Math.PI / 2);
  const lines = [-1.2, 1.2].map((z) => {
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.position.set(0, 0.02, z);
    return line;
  });

  group.add(ground, track, ...lines);
  return { group };
};
