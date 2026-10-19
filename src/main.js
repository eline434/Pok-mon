import * as THREE from 'three/webgpu';
import { SKY_COLOR, GROUND_COLOR } from './constants/colors.js';
import { createField } from './objects/field.js';
import { createTrainer } from './objects/trainer.js';
import { createHeart } from './objects/heart.js';
import { createTallGrass, isInTallGrass } from './objects/tallGrass.js';
import { createScenery } from './objects/scenery.js';
import { createRandom } from './utils/random.js';
import { WORLD_SEED } from './constants/world.js';
import { createInput } from './systems/input.js';
import { createFollowCamera } from './systems/followCamera.js';
import { createPointer } from './systems/pointer.js';
import { loadPokemonModels } from './objects/pokemon.js';
import { loadPokeballModel } from './objects/pokeball.js';
import { createTransition } from './objects/transition.js';
import { createEncounterChecker, pickSpecies } from './systems/encounters.js';
import { createWildEncounter } from './systems/wildEncounter.js';
import { createTeam } from './systems/team.js';
import { createHud } from './ui/hud.js';
import { getSpecies } from './constants/pokemon.js';
import { updateTweens } from './utils/tween.js';
import { createBuddy } from './objects/buddy.js';
import {
  PET_COOLDOWN,
  PET_STROKE_PIXELS,
  PET_HAPPINESS,
  PET_XP,
  WALK_XP_INTERVAL,
  WALK_XP,
  TRAINING,
} from './constants/config.js';
import { applyXp, levelScale } from './systems/progression.js';
import { createArena } from './objects/arena.js';
import { createTraining } from './systems/training.js';

const canvas = document.querySelector('#app');
const message = document.querySelector('#message');

const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
await renderer.init();

// Toon welke backend actief is (WebGPU of WebGL2-fallback).
if (!renderer.backend.isWebGPUBackend) {
  message.textContent = 'WebGPU niet beschikbaar – WebGL2-fallback actief.';
  message.hidden = false;
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY_COLOR);
scene.fog = new THREE.Fog(SKY_COLOR, 15, 45);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);

// Lichten
scene.add(new THREE.HemisphereLight(0xffffff, GROUND_COLOR, 1.5));

const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -12;
sun.shadow.camera.right = 12;
sun.shadow.camera.top = 12;
sun.shadow.camera.bottom = -12;
sun.shadow.camera.far = 40;
const SUN_OFFSET = new THREE.Vector3(6, 12, 4);
scene.add(sun, sun.target);

// Objecten
const field = createField();
scene.add(field.mesh);

// Elk eigen seed: laden gebeurt parallel, dus één gedeelde generator zou de layout laten variëren.
const [trainer, tallGrass, scenery] = await Promise.all([
  createTrainer(),
  createTallGrass(createRandom(WORLD_SEED)),
  createScenery(createRandom(WORLD_SEED + 1)),
  loadPokemonModels(),
  loadPokeballModel(),
]);
const arena = createArena();
scene.add(trainer.group, tallGrass.group, scenery.group, arena.group);

// Buddy (gekozen pokémon uit je team) met het aai-hartje erboven.
const buddy = createBuddy();
scene.add(buddy.group);

const heart = createHeart();
scene.add(heart.mesh);

// Systemen
const input = createInput();
const followCamera = createFollowCamera(camera, trainer.group);
const transition = createTransition();
const team = createTeam();
const hud = createHud(team, { onTrain: () => startTraining() });

// XP geven aan de buddy (aaien, wandelen, trainen) + level-up melding.
const giveXp = (amount, extra = {}) => {
  const member = team.getBuddy();
  if (!member) return;
  const result = applyXp(member, amount);
  team.updateMember(member.uid, { level: result.level, xp: result.xp, ...extra });
  if (result.gained > 0) {
    hud.toast(`${getSpecies(member.species).name} is nu level ${result.level}!`);
    heart.pop();
    buddy.react();
  }
};

// Aaien kan om de PET_COOLDOWN seconden (tijdstip staat in de save, dus ook na herladen).
const petCooldownLeft = () => {
  const member = team.getBuddy();
  if (!member?.lastPetAt) return 0;
  return Math.max(0, Math.ceil(PET_COOLDOWN - (Date.now() - member.lastPetAt) / 1000));
};

let strokePixels = 0;

const tryPet = () => {
  const wait = petCooldownLeft();
  if (wait > 0) {
    hud.toast(`Je kan je buddy over ${wait}s weer aaien.`, 1500);
    return false;
  }
  return true;
};

const completePet = () => {
  const member = team.getBuddy();
  if (!member || petCooldownLeft() > 0) return;
  heart.pop();
  buddy.react();
  hud.toast(`+${PET_XP} XP – ${getSpecies(member.species).name} vindt het fijn!`, 1800);
  giveXp(PET_XP, { happiness: Math.min(100, member.happiness + PET_HAPPINESS), lastPetAt: Date.now() });
};

const pointer = createPointer(canvas, camera, [
  {
    object: buddy.group,
    cursor: 'grab',
    onClick: () => {
      strokePixels = 0;
      tryPet();
    },
    onStroke: (pixels) => {
      if (petCooldownLeft() > 0) return;
      strokePixels += pixels;
      if (strokePixels >= PET_STROKE_PIXELS) {
        strokePixels = 0;
        completePet();
      }
    },
  },
  { object: heart.mesh, onClick: tryPet },
]);

const syncBuddy = () => {
  const member = team.getBuddy();
  buddy.setMember(member, trainer.group);
  if (member) buddy.setScale(levelScale(member.level));
  heart.setHappiness(member ? member.happiness / 100 : 0);
  hud.setBuddy(member);
};
team.onChange(syncBuddy);
syncBuddy();
const encounterChecker = createEncounterChecker(trainer.group.position);

// 'explore' = rondlopen, 'encounter' = wilde pokémon, 'training' = ballen ontwijken.
let mode = 'explore';
let walkTime = 0;
const NO_INPUT = { x: 0, z: 0 };

const wildEncounter = createWildEncounter({
  scene,
  camera,
  trainer,
  tallGrass,
  scenery,
  transition,
  hud,
  team,
  onEnd: () => {
    mode = 'explore';
    pointer.setEnabled(true);
    encounterChecker.cooldown();
    followCamera.snap();
  },
});

const training = createTraining({
  scene,
  camera,
  arena,
  transition,
  hud,
  onEnd: (member, xp) => {
    mode = 'explore';
    pointer.setEnabled(true);
    followCamera.snap();
    const current = team.getMembers().find((m) => m.uid === member.uid);
    if (current?.uid === team.getBuddy()?.uid) {
      giveXp(xp, { happiness: Math.min(100, current.happiness + TRAINING.happiness) });
    }
  },
});

const startTraining = () => {
  const member = team.getBuddy();
  if (!member || mode !== 'explore') return;
  mode = 'training';
  pointer.setEnabled(false);
  training.start(member);
};

const startEncounter = (species) => {
  mode = 'encounter';
  pointer.setEnabled(false);
  wildEncounter.start(species);
};

// Testen/demo: E start meteen een encounter (?species=mew in de url voor een vaste soort).
const params = new URLSearchParams(window.location.search);
window.addEventListener('keydown', (event) => {
  if (event.repeat || mode !== 'explore') return;
  const key = event.key.toLowerCase();
  if (event.code === 'KeyE' || key === 'e') startEncounter(getSpecies(params.get('species')) ?? pickSpecies());
  if (event.code === 'KeyR' || key === 'r') startTraining();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const timer = new THREE.Timer();

renderer.setAnimationLoop((time) => {
  timer.update(time);
  const delta = Math.min(timer.getDelta(), 0.1);

  updateTweens(delta);
  transition.update(delta);

  if (mode === 'explore') {
    const movement = input.update();
    trainer.update(delta, movement);
    followCamera.update(delta);
    buddy.update(delta, trainer.group);

    // Wandelen met je buddy levert XP op.
    if (buddy.hasBuddy() && (movement.x !== 0 || movement.z !== 0)) {
      walkTime += delta;
      if (walkTime >= WALK_XP_INTERVAL) {
        walkTime -= WALK_XP_INTERVAL;
        giveXp(WALK_XP);
      }
    }
    hud.setPetCooldown(petCooldownLeft());

    const inTallGrass = isInTallGrass(trainer.group.position);
    hud.setGrassHint(inTallGrass);
    const species = encounterChecker.update(trainer.group.position, inTallGrass);
    if (species) startEncounter(species);
  } else {
    trainer.update(delta, NO_INPUT);
    wildEncounter.update(delta);
    training.update(delta);
  }

  // Buddy en hartje enkel tijdens rondlopen.
  buddy.group.visible = mode === 'explore';
  heart.mesh.visible = mode === 'explore' && buddy.hasBuddy();
  if (heart.mesh.visible) buddy.getHeartPosition(heart.mesh.position);
  heart.update(delta, camera);

  // Zon volgt de trainer (of de arena tijdens het trainen) zodat de schaduwen scherp blijven.
  const focus = mode === 'training' ? arena.group.position : trainer.group.position;
  sun.position.copy(focus).add(SUN_OFFSET);
  sun.target.position.copy(focus);

  renderer.render(scene, camera);

  // Overgangs-shader als overlay bovenop de scène (zonder eerst te wissen).
  if (transition.isVisible()) {
    renderer.autoClear = false;
    renderer.render(transition.scene, transition.camera);
    renderer.autoClear = true;
  }
});
