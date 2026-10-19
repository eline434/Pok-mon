import { XP_BASE, XP_PER_LEVEL, MAX_LEVEL, HP_BASE, HP_PER_LEVEL } from '../constants/config.js';

export const xpToNextLevel = (level) => XP_BASE + XP_PER_LEVEL * level;

export const maxHp = (level) => HP_BASE + HP_PER_LEVEL * level;

// Telt XP op en levelt zo vaak als nodig. Geeft het nieuwe level/xp/hp terug + hoeveel levels erbij kwamen.
// Bij een level-up stijgt de huidige HP evenveel als de max HP.
export const applyXp = ({ level, xp, hp }, amount) => {
  let newLevel = level;
  let newXp = xp + amount;
  while (newLevel < MAX_LEVEL && newXp >= xpToNextLevel(newLevel)) {
    newXp -= xpToNextLevel(newLevel);
    newLevel++;
  }
  if (newLevel >= MAX_LEVEL) newXp = 0;
  const newHp = hp + maxHp(newLevel) - maxHp(level);
  return { level: newLevel, xp: newXp, hp: newHp, gained: newLevel - level };
};

// Visuele feedback: buddy wordt iets groter met zijn level (max +30%).
export const levelScale = (level) => 1 + Math.min(level - 1, 40) * 0.0075;
