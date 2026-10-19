import * as THREE from 'three/webgpu';
import { FIELD_SIZE } from '../constants/config.js';
import { GRASS_COLOR } from '../constants/colors.js';

export const createField = () => {
  const geometry = new THREE.PlaneGeometry(FIELD_SIZE, FIELD_SIZE);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshStandardNodeMaterial({ color: GRASS_COLOR, roughness: 1 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return { mesh };
};
