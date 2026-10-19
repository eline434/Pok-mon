import * as THREE from 'three/webgpu';
import { SKY_COLOR } from './constants/colors.js';
import { createTestCube } from './objects/testCube.js';

const canvas = document.querySelector('#app');
const message = document.querySelector('#message');

const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
await renderer.init();

// Toon welke backend actief is (WebGPU of WebGL2-fallback).
if (!renderer.backend.isWebGPUBackend) {
  message.textContent = 'WebGPU niet beschikbaar – WebGL2-fallback actief.';
  message.hidden = false;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY_COLOR);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.5, 4);
camera.lookAt(0, 0, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0x4a7c3a, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(3, 5, 2);
scene.add(sun);

const cube = createTestCube();
scene.add(cube.mesh);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const timer = new THREE.Timer();

renderer.setAnimationLoop((time) => {
  timer.update(time);
  const delta = timer.getDelta();

  cube.update(delta);
  renderer.render(scene, camera);
});
