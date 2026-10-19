import * as THREE from 'three/webgpu';
import { CUBE_COLOR } from '../constants/colors.js';

export const createTestCube = () => {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardNodeMaterial({ color: CUBE_COLOR });
  const mesh = new THREE.Mesh(geometry, material);

  const update = (delta) => {
    mesh.rotation.x += delta * 0.5;
    mesh.rotation.y += delta * 0.8;
  };

  return { mesh, update };
};
