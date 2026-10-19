const KEYS = {
  forward: ['KeyW', 'KeyZ', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'KeyQ', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
};

export const createInput = () => {
  const pressed = new Set();
  const state = { x: 0, z: 0 };

  const isDown = (codes) => codes.some((code) => pressed.has(code));

  window.addEventListener('keydown', (event) => pressed.add(event.code));
  window.addEventListener('keyup', (event) => pressed.delete(event.code));
  window.addEventListener('blur', () => pressed.clear());

  const update = () => {
    state.x = (isDown(KEYS.right) ? 1 : 0) - (isDown(KEYS.left) ? 1 : 0);
    state.z = (isDown(KEYS.backward) ? 1 : 0) - (isDown(KEYS.forward) ? 1 : 0);
    return state;
  };

  return { update };
};
