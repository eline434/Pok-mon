import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { NPC_MODEL_URL, NPC_HEIGHT, PALETTE_CELLS, PALETTE_GRID, NPC_LOOK_RADIUS } from '../constants/npcs.js';

let gltf = null;
let scale = 1;
let offset = new THREE.Vector3();

export const loadNpcModel = async () => {
  gltf = await new GLTFLoader().loadAsync(NPC_MODEL_URL);

  // Statische kopie uit de Blender-export verbergen (enkel de geriggede mesh tonen).
  gltf.scene.traverse((child) => {
    if (child.isMesh && !child.isSkinnedMesh) child.visible = false;
  });

  // Schaal en verschuiving zodat de voeten op y = 0 staan en de NPC NPC_HEIGHT hoog is.
  const box = new THREE.Box3();
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((child) => {
    if (child.isSkinnedMesh) box.expandByObject(child);
  });
  const size = box.getSize(new THREE.Vector3());
  scale = NPC_HEIGHT / size.y;
  const center = box.getCenter(new THREE.Vector3());
  offset = new THREE.Vector3(-center.x * scale, -box.min.y * scale, -center.z * scale);
};

// Kopie van de palet-texture met andere kleuren voor haar, T-shirt, short en schoenen.
const recolorTexture = (texture, colors) => {
  const image = texture.image;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);

  const cell = image.width / PALETTE_GRID;
  for (const [part, color] of Object.entries(colors)) {
    const [row, column] = PALETTE_CELLS[part];
    context.fillStyle = color;
    context.fillRect(column * cell, row * cell, cell, cell);
  }

  const result = new THREE.CanvasTexture(canvas);
  result.flipY = texture.flipY;
  result.colorSpace = texture.colorSpace;
  result.magFilter = texture.magFilter;
  result.minFilter = texture.minFilter;
  result.wrapS = texture.wrapS;
  result.wrapT = texture.wrapT;
  return result;
};

// Nieuw (gekleurd) NPC-model met eigen skelet en idle-animatie.
export const createNpcModel = (colors) => {
  const model = SkeletonUtils.clone(gltf.scene);
  model.scale.setScalar(scale);
  model.position.copy(offset);

  const materials = new Map(); // gedeelde materialen één keer klonen
  model.traverse((child) => {
    if (!child.isSkinnedMesh) return;
    child.castShadow = true;
    child.frustumCulled = false;
    const original = child.material;
    if (!materials.has(original)) {
      const material = original.clone();
      if (original.map) material.map = recolorTexture(original.map, colors);
      materials.set(original, material);
    }
    child.material = materials.get(original);
  });

  const holder = new THREE.Group();
  holder.add(model);

  const mixer = new THREE.AnimationMixer(model);
  const idle = gltf.animations[0];
  if (idle) {
    const action = mixer.clipAction(idle);
    action.time = Math.random() * idle.duration; // niet alle NPC's synchroon
    action.play();
  }

  return { holder, update: (delta) => mixer.update(delta) };
};

// NPC in het veld: staat op zijn plek en draait naar de speler als die in de buurt komt.
export const createNpc = (definition) => {
  const { holder, update: updateModel } = createNpcModel(definition.colors);
  holder.position.set(definition.position.x, 0, definition.position.z);
  const restRotation = Math.atan2(-definition.position.x, -definition.position.z); // kijkt naar het midden van het veld
  holder.rotation.y = restRotation;

  const update = (delta, playerPosition) => {
    updateModel(delta);
    const dx = playerPosition.x - holder.position.x;
    const dz = playerPosition.z - holder.position.z;
    const target = Math.hypot(dx, dz) < NPC_LOOK_RADIUS ? Math.atan2(dx, dz) : restRotation;
    let diff = target - holder.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    holder.rotation.y += diff * Math.min(1, 4 * delta);
  };

  const distanceTo = (position) =>
    Math.hypot(position.x - holder.position.x, position.z - holder.position.z);

  return { group: holder, definition, update, distanceTo };
};
