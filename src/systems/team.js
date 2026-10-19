import { maxHp } from './progression.js';

// Gevangen pokémon + gekozen buddy, opgeslagen in localStorage.
const STORAGE_KEY = 'pokemon-field-save';

const load = () => {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data && Array.isArray(data.team)) {
      // Oudere saves hebben nog geen HP: begin met volle HP.
      data.team.forEach((member) => {
        member.hp ??= maxHp(member.level);
      });
      return data;
    }
  } catch {
    // geen of kapotte save: opnieuw beginnen
  }
  return { team: [], buddyUid: null };
};

export const createTeam = () => {
  const state = load();
  const listeners = new Set();

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // bv. privévenster zonder opslag: spel werkt verder, enkel zonder save
    }
    listeners.forEach((listener) => listener(state));
  };

  const add = (species, level) => {
    const member = {
      uid: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      species: species.id,
      level,
      xp: 0,
      hp: maxHp(level),
      happiness: 0,
      caughtAt: Date.now(),
    };
    state.team.push(member);
    // Eerste vangst wordt automatisch je buddy.
    if (!state.buddyUid) state.buddyUid = member.uid;
    save();
    return member;
  };

  const updateMember = (uid, changes) => {
    const member = state.team.find((m) => m.uid === uid);
    if (!member) return;
    Object.assign(member, changes);
    save();
  };

  const setBuddy = (uid) => {
    state.buddyUid = uid;
    save();
  };

  return {
    add,
    updateMember,
    setBuddy,
    getMembers: () => state.team,
    getBuddy: () => state.team.find((member) => member.uid === state.buddyUid) ?? null,
    onChange: (listener) => listeners.add(listener),
  };
};
