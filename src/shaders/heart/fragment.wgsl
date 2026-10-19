// Port van het hartje uit https://www.shadertoy.com/view/Wsj3R1 (zonder de cirkel-effecten).
// uv: 0..1 over de plane, progress: 0 = grijs hartje in rust, 0 -> 1 = "pop" naar roze.
fn heartShader(uv: vec2f, progress: f32) -> vec4f {
  let pos = (uv - vec2f(0.5)) * 2.2;
  let t = clamp(progress, 0.0, 1.0);

  let t3 = max(1.0 - t * 3.0, heartEaseOutBack(t));
  let heartLen = heartLength(pos * mix(6.0, 2.0, t3));
  let th = clamp(t * 5.0, 0.0, 1.0);
  let heart = 1.0 - smoothstep(1.0, 1.02, heartLen);

  let col = heartHsv2rgb(mix(vec3f(0.0, 0.0, 0.8), vec3f(0.0, 0.5, 0.95), th));
  return vec4f(col, heart);
}

// Helpers onder de hoofdfunctie: wgslFn leest de signatuur van de eerste functie.

fn heartHsv2rgb(hsv: vec3f) -> vec3f {
  let t = vec4f(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  let p = abs(fract(hsv.x + t.xyz) * 6.0 - t.w);
  return hsv.z * mix(t.xxx, clamp(p - t.x, vec3f(0.0), vec3f(1.0)), hsv.y);
}

fn heartLength(posIn: vec2f) -> f32 {
  var pos = posIn;
  pos.y = pos.y - 0.35;
  pos = pos * 2.2;
  let r = abs(atan2(pos.x, pos.y) / 3.14159265);
  let r2 = r * r;
  let s = (39.0 * r - 66.0 * r2 + 30.0 * r2 * r) / (6.0 - 5.0 * r);
  return length(pos) / s;
}

fn heartEaseOutBack(t: f32) -> f32 {
  let g = 1.70158;
  let u = t - 1.0;
  return u * u * ((g + 1.0) * u + g) + 1.0;
}
