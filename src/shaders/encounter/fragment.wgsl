// Port van https://www.shadertoy.com/view/wsfcDM (anime speed lines).
// In plaats van iChannel0 te mengen met wit, geeft deze shader wit + alpha terug: de scène eronder is de "texture".
// uv: 0..1 over het scherm, progress: 0 = niets te zien, 1 = volledig wit, time: seconden.
fn encounterShader(uv: vec2f, progress: f32, time: f32) -> vec4f {
  let p = uv * 2.0 - vec2f(1.0); // ASPECT_AWARE: -1..1 op beide assen

  // RADIUS werd een uniform: groot = lijnen buiten beeld, negatief = alles wit.
  let radius = mix(2.6, -1.2, progress);

  // lofi(iTime, INV_ANIMATE_FREQ): schokkerige animatie zoals in anime.
  let animTime = floor(time / 0.05) * 0.05;
  let puv = vec2f(0.1 * length(p) + 10.0 * animTime, 10.0 * atan2(p.y, p.x));

  let n = encounterNoise(puv);
  let value = length(p) - radius - 2.0 * (n - 0.5);
  let alpha = smoothstep(-0.1, 0.1, value);

  return vec4f(1.0, 1.0, 1.0, alpha);
}

// Helpers onder de hoofdfunctie: wgslFn leest de signatuur van de eerste functie.

fn encounterHash(v: vec2f) -> f32 {
  return fract(sin(dot(v, vec2f(89.44, 19.36))) * 22189.22);
}

fn encounterIHash(v: vec2f, r: vec2f) -> f32 {
  let a = encounterHash(floor(v * r + vec2f(0.0, 0.0)) / r);
  let b = encounterHash(floor(v * r + vec2f(0.0, 1.0)) / r);
  let c = encounterHash(floor(v * r + vec2f(1.0, 0.0)) / r);
  let d = encounterHash(floor(v * r + vec2f(1.0, 1.0)) / r);
  let ip = smoothstep(vec2f(0.0), vec2f(1.0), fract(v * r)); // mod(x, 1.0) == fract(x)
  return mix(mix(a, b, ip.y), mix(c, d, ip.y), ip.x);
}

fn encounterNoise(v: vec2f) -> f32 {
  var sum = 0.0;
  for (var i = 1; i < 7; i++) {
    let fi = f32(i);
    let scale = pow(2.0, fi);
    sum = sum + encounterIHash(v + vec2f(fi), vec2f(2.0 * scale)) / scale;
  }
  return sum;
}
