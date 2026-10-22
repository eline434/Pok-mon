import { DefaultLoadingManager } from 'three/webgpu';

// Laadscherm met voortgang (alle loaders gebruiken de DefaultLoadingManager van three.js).
export const createLoadingScreen = () => {
  const screen = document.querySelector('#loading');
  const status = screen.querySelector('.loading-status');
  const bar = screen.querySelector('.loading-bar > div');

  DefaultLoadingManager.onProgress = (url, loaded, total) => {
    const percent = Math.round((loaded / total) * 100);
    status.textContent = `Laden… ${percent}%`;
    bar.style.width = `${percent}%`;
  };

  const done = () => {
    screen.classList.add('is-done');
    screen.addEventListener('transitionend', () => screen.remove(), { once: true });
  };

  const fail = (title, text) => {
    screen.classList.add('is-error');
    status.textContent = title;
    screen.querySelector('.loading-error').textContent = text;
  };

  return { done, fail };
};
