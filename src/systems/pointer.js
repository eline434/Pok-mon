import * as THREE from 'three/webgpu';

// Raycast voor hover, klik en slepen over objecten.
// targets: [{ object, cursor, onClick, onStroke(pixels) }] — object mag een Group zijn.
export const createPointer = (canvas, camera, targets) => {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let pressed = null; // target waarop de muisknop werd ingedrukt
  let last = { x: 0, y: 0 };
  let enabled = true;

  const findTarget = (event) => {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);

    const visible = targets.filter((t) => t.object.visible);
    const hit = raycaster.intersectObjects(visible.map((t) => t.object), true)[0];
    if (!hit) return null;
    // Het geraakte mesh kan een kind zijn van het target-object.
    return visible.find((t) => {
      let node = hit.object;
      while (node) {
        if (node === t.object) return true;
        node = node.parent;
      }
      return false;
    });
  };

  canvas.addEventListener('pointerdown', (event) => {
    if (!enabled) return;
    const target = findTarget(event);
    if (!target) return;
    pressed = target;
    last = { x: event.clientX, y: event.clientY };
    target.onClick?.();
    if (target.onStroke) canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!enabled) {
      canvas.style.cursor = '';
      return;
    }
    // Slepen dat begon op een object = aaien. Het telt ook als de muis er even af glijdt
    // (de buddy springt en beweegt), zolang de knop ingedrukt blijft.
    if (pressed?.onStroke) {
      const pixels = Math.hypot(event.clientX - last.x, event.clientY - last.y);
      last = { x: event.clientX, y: event.clientY };
      pressed.onStroke(Math.min(pixels, 60)); // één grote ruk telt niet als veel aaien
      canvas.style.cursor = 'grabbing';
      return;
    }

    const target = findTarget(event);
    canvas.style.cursor = target ? (target.cursor ?? 'pointer') : '';
  });

  const release = () => {
    pressed = null;
    canvas.style.cursor = '';
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  const setEnabled = (value) => {
    enabled = value;
    if (!value) pressed = null;
  };

  return { setEnabled };
};
