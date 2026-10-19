// Seeded random (mulberry32): elke keer dezelfde wereld-layout.
export const createRandom = (seed) => {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const range = (min, max) => min + next() * (max - min);
  return { next, range };
};
