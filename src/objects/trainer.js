import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  TRAINER_MODEL_URL,
  TRAINER_HEIGHT,
  TRAINER_MODEL_ROTATION,
  TRAINER_SPEED,
  TRAINER_TURN_SPEED,
  TRAINER_ANIMATION_SPEED,
} from '../constants/config.js';
import { PLAYER_LIMIT } from '../constants/world.js';

// Laadt het GLB-model en schaalt het naar TRAINER_HEIGHT, met de voeten op y = 0.
const loadModel = async () => {
  const gltf = await new GLTFLoader().loadAsync(TRAINER_MODEL_URL);
  const model = gltf.scene;

  // Blender-export bevat soms nog een statische kopie naast de geriggede mesh: die verbergen.
  let hasSkinnedMesh = false;
  model.traverse((child) => {
    if (child.isSkinnedMesh) hasSkinnedMesh = true;
  });
  model.traverse((child) => {
    if (!child.isMesh) return;
    if (hasSkinnedMesh && !child.isSkinnedMesh) child.visible = false;
    child.castShadow = true;
    child.frustumCulled = false; // bounding box van een skinned mesh klopt niet tijdens animatie
  });

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  model.scale.multiplyScalar(TRAINER_HEIGHT / size.y);

  box.setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.set(-center.x, -box.min.y, -center.z);

  // Extra laag zodat we het model kunnen draaien los van de positie.
  const pivot = new THREE.Group();
  pivot.rotation.y = TRAINER_MODEL_ROTATION;
  pivot.add(model);
  return { pivot, model, walkClip: gltf.animations[0] ?? null };
};

// Loopanimatie via AnimationMixer. Er is geen idle-clip: bij stilstaan loopt de cyclus door
// tot de benen naast elkaar staan (begin of midden van de cyclus) en pauzeert dan.
const createWalkAnimation = (model, clip) => {
  const mixer = new THREE.AnimationMixer(model);
  const action = mixer.clipAction(clip);
  action.timeScale = TRAINER_ANIMATION_SPEED;
  action.play();
  const half = clip.duration / 2;
  let stopping = false;
  let paused = true;
  action.paused = true;

  const update = (delta, moving) => {
    if (moving) {
      stopping = false;
      paused = false;
      action.paused = false;
    } else if (!paused) {
      stopping = true;
    }

    if (stopping) {
      // Stoppen zodra we (bijna) op een "benen samen"-moment zitten.
      const phase = action.time % half;
      const margin = 0.04 * TRAINER_ANIMATION_SPEED;
      if (phase < margin || phase > half - margin) {
        action.time = Math.round(action.time / half) * half;
        action.paused = true;
        paused = true;
        stopping = false;
      }
    }

    mixer.update(delta);
  };

  return { update };
};

export const createTrainer = async () => {
  const group = new THREE.Group();
  const body = new THREE.Group(); // procedurele animatie als het model geen clips heeft
  const { pivot, model, walkClip } = await loadModel();
  body.add(pivot);
  group.add(body);

  const walk = walkClip ? createWalkAnimation(model, walkClip) : null;

  const direction = new THREE.Vector3();
  const limit = PLAYER_LIMIT;
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

    if (walk) {
      walk.update(delta, moving);
      return;
    }

    // Procedurele animatie (model zonder skelet/clips).
    walkAmount = THREE.MathUtils.damp(walkAmount, moving ? 1 : 0, 10, delta);
    walkTime += delta;
    const step = walkTime * 10;
    const breathe = Math.sin(walkTime * 2) * 0.01 * (1 - walkAmount);
    body.position.y = Math.abs(Math.sin(step)) * 0.08 * walkAmount;
    body.rotation.z = Math.sin(step) * 0.06 * walkAmount;
    body.rotation.x = 0.08 * walkAmount;
    body.scale.y = 1 + breathe;
  };

  return { group, update };
};
