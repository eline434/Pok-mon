export const FIELD_SIZE = 80;

// Eigen trainer, gerigd + loopanimatie via Mixamo.
export const TRAINER_MODEL_URL = 'models/trainer1.glb';
export const TRAINER_HEIGHT = 1.7;
export const TRAINER_MODEL_ROTATION = 0; // model kijkt al naar +z

export const TRAINER_SPEED = 4; // units per seconde
export const TRAINER_TURN_SPEED = 10;
export const TRAINER_ANIMATION_SPEED = 1.8; // loopanimatie sneller afspelen zodat de voeten niet glijden

// Camera volgt de trainer met deze offset (achter en boven).
export const CAMERA_OFFSET = { x: 0, y: 4, z: 7 };
export const CAMERA_SMOOTHING = 5;

// Hoe lang de "pop" van het hartje duurt en hoe lang hij roze blijft (seconden).
export const HEART_POP_DURATION = 0.67;
export const HEART_HOLD_DURATION = 1.2;

// Buddy volgt schuin achter de trainer.
export const BUDDY_OFFSET = { side: 1.1, back: 1.2 };
export const BUDDY_SPEED = 5.5;
export const BUDDY_TURN_SPEED = 8;
export const BUDDY_HEART_GAP = 0.5; // hartje zweeft zoveel boven de buddy

// Aaien: kan om de PET_COOLDOWN seconden. Zoveel pixels over de buddy slepen = één aai.
export const PET_COOLDOWN = 30;
export const PET_STROKE_PIXELS = 220;
export const PET_HAPPINESS = 10; // max 100
export const PET_XP = 3; // enkel als de buddy volle HP heeft
export const PET_HEAL_FRACTION = 0.25; // aaien healt dit deel van de max HP (en geeft dan geen XP)

// HP: max HP = HP_BASE + HP_PER_LEVEL * level. Daalt in gevechten, healen kan enkel door aaien.
export const HP_BASE = 20;
export const HP_PER_LEVEL = 5;

// Wandelen met je buddy: elke WALK_XP_INTERVAL seconden lopen = WALK_XP.
export const WALK_XP_INTERVAL = 10;
export const WALK_XP = 1;

// Levelen: XP nodig voor het volgende level = XP_BASE + XP_PER_LEVEL * level.
export const XP_BASE = 5;
export const XP_PER_LEVEL = 4;
export const MAX_LEVEL = 100;

// Trainen: ballen ontwijken.
export const TRAINING = {
  duration: 30, // seconden
  lives: 3,
  xpPerDodge: 2,
  surviveBonus: 5,
  happiness: 5,
  ballSize: 0.5, // diameter in meter
  ballSpeed: { start: 5, perSecond: 0.15 },
  spawnInterval: { start: 1.8, end: 0.9 }, // seconden tussen ballen (begin -> einde)
  jumpSpeed: 7.5,
  gravity: 22,
  arenaPosition: { x: 0, z: -140 }, // buiten het veld, uit het zicht
};
