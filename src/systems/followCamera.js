import * as THREE from 'three/webgpu';
import { CAMERA_OFFSET, CAMERA_SMOOTHING } from '../constants/config.js';

export const createFollowCamera = (camera, target) => {
  const offset = new THREE.Vector3(CAMERA_OFFSET.x, CAMERA_OFFSET.y, CAMERA_OFFSET.z);
  const desired = new THREE.Vector3();
  const lookAt = new THREE.Vector3();

  const snap = () => {
    camera.position.copy(target.position).add(offset);
    camera.lookAt(target.position);
  };

  const update = (delta) => {
    desired.copy(target.position).add(offset);
    camera.position.lerp(desired, 1 - Math.exp(-CAMERA_SMOOTHING * delta));
    lookAt.copy(target.position).y += 1;
    camera.lookAt(lookAt);
  };

  snap();
  return { update };
};
