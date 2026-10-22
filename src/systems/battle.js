import * as THREE from 'three/webgpu';
import { BATTLE } from '../constants/config.js';
import { getSpecies } from '../constants/pokemon.js';
import { NPC_LEVEL_STEP } from '../constants/npcs.js';
import { createPokemon } from '../objects/pokemon.js';
import { createNpcModel } from '../objects/npc.js';
import { maxHp, levelScale } from './progression.js';
import { tween, wait, easeOutQuad } from '../utils/tween.js';

const PLAYER_SPOT = new THREE.Vector3(-1.8, 0, 0.4);
const ENEMY_SPOT = new THREE.Vector3(1.8, 0, -0.4);
const NPC_SPOT = new THREE.Vector3(3.6, 0, -1.4);

const randomBetween = (min, max) => min + Math.random() * (max - min);

const pickEnemyAction = () => {
  const roll = Math.random();
  const { attack, strong } = BATTLE.enemyChoices;
  if (roll < attack) return 'attack';
  if (roll < attack + strong) return 'strong';
  return 'defend';
};

// Schade: kracht van de aanval, geschaald met het verschil in level, met wat toeval.
const damageFor = (move, attackerLevel, defenderLevel, defending) => {
  const base = BATTLE[move].power * ((attackerLevel + 10) / (defenderLevel + 10));
  const factor = defending ? BATTLE.defendFactor : 1;
  return Math.max(1, Math.round(base * randomBetween(0.85, 1.15) * factor));
};

// Beurtgebaseerd gevecht tegen een NPC-trainer, in de arena buiten het veld.
export const createBattle = ({ camera, arena, transition, hud, team, onEnd }) => {
  let state = null;

  const fighterLabel = (fighter) => ({
    name: fighter.species.name,
    level: fighter.level,
    hp: fighter.hp,
    max: fighter.max,
  });
  const updateBars = () => hud.setBattle({ player: fighterLabel(state.player), enemy: fighterLabel(state.enemy) });

  const createFighter = (species, level, hp, spot, facing) => {
    const pokemon = createPokemon(species);
    pokemon.root.position.copy(spot);
    pokemon.root.rotation.y = facing;
    pokemon.root.scale.setScalar(levelScale(level));
    arena.group.add(pokemon.root);
    return { species, level, hp, max: maxHp(level), pokemon, home: spot.clone() };
  };

  const start = async (npc, member) => {
    const definition = npc.definition;
    const enemyLevel = definition.baseLevel + team.getNpcWins(definition.id) * NPC_LEVEL_STEP;
    hud.showEncounter('');
    await transition.cover();

    const player = createFighter(getSpecies(member.species), member.level, member.hp, PLAYER_SPOT, Math.PI / 2);
    const enemySpecies = getSpecies(definition.pokemon);
    const enemy = createFighter(enemySpecies, enemyLevel, maxHp(enemyLevel), ENEMY_SPOT, -Math.PI / 2);

    // De NPC staat achter zijn pokémon.
    const trainer = createNpcModel(definition.colors);
    trainer.holder.position.copy(NPC_SPOT);
    trainer.holder.rotation.y = -Math.PI / 2 - 0.4;
    arena.group.add(trainer.holder);

    state = { npc, member, player, enemy, trainer, finished: false };

    // Camera schuin achter de eigen pokémon.
    const center = arena.group.position;
    camera.position.set(center.x - 3.6, 2, center.z + 4.4);
    camera.lookAt(center.x + 0.9, 0.7, center.z - 0.4);

    updateBars();
    await transition.reveal();
    hud.setText(`${definition.name} wil vechten! ${definition.name} kiest ${enemySpecies.name} (lv. ${enemyLevel}).`);
    await wait(1.2);
    showChoices();
  };

  const showChoices = () => {
    hud.setText(`Wat doet ${state.player.species.name}?`);
    hud.setActions([
      { label: 'Aanval', onClick: () => playRound('attack') },
      { label: 'Sterke aanval', onClick: () => playRound('strong') },
      { label: 'Verdedigen', onClick: () => playRound('defend') },
    ]);
  };

  // Aanvaller springt naar de verdediger en terug.
  const lunge = async (attacker, defender) => {
    const from = attacker.home;
    const to = from.clone().lerp(defender.home, 0.45);
    await tween(0.18, (t) => attacker.pokemon.root.position.lerpVectors(from, to, t), easeOutQuad);
    await tween(0.22, (t) => attacker.pokemon.root.position.lerpVectors(to, from, t));
  };

  // Getroffen: even schudden en knipperen.
  const shake = async (fighter) => {
    const root = fighter.pokemon.root;
    await tween(0.4, (t) => {
      root.position.x = fighter.home.x + Math.sin(t * Math.PI * 8) * 0.12 * (1 - t);
      root.visible = Math.floor(t * 10) % 2 === 0;
    });
    root.position.copy(fighter.home);
    root.visible = true;
  };

  // Eén aanval uitvoeren. Geeft true terug als de verdediger KO is.
  const attack = async (attacker, defender, move, defending) => {
    const label = move === 'strong' ? 'een sterke aanval' : 'een aanval';
    hud.setText(`${attacker.species.name} doet ${label}!`);
    await lunge(attacker, defender);

    if (Math.random() > BATTLE[move].accuracy) {
      hud.setText(`${attacker.species.name} mist!`);
      await wait(0.8);
      return false;
    }

    const damage = damageFor(move, attacker.level, defender.level, defending);
    defender.hp = Math.max(0, defender.hp - damage);
    if (defender === state.player) team.updateMember(state.member.uid, { hp: defender.hp });
    updateBars();
    hud.setText(`${defender.species.name} verliest ${damage} HP${defending ? ' (verdedigd)' : ''}.`);
    await shake(defender);
    await wait(0.6);
    return defender.hp === 0;
  };

  const faint = async (fighter) => {
    await tween(0.4, (t) => fighter.pokemon.root.scale.setScalar(levelScale(fighter.level) * (1 - t)));
    fighter.pokemon.root.visible = false;
  };

  const playRound = async (playerMove) => {
    hud.setActions([]);
    const { player, enemy } = state;
    const enemyMove = pickEnemyAction();
    const playerDefends = playerMove === 'defend';
    const enemyDefends = enemyMove === 'defend';

    if (playerDefends) {
      hud.setText(`${player.species.name} verdedigt zich.`);
      await wait(0.8);
    }
    if (enemyDefends) {
      hud.setText(`${enemy.species.name} verdedigt zich.`);
      await wait(0.8);
    }

    if (!playerDefends && (await attack(player, enemy, playerMove, enemyDefends))) {
      await faint(enemy);
      return finish(true);
    }
    if (!enemyDefends && (await attack(enemy, player, enemyMove, playerDefends))) {
      await faint(player);
      return finish(false);
    }
    showChoices();
  };

  const finish = (won) => {
    state.finished = true;
    const { npc, player, enemy } = state;
    const name = npc.definition.name;
    let xp = 0;
    if (won) {
      xp = BATTLE.xpBase + enemy.level * BATTLE.xpPerEnemyLevel;
      team.addNpcWin(npc.definition.id);
      hud.setText(`Je verslaat ${name}! ${player.species.name} krijgt +${xp} XP. ${name} gaat harder trainen…`);
    } else {
      hud.setText(`${player.species.name} is uitgeput… Aai je buddy om hem te healen.`);
    }
    hud.setActions([{ label: 'Terug naar het veld', onClick: () => leave(won, xp) }]);
  };

  const leave = async (won, xp) => {
    hud.setActions([]);
    await transition.cover(0.5);
    const { player, enemy, trainer } = state;
    arena.group.remove(player.pokemon.root, enemy.pokemon.root, trainer.holder);
    state = null;
    hud.setBattle(null);
    hud.hideEncounter();
    onEnd({ won, xp });
    await transition.reveal(0.4);
  };

  const update = (delta) => {
    if (!state) return;
    state.player.pokemon.update(delta);
    state.enemy.pokemon.update(delta);
    state.trainer.update(delta);
  };

  return { start, update };
};
