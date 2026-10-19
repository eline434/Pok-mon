import * as THREE from 'three/webgpu';
import { TRAINING } from '../constants/config.js';
import { getSpecies, POKEBALL_MODEL } from '../constants/pokemon.js';
import { createPokemon } from '../objects/pokemon.js';
import { createPokeball } from '../objects/pokeball.js';
import { levelScale } from './progression.js';

const POKEMON_X = -4; // positie van de buddy op de piste (lokaal in de arena)
const SPAWN_X = 11;
const DESPAWN_X = -12;

// Mini-spel "ballen ontwijken": de buddy springt over aanrollende pokéballs.
export const createTraining = ({ scene, camera, arena, transition, hud, onEnd }) => {
  let state = null; // null = niet aan het trainen

  // Sprong-buffer: wie net te vroeg drukt, springt meteen bij de landing.
  const JUMP_BUFFER = 0.15;
  const jump = () => {
    if (!state || state.finished) return;
    state.jumpBuffer = JUMP_BUFFER;
  };

  const onKey = (event) => {
    if (['Space', 'ArrowUp', 'KeyW', 'KeyZ'].includes(event.code)) {
      event.preventDefault();
      jump();
    }
  };
  const onPointer = (event) => {
    if (event.target.closest?.('button')) return; // klik op een HUD-knop is geen sprong
    jump();
  };

  const spawnBall = () => {
    const ball = createPokeball();
    ball.scale.setScalar(TRAINING.ballSize / POKEBALL_MODEL.height);
    ball.position.set(SPAWN_X, TRAINING.ballSize / 2, 0);
    arena.group.add(ball);
    state.balls.push({ mesh: ball, passed: false, hit: false, vy: 0 });
  };

  const start = async (member) => {
    const species = getSpecies(member.species);
    hud.showEncounter('');
    await transition.cover();

    // Zwevende pokémon hangen tijdens het trainen laag, anders vliegen de ballen er gewoon onder.
    const pokemon = createPokemon({ ...species, hover: Math.min(species.hover, 0.1) });
    pokemon.root.scale.setScalar(levelScale(member.level));
    pokemon.root.position.set(POKEMON_X, 0, 0);
    pokemon.root.rotation.y = Math.PI / 2; // kijkt naar de aanrollende ballen (+x)
    arena.group.add(pokemon.root);

    state = {
      member,
      species,
      pokemon,
      balls: [],
      time: 0,
      nextSpawn: 1,
      lives: TRAINING.lives,
      dodged: 0,
      y: 0,
      vy: 0,
      jumpBuffer: 0,
      hitFlash: 0,
      finished: false,
    };

    // Zijaanzicht op de piste.
    const center = arena.group.position;
    camera.position.set(center.x - 1, 2.6, center.z + 9);
    camera.lookAt(center.x - 1, 0.8, center.z);

    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);

    await transition.reveal();
    hud.setText(`Help ${species.name} de ballen te ontwijken! Spatie of klik = springen.`);
    hud.setTrainingStats({ lives: state.lives, dodged: 0, timeLeft: TRAINING.duration });
  };

  const finish = (survived) => {
    state.finished = true;
    const xp = state.dodged * TRAINING.xpPerDodge + (survived ? TRAINING.surviveBonus : 0);
    const name = state.species.name;
    hud.setText(
      survived
        ? `Goed gedaan! ${name} ontweek ${state.dodged} ballen. +${xp} XP`
        : `Oei, geen levens meer. ${name} ontweek ${state.dodged} ballen. +${xp} XP`,
    );
    hud.setActions([{ label: 'Terug naar het veld', onClick: () => leave(xp) }]);
  };

  const leave = async (xp) => {
    hud.setActions([]);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('pointerdown', onPointer);
    await transition.cover(0.5);
    state.balls.forEach((ball) => arena.group.remove(ball.mesh));
    arena.group.remove(state.pokemon.root);
    const { member } = state;
    state = null;
    hud.setTrainingStats(null);
    hud.hideEncounter();
    onEnd(member, xp);
    await transition.reveal(0.4);
  };

  const update = (delta) => {
    if (!state) return;
    const { pokemon } = state;
    pokemon.update(delta);

    // Springen met zwaartekracht.
    state.jumpBuffer = Math.max(0, state.jumpBuffer - delta);
    if (state.jumpBuffer > 0 && state.y === 0) {
      state.vy = TRAINING.jumpSpeed;
      state.jumpBuffer = 0;
    }
    state.vy -= TRAINING.gravity * delta;
    state.y = Math.max(0, state.y + state.vy * delta);
    if (state.y === 0) state.vy = Math.max(0, state.vy);
    pokemon.root.position.y = state.y;

    // Kort knipperen na een treffer.
    state.hitFlash = Math.max(0, state.hitFlash - delta);
    pokemon.root.visible = state.hitFlash === 0 || Math.floor(state.hitFlash * 12) % 2 === 0;

    if (state.finished) return;
    state.time += delta;

    // Ballen: sneller en vaker naarmate de tijd loopt.
    const progress = Math.min(state.time / TRAINING.duration, 1);
    const speed = TRAINING.ballSpeed.start + TRAINING.ballSpeed.perSecond * state.time;
    state.nextSpawn -= delta;
    if (state.nextSpawn <= 0) {
      spawnBall();
      const interval = THREE.MathUtils.lerp(TRAINING.spawnInterval.start, TRAINING.spawnInterval.end, progress);
      state.nextSpawn = interval * THREE.MathUtils.randFloat(0.75, 1.25);
    }

    const radius = TRAINING.ballSize / 2;
    const reach = radius + 0.2 * pokemon.root.scale.x; // ongeveer de halve breedte van de pokémon
    for (const ball of state.balls) {
      ball.mesh.position.x -= speed * delta;
      ball.mesh.rotation.z += (speed / radius) * delta; // rollen

      // Getroffen bal stuitert in een boog weg.
      if (ball.hit) {
        ball.vy -= TRAINING.gravity * delta;
        ball.mesh.position.y = Math.max(radius, ball.mesh.position.y + ball.vy * delta);
      }

      const dx = Math.abs(ball.mesh.position.x - POKEMON_X);
      if (!ball.hit && !ball.passed && dx < reach && state.y < TRAINING.ballSize * 0.6) {
        ball.hit = true;
        ball.vy = 6;
        state.lives--;
        state.hitFlash = 0.8;
      }
      if (!ball.hit && !ball.passed && ball.mesh.position.x < POKEMON_X - reach) {
        ball.passed = true;
        state.dodged++;
      }
    }

    // Ballen die voorbij zijn opruimen.
    state.balls = state.balls.filter((ball) => {
      if (ball.mesh.position.x > DESPAWN_X) return true;
      arena.group.remove(ball.mesh);
      return false;
    });

    const timeLeft = Math.max(0, Math.ceil(TRAINING.duration - state.time));
    hud.setTrainingStats({ lives: state.lives, dodged: state.dodged, timeLeft });

    if (state.lives <= 0) finish(false);
    else if (state.time >= TRAINING.duration) finish(true);
  };

  return { start, update };
};
