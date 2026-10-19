import * as THREE from 'three/webgpu';
import { SPECIES } from '../constants/pokemon.js';
import { loadPrototype } from './decor.js';

const prototypes = new Map();

// Alle modellen zijn klein (< 100 KB): meteen allemaal inladen.
export const loadPokemonModels = () =>
  Promise.all(
    SPECIES.map(async (species) => {
      prototypes.set(species.id, await loadPrototype({ url: species.model, height: species.height }));
    }),
  );

export const createModelGroup = (parts) => {
  const group = new THREE.Group();
  for (const { geometry, material } of parts) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    group.add(mesh);
  }
  return group;
};

// root: positie/draaiing/schaal in de wereld, body: procedurele animatie.
export const createPokemon = (species) => {
  const root = new THREE.Group();
  const body = new THREE.Group();
  const model = createModelGroup(prototypes.get(species.id));
  model.rotation.y = species.rotation;
  body.add(model);
  root.add(body);

  let time = Math.random() * 10;
  let reactTime = -1; // -1 = geen reactie bezig
  const REACT_DURATION = 0.6;

  // Blije reactie (bij aaien): sprongetje + pirouette.
  const react = () => {
    reactTime = 0;
  };

  const updateReaction = (delta) => {
    if (reactTime < 0) return;
    reactTime += delta;
    const t = Math.min(reactTime / REACT_DURATION, 1);
    model.position.y = Math.sin(t * Math.PI) * 0.35;
    model.rotation.y = species.rotation + t * Math.PI * 2;
    if (t >= 1) {
      reactTime = -1;
      model.position.y = 0;
      model.rotation.y = species.rotation;
    }
  };

  const update = (delta) => {
    time += delta;
    updateReaction(delta);

    if (species.motion === 'float') {
      body.position.y = species.hover + Math.sin(time * 2) * 0.1;
      body.rotation.z = Math.sin(time * 1.3) * 0.08;
      return;
    }

    if (species.motion === 'flop') {
      body.position.y = Math.abs(Math.sin(time * 4)) * 0.3;
      body.rotation.z = Math.sin(time * 8) * 0.35;
      return;
    }

    // hop: om de 2 seconden een sprongetje, daartussen ademen.
    const phase = time % 2;
    const hop = phase < 0.35 ? Math.sin((phase / 0.35) * Math.PI) : 0;
    body.position.y = hop * 0.18;
    body.scale.set(1, 1 + Math.sin(time * 3) * 0.03 - hop * 0.05, 1);
  };

  return { root, update, react, species };
};
