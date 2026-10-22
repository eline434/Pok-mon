import { getSpecies } from '../constants/pokemon.js';
import { xpToNextLevel, maxHp } from '../systems/progression.js';

const starsLabel = (stars) => (stars > 0 ? '★'.repeat(stars) : '');

// onTrain: wordt opgeroepen bij klik op "Trainen" (de R-toets regelt main.js).
export const createHud = (team, { onTrain } = {}) => {
  const root = document.createElement('div');
  root.id = 'hud';
  root.innerHTML = `
    <div id="hud-buttons">
      <button class="hud-button" id="train-button" type="button" hidden>Trainen <kbd>R</kbd></button>
      <button class="hud-button" id="team-button" type="button">Team <kbd>T</kbd></button>
    </div>
    <section id="buddy-status" hidden>
      <p id="buddy-name"></p>
      <p class="bar-label">HP <span id="buddy-hp-text"></span></p>
      <div class="bar hp"><div id="buddy-hp"></div></div>
      <p class="bar-label">XP <span id="buddy-xp-text"></span></p>
      <div class="bar xp"><div id="buddy-xp"></div></div>
      <p id="pet-status"></p>
    </section>
    <p id="training-stats" hidden></p>
    <section id="battle-bars" hidden>
      <div class="fighter" id="battle-player"><p></p><div class="bar hp"><div></div></div><span></span></div>
      <div class="fighter" id="battle-enemy"><p></p><div class="bar hp"><div></div></div><span></span></div>
    </section>
    <div id="talk-prompt" hidden>
      <span></span>
      <button class="hud-button" type="button">Vechten <kbd>F</kbd></button>
    </div>
    <p id="toast" hidden></p>
    <p id="grass-hint" hidden>Je loopt door hoog gras…</p>
    <section id="encounter-panel" hidden>
      <p id="encounter-text"></p>
      <div id="encounter-actions"></div>
    </section>
    <div id="team-panel" hidden>
      <section class="panel">
        <h2>Jouw team</h2>
        <ul id="team-list"></ul>
        <button class="hud-button" id="team-close" type="button">Sluiten</button>
      </section>
    </div>
  `;
  document.body.append(root);

  const teamButton = root.querySelector('#team-button');
  const grassHint = root.querySelector('#grass-hint');
  const encounterPanel = root.querySelector('#encounter-panel');
  const encounterText = root.querySelector('#encounter-text');
  const encounterActions = root.querySelector('#encounter-actions');
  const teamPanel = root.querySelector('#team-panel');
  const buddyStatus = root.querySelector('#buddy-status');
  const buddyName = root.querySelector('#buddy-name');
  const buddyHp = root.querySelector('#buddy-hp');
  const buddyHpText = root.querySelector('#buddy-hp-text');
  const buddyXp = root.querySelector('#buddy-xp');
  const buddyXpText = root.querySelector('#buddy-xp-text');
  const petStatus = root.querySelector('#pet-status');
  const trainButton = root.querySelector('#train-button');
  const trainingStats = root.querySelector('#training-stats');
  const toastElement = root.querySelector('#toast');
  const battleBars = root.querySelector('#battle-bars');
  const talkPrompt = root.querySelector('#talk-prompt');
  const talkText = talkPrompt.querySelector('span');
  const talkButton = talkPrompt.querySelector('button');
  let onTalk = null;
  talkButton.addEventListener('click', () => onTalk?.());
  const teamList = root.querySelector('#team-list');

  // Encounter-paneel
  const setText = (text) => {
    encounterText.textContent = text;
  };

  // actions: [{ label, onClick }]
  const setActions = (actions) => {
    encounterActions.replaceChildren(
      ...actions.map(({ label, onClick }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'hud-button';
        button.textContent = label;
        button.addEventListener('click', onClick);
        return button;
      }),
    );
  };

  const showEncounter = (text) => {
    setText(text);
    setActions([]);
    encounterPanel.hidden = false;
    teamButton.hidden = true;
    trainButton.classList.add('is-hidden');
    buddyStatus.classList.add('is-hidden');
    grassHint.hidden = true;
    toggleTeam(false);
  };

  const hideEncounter = () => {
    encounterPanel.hidden = true;
    teamButton.hidden = false;
    trainButton.classList.remove('is-hidden');
    buddyStatus.classList.remove('is-hidden');
  };

  // Buddy-status linksboven (member = null -> verbergen).
  const setBuddy = (member) => {
    buddyStatus.hidden = !member;
    trainButton.hidden = !member;
    if (!member) return;
    const species = getSpecies(member.species);
    const needed = xpToNextLevel(member.level);
    buddyName.textContent = `${species.name} – lv. ${member.level}`;
    const max = maxHp(member.level);
    buddyHp.style.width = `${(member.hp / max) * 100}%`;
    buddyHp.classList.toggle('is-low', member.hp / max < 0.3);
    buddyHpText.textContent = `${member.hp}/${max}`;
    buddyXp.style.width = `${(member.xp / needed) * 100}%`;
    buddyXpText.textContent = `${member.xp}/${needed}`;
  };

  // Aai-timer: 0 = je kan aaien, anders aantal seconden wachten.
  let lastPetSeconds = null;
  const setPetCooldown = (seconds) => {
    if (seconds === lastPetSeconds) return;
    lastPetSeconds = seconds;
    petStatus.textContent = seconds > 0 ? `Aaien kan over ${seconds}s` : 'Sleep over je buddy om te aaien!';
    petStatus.classList.toggle('is-ready', seconds === 0);
  };

  // Score tijdens het trainen (null = verbergen).
  const setTrainingStats = (stats) => {
    trainingStats.hidden = !stats;
    if (!stats) return;
    trainingStats.textContent = `Levens: ${'♥'.repeat(stats.lives)}${'♡'.repeat(Math.max(0, 3 - stats.lives))}   ·   Ontweken: ${stats.dodged}   ·   ${stats.timeLeft}s`;
  };

  // HP-balken tijdens een gevecht (null = verbergen).
  const renderFighter = (element, { name, level, hp, max }) => {
    element.querySelector('p').textContent = `${name} – lv. ${level}`;
    const bar = element.querySelector('.bar > div');
    bar.style.width = `${(hp / max) * 100}%`;
    bar.classList.toggle('is-low', hp / max < 0.3);
    element.querySelector('span').textContent = `HP ${hp}/${max}`;
  };
  const setBattle = (battle) => {
    battleBars.hidden = !battle;
    if (!battle) return;
    renderFighter(root.querySelector('#battle-player'), battle.player);
    renderFighter(root.querySelector('#battle-enemy'), battle.enemy);
  };

  // Vraag om te vechten als je bij een NPC staat (text = null -> verbergen).
  let lastTalkText = null;
  const setTalkPrompt = (text, onClick) => {
    onTalk = onClick;
    if (text === lastTalkText) return;
    lastTalkText = text;
    talkPrompt.hidden = !text;
    if (text) talkText.textContent = text;
  };

  // Korte melding bovenaan (bv. level up).
  let toastTimeout = null;
  const toast = (text, duration = 2500) => {
    toastElement.textContent = text;
    toastElement.hidden = false;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => (toastElement.hidden = true), duration);
  };

  // Team-menu
  const renderTeam = () => {
    const members = team.getMembers();
    const buddy = team.getBuddy();

    if (members.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'team-empty';
      empty.textContent = 'Nog geen pokémon gevangen. Loop door het hoge gras!';
      teamList.replaceChildren(empty);
      return;
    }

    teamList.replaceChildren(
      ...members.map((member) => {
        const species = getSpecies(member.species);
        const item = document.createElement('li');

        const info = document.createElement('span');
        info.textContent = `${species.name} ${starsLabel(species.stars)} – lv. ${member.level} – ♥ ${member.hp}/${maxHp(member.level)}`;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'hud-button';
        const isBuddy = buddy?.uid === member.uid;
        button.textContent = isBuddy ? 'Buddy ✓' : 'Neem mee';
        button.disabled = isBuddy;
        button.addEventListener('click', () => team.setBuddy(member.uid));

        item.append(info, button);
        return item;
      }),
    );
  };

  const toggleTeam = (force) => {
    const open = force ?? teamPanel.hidden;
    if (open && !encounterPanel.hidden) return; // niet tijdens een encounter
    teamPanel.hidden = !open;
    if (open) renderTeam();
  };

  teamButton.addEventListener('click', () => toggleTeam());
  trainButton.addEventListener('click', () => onTrain?.());
  root.querySelector('#team-close').addEventListener('click', () => toggleTeam(false));
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyT') toggleTeam();
    if (event.code === 'Escape') toggleTeam(false);
  });
  team.onChange(() => {
    if (!teamPanel.hidden) renderTeam();
  });

  const setGrassHint = (visible) => {
    grassHint.hidden = !visible || !encounterPanel.hidden;
  };

  return {
    showEncounter,
    hideEncounter,
    setText,
    setActions,
    setGrassHint,
    toggleTeam,
    setBuddy,
    setPetCooldown,
    setTrainingStats,
    setBattle,
    setTalkPrompt,
    toast,
  };
};
