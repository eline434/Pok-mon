import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const dummy = new THREE.Object3D();

// Matte low-poly look + doorzichtige textures (BLEND) als alpha-cutout (geen sorteerproblemen).
const fixMaterial = (material) => {
  material.metalness = 0;
  material.roughness = 1;
  if (material.transparent) {
    material.transparent = false;
    material.depthWrite = true;
    material.alphaTest = 0.5;
  }
  return material;
};

// Laadt een GLB en bakt alle meshes in één set geometrieën:
// geschaald naar `height`, gecentreerd, met de onderkant op y = 0.
export const loadPrototype = async ({ url, height }) => {
  const gltf = await loader.loadAsync(url);
  const root = gltf.scene;
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = height / size.y;
  const normalize = new THREE.Matrix4()
    .makeScale(scale, scale, scale)
    .multiply(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));

  const parts = [];
  root.traverse((child) => {
    if (!child.isMesh) return;
    const geometry = child.geometry.clone().applyMatrix4(normalize.clone().multiply(child.matrixWorld));
    parts.push({ geometry, material: fixMaterial(child.material) });
  });
  return parts;
};

// Schrijft de matrices van alle instances; scaleFactor(transform) kan een kopie kleiner maken.
export const writeInstanceMatrices = (group, transforms, scaleFactor = () => 1) => {
  for (const mesh of group.children) {
    transforms.forEach((transform, i) => {
      dummy.position.set(transform.x, 0, transform.z);
      dummy.rotation.set(0, transform.rotation, 0);
      dummy.scale.setScalar(transform.scale * scaleFactor(transform));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
};

// Eén InstancedMesh per onderdeel: veel kopieën in weinig draw calls.
// transforms: [{ x, z, rotation, scale }]
export const createInstances = (parts, transforms, { castShadow = false, receiveShadow = true } = {}) => {
  const group = new THREE.Group();

  for (const { geometry, material } of parts) {
    const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    group.add(mesh);
  }

  writeInstanceMatrices(group, transforms);
  group.children.forEach((mesh) => mesh.computeBoundingSphere());
  return group;
};
