import * as THREE from 'three/webgpu';
import { wgslFn, uv, uniform, colorSpaceToWorking } from 'three/tsl';
import heartShaderSource from '../shaders/heart/fragment.wgsl?raw';
import { HEART_POP_DURATION, HEART_HOLD_DURATION } from '../constants/config.js';

const heartShader = wgslFn(heartShaderSource);

export const createHeart = () => {
  const uProgress = uniform(0);
  const uHappiness = uniform(0);
  const uTime = uniform(0);

  const shaderOutput = heartShader({ uv: uv(), progress: uProgress, happiness: uHappiness, time: uTime });

  const material = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  material.colorNode = colorSpaceToWorking(shaderOutput.rgb, THREE.SRGBColorSpace);
  material.opacityNode = shaderOutput.a;

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.name = 'heart';

  let popTime = -1; // -1 = in rust

  const pop = () => {
    popTime = 0;
  };

  const setHappiness = (value) => {
    uHappiness.value = value;
  };

  const update = (delta, camera) => {
    // Billboard: altijd naar de camera gericht.
    mesh.quaternion.copy(camera.quaternion);
    uTime.value += delta;

    if (popTime < 0) return;
    popTime += delta;
    uProgress.value = Math.min(popTime / HEART_POP_DURATION, 1);

    if (popTime > HEART_POP_DURATION + HEART_HOLD_DURATION) {
      popTime = -1;
      uProgress.value = 0;
    }
  };

  return { mesh, pop, setHappiness, update, uniforms: { uProgress, uHappiness, uTime } };
};
