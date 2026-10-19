import * as THREE from 'three/webgpu';
import { TRAINER_SPEED, TRAINER_TURN_SPEED, FIELD_SIZE } from '../constants/config.js';
import { TRAINER_BODY_COLOR, TRAINER_HEAD_COLOR } from '../constants/colors.js';

// Tijdelijk figuurtje tot er een echt trainer-model (GLB) is.
const createPlaceholder = () => {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.3, 0.7, 4, 12),
    new THREE.MeshStandardNodeMaterial({ color: TRAINER_BODY_COLOR }),
  );
  body.position.y = 0.65;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 12),
    new THREE.MeshStandardNodeMaterial({ color: TRAINER_HEAD_COLOR }),
  );
  head.position.y = 1.35;

  // Neusje zodat je ziet welke kant de trainer op kijkt.
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 6),
    new THREE.MeshStandardNodeMaterial({ color: TRAINER_BODY_COLOR }),
  );
  nose.position.set(0, 1.35, 0.22);

  group.add(body, head, nose);
  group.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });
  return { group, body };
};

export const createTrainer = () => {
  const { group, body } = createPlaceholder();
  const direction = new THREE.Vector3();
  const limit = FIELD_SIZE / 2 - 1;
  let walkTime = 0;

  const update = (delta, input) => {
    direction.set(input.x, 0, input.z);
    const moving = direction.lengthSq() > 0;

    if (moving) {
      direction.normalize();
      group.position.addScaledVector(direction, TRAINER_SPEED * delta);
      group.position.x = THREE.MathUtils.clamp(group.position.x, -limit, limit);
      group.position.z = THREE.MathUtils.clamp(group.position.z, -limit, limit);

      // Kortste draairichting naar de looprichting.
      const targetAngle = Math.atan2(direction.x, direction.z);
      let diff = targetAngle - group.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      group.rotation.y += diff * Math.min(1, TRAINER_TURN_SPEED * delta);

      walkTime += delta;
    }

    // Simpele loop-bob in plaats van een animatie.
    body.position.y = 0.65 + (moving ? Math.abs(Math.sin(walkTime * 10)) * 0.08 : 0);
  };

  return { group, update };
};
