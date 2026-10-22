import * as THREE from 'three/webgpu';
import { SKY_COLOR, GROUND_COLOR } from './constants/colors.js';
import { createField } from './objects/field.js';
import { createTrainer } from './objects/trainer.js';
import { createHeart } from './objects/heart.js';
import { createTallGrass, isInTallGrass } from './objects/tallGrass.js';
import { updateGrassUniforms } from './objects/grassMaterial.js';
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
  PET_HEAL_FRACTION,
  WALK_XP_INTERVAL,
  WALK_XP,
  TRAINING,
} from './constants/config.js';
import { applyXp, levelScale, maxHp } from './systems/progression.js';
import { createArena } from './objects/arena.js';
import { createTraining } from './systems/training.js';
import { loadNpcModel, createNpc } from './objects/npc.js';
import { createBattle } from './systems/battle.js';
import { NPCS, NPC_TALK_RADIUS, NPC_LEVEL_STEP } from './constants/npcs.js';

const canvas = document.querySelector('#app');

// main.js heeft al gecontroleerd dat WebGPU beschikbaar is (onze shaders zijn WGSL).
const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
await renderer.init();

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
  loadNpcModel(),
]);
const arena = createArena();
scene.add(trainer.group, tallGrass.group, scenery.group, arena.group);

// NPC-trainers in het veld.
const npcs = NPCS.map((definition) => createNpc(definition));
npcs.forEach((npc) => scene.add(npc.group));

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
  team.updateMember(member.uid, { level: result.level, xp: result.xp, hp: result.hp, ...extra });
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
  const name = getSpecies(member.species).name;
  const happiness = Math.min(100, member.happiness + PET_HAPPINESS);
  const max = maxHp(member.level);

  // Gewond? Dan healt aaien, maar levert het geen XP op.
  if (member.hp < max) {
    const healed = Math.min(max - member.hp, Math.ceil(max * PET_HEAL_FRACTION));
    const hp = member.hp + healed;
    team.updateMember(member.uid, { hp, happiness, lastPetAt: Date.now() });
    hud.toast(`+${healed} HP – ${name} voelt zich beter (${hp}/${max})`, 2000);
    return;
  }

  hud.toast(`+${PET_XP} XP – ${name} vindt het fijn!`, 1800);
  giveXp(PET_XP, { happiness, lastPetAt: Date.now() });
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

// 'explore' = rondlopen, 'encounter' = wilde pokémon, 'training' = ballen ontwijken, 'battle' = NPC-gevecht.
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

const battle = createBattle({
  camera,
  arena,
  transition,
  hud,
  team,
  onEnd: ({ won, xp }) => {
    mode = 'explore';
    pointer.setEnabled(true);
    followCamera.snap();
    syncBuddy(); // HP is veranderd tijdens het gevecht
    if (won) giveXp(xp);
  },
});

// Dichtstbijzijnde NPC binnen praatafstand (of null).
const nearbyNpc = () => {
  let nearest = null;
  for (const npc of npcs) {
    const distance = npc.distanceTo(trainer.group.position);
    if (distance < NPC_TALK_RADIUS && (!nearest || distance < nearest.distance)) nearest = { npc, distance };
  }
  return nearest?.npc ?? null;
};

const startBattle = (npc) => {
  if (!npc || mode !== 'explore') return;
  const member = team.getBuddy();
  const { name } = npc.definition;
  if (!member) {
    hud.toast(`${name}: Je hebt nog geen pokémon! Vang er eerst een in het hoge gras.`, 3000);
    return;
  }
  if (member.hp <= 0) {
    hud.toast(`${getSpecies(member.species).name} is uitgeput en kan niet vechten. Aai hem eerst.`, 3000);
    return;
  }
  mode = 'battle';
  pointer.setEnabled(false);
  hud.setTalkPrompt(null);
  battle.start(npc, member);
};

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
  if (event.code === 'KeyF' || key === 'f') startBattle(nearbyNpc());
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

    // Gras buigt weg voor trainer en buddy.
    const moving = movement.x !== 0 || movement.z !== 0;
    updateGrassUniforms(delta, trainer.group.position, buddy.getPosition(), moving);

    // Wandelen met je buddy levert XP op.
    if (buddy.hasBuddy() && (movement.x !== 0 || movement.z !== 0)) {
      walkTime += delta;
      if (walkTime >= WALK_XP_INTERVAL) {
        walkTime -= WALK_XP_INTERVAL;
        giveXp(WALK_XP);
      }
    }
    hud.setPetCooldown(petCooldownLeft());

    // Vraag om te vechten als je bij een NPC staat.
    const npc = nearbyNpc();
    if (npc) {
      const { name, baseLevel, pokemon, id } = npc.definition;
      const wins = team.getNpcWins(id);
      const level = baseLevel + wins * NPC_LEVEL_STEP;
      const record = wins > 0 ? ` (al ${wins}x verslagen)` : '';
      hud.setTalkPrompt(`${name} wil vechten met ${getSpecies(pokemon).name} lv. ${level}${record}`, () => startBattle(npc));
    } else {
      hud.setTalkPrompt(null);
    }

    const inTallGrass = isInTallGrass(trainer.group.position);
    hud.setGrassHint(inTallGrass);
    const species = encounterChecker.update(trainer.group.position, inTallGrass);
    if (species) startEncounter(species);
  } else {
    trainer.update(delta, NO_INPUT);
    wildEncounter.update(delta);
    training.update(delta);
    battle.update(delta);
    hud.setTalkPrompt(null);
    updateGrassUniforms(delta, trainer.group.position, null, false); // wind blijft waaien
  }

  npcs.forEach((npc) => npc.update(delta, trainer.group.position));

  // Buddy enkel tijdens rondlopen, hartje enkel net na het aaien.
  buddy.group.visible = mode === 'explore';
  heart.mesh.visible = mode === 'explore' && buddy.hasBuddy() && heart.isActive();
  if (buddy.hasBuddy()) buddy.getHeartPosition(heart.mesh.position);
  heart.update(delta, camera);

  // Zon volgt de trainer (of de arena tijdens het trainen) zodat de schaduwen scherp blijven.
  const inArena = mode === 'training' || mode === 'battle';
  const focus = inArena ? arena.group.position : trainer.group.position;
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
