import * as THREE from 'three/webgpu';

// Raycast op klik/hover naar een lijst klikbare meshes.
export const createPointer = (canvas, camera, targets) => {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  const hit = (event) => {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(targets.map((t) => t.mesh), false)[0];
  };

  const findTarget = (intersection) => targets.find((t) => t.mesh === intersection?.object);

  canvas.addEventListener('pointermove', (event) => {
    canvas.style.cursor = findTarget(hit(event)) ? 'pointer' : '';
  });

  canvas.addEventListener('pointerdown', (event) => {
    findTarget(hit(event))?.onClick?.();
  });
};
