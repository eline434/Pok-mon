// Kleine tween-helper die meedraait in de animation loop (geen eigen requestAnimationFrame).
const tweens = new Set();

export const tween = (duration, onUpdate, ease = (t) => t) =>
  new Promise((resolve) => {
    tweens.add({ time: 0, duration, onUpdate, ease, resolve });
  });

export const wait = (duration) => tween(duration, () => {});

export const updateTweens = (delta) => {
  for (const item of [...tweens]) {
    item.time = Math.min(item.time + delta / item.duration, 1);
    item.onUpdate(item.ease(item.time));
    if (item.time >= 1) {
      tweens.delete(item);
      item.resolve();
    }
  }
};

export const easeInQuad = (t) => t * t;
export const easeOutQuad = (t) => -t * (t - 2);
export const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
export const easeOutBounce = (t) => {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};
