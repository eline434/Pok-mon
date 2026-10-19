import { getSpecies } from '../constants/pokemon.js';

const starsLabel = (stars) => (stars > 0 ? '★'.repeat(stars) : '');

export const createHud = (team) => {
  const root = document.createElement('div');
  root.id = 'hud';
  root.innerHTML = `
    <button class="hud-button" id="team-button" type="button">Team <kbd>T</kbd></button>
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
    grassHint.hidden = true;
    toggleTeam(false);
  };

  const hideEncounter = () => {
    encounterPanel.hidden = true;
    teamButton.hidden = false;
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
        info.textContent = `${species.name} ${starsLabel(species.stars)} – lv. ${member.level}`;

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

  return { showEncounter, hideEncounter, setText, setActions, setGrassHint, toggleTeam };
};
