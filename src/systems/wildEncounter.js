import * as THREE from 'three/webgpu';
import { RARITY, WILD_LEVEL, POKEBALL_MODEL } from '../constants/pokemon.js';
import { createPokemon } from '../objects/pokemon.js';
import { createPokeball } from '../objects/pokeball.js';
import { tween, wait, easeInQuad, easeOutBounce, easeInOutQuad } from '../utils/tween.js';

const randomLevel = (species) => {
  const { min, max, perStar } = WILD_LEVEL;
  return min + Math.floor(Math.random() * (max - min + 1)) + species.stars * perStar;
};

// Volledige wilde encounter: overgang, pokémon tonen, pokéball gooien, vangen of vluchten.
export const createWildEncounter = ({ scene, camera, trainer, tallGrass, scenery, transition, hud, team, onEnd }) => {
  let wild = null;
  let ball = null;
  let level = 1;
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();

  const placeScene = (species) => {
    const trainerPos = trainer.group.position;
    forward.set(Math.sin(trainer.group.rotation.y), 0, Math.cos(trainer.group.rotation.y));
    right.set(-forward.z, 0, forward.x);

    // Pokémon voor de trainer, naar hem toe gedraaid.
    wild = createPokemon(species);
    const distance = 3.2 + species.height * 0.6;
    wild.root.position.copy(trainerPos).addScaledVector(forward, distance);
    wild.root.rotation.y = Math.atan2(-forward.x, -forward.z);
    scene.add(wild.root);

    // Gras tussen trainer en pokémon platleggen zodat je alles ziet.
    const points = [0, 0.25, 0.5, 0.75, 1].map((t) => trainerPos.clone().addScaledVector(forward, distance * t));
    tallGrass.flatten(points, 1.8);

    // Camera schuin achter de trainer, hoog genoeg om over zijn arm heen te kijken.
    const lookAt = trainerPos.clone().lerp(wild.root.position, 0.75);
    lookAt.y = species.hover + species.height * 0.4;
    camera.position.copy(trainerPos).addScaledVector(forward, -2).addScaledVector(right, 1.9);
    camera.position.y = 2.1 + species.height * 0.3;
    camera.lookAt(lookAt);

    // Bomen/struiken tussen camera en pokémon (en er vlak achter) verbergen.
    const sightLine = [0, 0.25, 0.5, 0.75, 1, 1.3].map((t) => camera.position.clone().lerp(wild.root.position, t));
    scenery.hideNear(sightLine, 1);
  };

  const clearScene = () => {
    if (wild) scene.remove(wild.root);
    if (ball) scene.remove(ball);
    wild = null;
    ball = null;
    tallGrass.restore();
    scenery.restore();
  };

  const showChoices = () => {
    hud.setActions([
      { label: 'Gooi pokéball', onClick: throwBall },
      { label: 'Vlucht', onClick: runAway },
    ]);
  };

  const start = async (species) => {
    hud.showEncounter('');
    await transition.cover();
    level = randomLevel(species);
    placeScene(species);
    await transition.reveal();
    const stars = species.stars > 0 ? ` ${'★'.repeat(species.stars)}` : '';
    hud.setText(`Een wilde ${species.name}${stars} (lv. ${level}) verschijnt!`);
    showChoices();
  };

  const end = async () => {
    hud.setActions([]);
    await transition.cover(0.5);
    clearScene();
    hud.hideEncounter();
    onEnd();
    await transition.reveal(0.4);
  };

  const runAway = async () => {
    hud.setActions([]);
    hud.setText('Je bent veilig weggelopen.');
    await wait(0.8);
    await end();
  };

  const throwBall = async () => {
    const species = wild.species;
    const { catchRate, fleeRate } = RARITY[species.stars];
    hud.setActions([]);
    hud.setText('Je gooit een pokéball!');

    // Boog van de hand van de trainer naar het midden van de pokémon.
    ball = createPokeball();
    scene.add(ball);
    const start = trainer.group.position.clone().addScaledVector(right, 0.35);
    start.y = 1.4;
    const target = wild.root.position.clone();
    target.y = species.hover + species.height * 0.55;
    await tween(0.7, (t) => {
      ball.position.lerpVectors(start, target, t);
      ball.position.y += Math.sin(t * Math.PI) * 1.2;
      ball.rotation.x = -t * 12;
    });

    // Pokémon wordt in de bal getrokken.
    await tween(0.3, (t) => wild.root.scale.setScalar(1 - t), easeInQuad);

    // Bal valt op de grond.
    const top = ball.position.y;
    const ground = POKEBALL_MODEL.height / 2;
    await tween(0.5, (t) => (ball.position.y = top + (ground - top) * t), easeOutBounce);
    ball.rotation.set(0, wild.root.rotation.y, 0);

    // Wiebelen: 3x bij succes, anders breekt hij eerder los.
    const caught = Math.random() < catchRate;
    const wobbles = caught ? 3 : Math.floor(Math.random() * 3);
    for (let i = 0; i < wobbles; i++) {
      await wait(0.35);
      await tween(0.5, (t) => (ball.rotation.z = Math.sin(t * Math.PI * 2) * 0.45), easeInOutQuad);
    }
    await wait(0.4);

    if (caught) {
      await tween(0.25, (t) => ball.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.25));
      team.add(species, level);
      hud.setText(`Gotcha! ${species.name} is gevangen!`);
      await wait(1.6);
      await end();
      return;
    }

    // Losgebroken.
    scene.remove(ball);
    ball = null;
    await tween(0.25, (t) => wild.root.scale.setScalar(t));

    if (Math.random() < fleeRate) {
      hud.setText(`Oh nee! ${species.name} brak los en is gevlucht!`);
      await wait(0.8);
      await tween(0.3, (t) => wild.root.scale.setScalar(1 - t));
      await wait(0.6);
      await end();
      return;
    }

    hud.setText(`Oh nee! ${species.name} brak los!`);
    showChoices();
  };

  const update = (delta) => {
    wild?.update(delta);
  };

  return { start, update, isActive: () => wild !== null };
};
