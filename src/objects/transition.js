import * as THREE from 'three/webgpu';
import { wgslFn, uv, uniform } from 'three/tsl';
import encounterShaderSource from '../shaders/encounter/fragment.wgsl?raw';
import { tween, easeInQuad, easeOutQuad } from '../utils/tween.js';

const encounterShader = wgslFn(encounterShaderSource);

// Fullscreen overlay met de speed-lines shader, gerenderd bovenop de scène.
export const createTransition = () => {
  const uProgress = uniform(0);
  const uTime = uniform(0);

  const shaderOutput = encounterShader({ uv: uv(), progress: uProgress, time: uTime });

  const material = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  material.colorNode = shaderOutput.rgb;
  material.opacityNode = shaderOutput.a;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  // Lijnen schieten naar binnen tot het scherm wit is.
  const cover = (duration = 0.8) => tween(duration, (t) => (uProgress.value = t), easeInQuad);
  // Wit trekt weg naar de randen.
  const reveal = (duration = 0.5) => tween(duration, (t) => (uProgress.value = 1 - t), easeOutQuad);

  const update = (delta) => {
    uTime.value += delta;
  };

  const isVisible = () => uProgress.value > 0;

  return { scene, camera, cover, reveal, update, isVisible, uniforms: { uProgress, uTime } };
};
