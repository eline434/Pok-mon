export const FIELD_SIZE = 80;

// "Man" door Polygonal Mind (poly.pizza, CC0).
export const TRAINER_MODEL_URL = 'models/trainer.glb';
export const TRAINER_HEIGHT = 1.7;
export const TRAINER_MODEL_ROTATION = -Math.PI / 2; // model kijkt standaard naar +x, draai naar +z

export const TRAINER_SPEED = 4; // units per seconde
export const TRAINER_TURN_SPEED = 10;

// Camera volgt de trainer met deze offset (achter en boven).
export const CAMERA_OFFSET = { x: 0, y: 4, z: 7 };
export const CAMERA_SMOOTHING = 5;

// Hoe lang de "pop" van het hartje duurt en hoe lang hij roze blijft (seconden).
export const HEART_POP_DURATION = 0.67;
export const HEART_HOLD_DURATION = 1.2;
