import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  TRAINER_MODEL_URL,
  TRAINER_HEIGHT,
  TRAINER_MODEL_ROTATION,
  TRAINER_SPEED,
  TRAINER_TURN_SPEED,
  FIELD_SIZE,
} from '../constants/config.js';

// Laadt het GLB-model en schaalt het naar TRAINER_HEIGHT, met de voeten op y = 0.
const loadModel = async () => {
  const gltf = await new GLTFLoader().loadAsync(TRAINER_MODEL_URL);
  const model = gltf.scene;

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  model.scale.multiplyScalar(TRAINER_HEIGHT / size.y);

  box.setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.set(-center.x, -box.min.y, -center.z);

  model.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });

  // Extra laag zodat we het model kunnen draaien/laten wippen los van de positie.
  const pivot = new THREE.Group();
  pivot.rotation.y = TRAINER_MODEL_ROTATION;
  pivot.add(model);
  return pivot;
};

export const createTrainer = async () => {
  const group = new THREE.Group();
  const body = new THREE.Group(); // procedurele animatie (bob/lean) zit op deze laag
  body.add(await loadModel());
  group.add(body);

  const direction = new THREE.Vector3();
  const limit = FIELD_SIZE / 2 - 1;
  let walkTime = 0;
  let walkAmount = 0; // 0 = stilstaan, 1 = lopen (vloeiend)

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
    }

    walkAmount = THREE.MathUtils.damp(walkAmount, moving ? 1 : 0, 10, delta);
    walkTime += delta;

    // Procedurele animatie: het model heeft geen skelet/clips.
    const step = walkTime * 10;
    const breathe = Math.sin(walkTime * 2) * 0.01 * (1 - walkAmount);
    body.position.y = Math.abs(Math.sin(step)) * 0.08 * walkAmount;
    body.rotation.z = Math.sin(step) * 0.06 * walkAmount;
    body.rotation.x = 0.08 * walkAmount;
    body.scale.y = 1 + breathe;
  };

  return { group, update };
};
