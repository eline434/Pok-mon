import * as THREE from 'three/webgpu';
import { SKY_COLOR, GROUND_COLOR } from './constants/colors.js';
import { createField } from './objects/field.js';
import { createTrainer } from './objects/trainer.js';
import { createHeart } from './objects/heart.js';
import { createTallGrass } from './objects/tallGrass.js';
import { createScenery } from './objects/scenery.js';
import { createRandom } from './utils/random.js';
import { WORLD_SEED } from './constants/world.js';
import { createInput } from './systems/input.js';
import { createFollowCamera } from './systems/followCamera.js';
import { createPointer } from './systems/pointer.js';

const canvas = document.querySelector('#app');
const message = document.querySelector('#message');

const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
await renderer.init();

// Toon welke backend actief is (WebGPU of WebGL2-fallback).
if (!renderer.backend.isWebGPUBackend) {
  message.textContent = 'WebGPU niet beschikbaar – WebGL2-fallback actief.';
  message.hidden = false;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY_COLOR);
scene.fog = new THREE.Fog(SKY_COLOR, 15, 45);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);

// Lichten
scene.add(new THREE.HemisphereLight(0xffffff, GROUND_COLOR, 1.5));

const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -12;
sun.shadow.camera.right = 12;
sun.shadow.camera.top = 12;
sun.shadow.camera.bottom = -12;
sun.shadow.camera.far = 40;
const SUN_OFFSET = new THREE.Vector3(6, 12, 4);
scene.add(sun, sun.target);

// Objecten
const field = createField();
scene.add(field.mesh);

// Elk eigen seed: laden gebeurt parallel, dus één gedeelde generator zou de layout laten variëren.
const [trainer, tallGrass, scenery] = await Promise.all([
  createTrainer(),
  createTallGrass(createRandom(WORLD_SEED)),
  createScenery(createRandom(WORLD_SEED + 1)),
]);
scene.add(trainer.group, tallGrass.group, scenery.group);

// Hartje zweeft voorlopig boven de trainer; in Fase 2 verhuist het naar de pokémon.
const heart = createHeart();
const HEART_HEIGHT = 2.1;
scene.add(heart.mesh);

// Systemen
const input = createInput();
const followCamera = createFollowCamera(camera, trainer.group);
createPointer(canvas, camera, [{ mesh: heart.mesh, onClick: heart.pop }]);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const timer = new THREE.Timer();

renderer.setAnimationLoop((time) => {
  timer.update(time);
  const delta = Math.min(timer.getDelta(), 0.1);

  trainer.update(delta, input.update());
  followCamera.update(delta);
  heart.mesh.position.copy(trainer.group.position).y += HEART_HEIGHT;
  heart.update(delta, camera);

  // Zon volgt de trainer zodat de schaduwen scherp blijven.
  sun.position.copy(trainer.group.position).add(SUN_OFFSET);
  sun.target.position.copy(trainer.group.position);

  renderer.render(scene, camera);
});
