import * as THREE from 'three/webgpu';
import { getSpecies } from '../constants/pokemon.js';
import { BUDDY_OFFSET, BUDDY_SPEED, BUDDY_TURN_SPEED, BUDDY_HEART_GAP } from '../constants/config.js';
import { createPokemon } from './pokemon.js';

// De gekozen pokémon uit je team die met de trainer meeloopt.
export const createBuddy = () => {
  const group = new THREE.Group();
  let pokemon = null;
  let uid = null;

  const target = new THREE.Vector3();
  const toTarget = new THREE.Vector3();

  const followPoint = (trainer) => {
    const angle = trainer.rotation.y;
    const forwardX = Math.sin(angle);
    const forwardZ = Math.cos(angle);
    // Schuin achter de trainer, aan zijn rechterkant.
    return target.set(
      trainer.position.x - forwardX * BUDDY_OFFSET.back - forwardZ * BUDDY_OFFSET.side,
      0,
      trainer.position.z - forwardZ * BUDDY_OFFSET.back + forwardX * BUDDY_OFFSET.side,
    );
  };

  // Wisselt het model als er een andere buddy gekozen is (member = null -> geen buddy).
  const setMember = (member, trainer) => {
    if (member?.uid === uid) return;
    if (pokemon) group.remove(pokemon.root);
    uid = member?.uid ?? null;
    pokemon = member ? createPokemon(getSpecies(member.species)) : null;
    if (!pokemon) return;
    pokemon.root.position.copy(followPoint(trainer));
    pokemon.root.rotation.y = trainer.rotation.y;
    group.add(pokemon.root);
  };

  const update = (delta, trainer) => {
    if (!pokemon) return;
    const root = pokemon.root;

    toTarget.copy(followPoint(trainer)).sub(root.position);
    toTarget.y = 0;
    const distance = toTarget.length();

    if (distance > 10) {
      // Te ver achter (bv. na een encounter): meteen bijspringen.
      root.position.copy(target);
    } else if (distance > 0.1) {
      // Sneller lopen naarmate hij verder achter zit.
      const step = Math.min(distance, Math.min(BUDDY_SPEED, distance * 3) * delta);
      root.position.addScaledVector(toTarget.normalize(), step);
    }

    // Draai in de looprichting, of in dezelfde richting als de trainer als hij stilstaat.
    const facing = distance > 0.3 ? Math.atan2(toTarget.x, toTarget.z) : trainer.rotation.y;
    let diff = facing - root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    root.rotation.y += diff * Math.min(1, BUDDY_TURN_SPEED * delta);

    pokemon.update(delta);
  };

  const react = () => pokemon?.react();

  // Groter met level (visuele feedback van trainen).
  const setScale = (scale) => pokemon?.root.scale.setScalar(scale);

  // Positie voor het hartje: net boven de buddy.
  const getHeartPosition = (out) => {
    const { species } = pokemon;
    const scale = pokemon.root.scale.y;
    return out.copy(pokemon.root.position).setY((species.hover + species.height) * scale + BUDDY_HEART_GAP);
  };

  const getPosition = () => pokemon?.root.position ?? null;

  return { group, setMember, setScale, update, react, getHeartPosition, getPosition, hasBuddy: () => pokemon !== null };
};
