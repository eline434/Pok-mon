# Pokémon Field – WebGPU + Three.js experiment

> Instructieplan voor mezelf én de AI-agent. Dit bestand is ook de README van het project.

**Originele Shadertoy shader(s):**
- Aaien van pokémon (hartje): https://www.shadertoy.com/view/Wsj3R1
- Start van een gevecht / encounter (speed lines): https://www.shadertoy.com/view/wsfcDM

**Live demo:** https://eline434.github.io/Pok-mon/
**Broncode:** https://github.com/eline434/Pok-mon

---

## Over het project

Een kleine third-person pokémon-game in de browser, gemaakt met **Three.js (`WebGPURenderer`)** en **WGSL-shaders** die van Shadertoy geport zijn. Niet-commercieel schoolproject.

Je loopt rond in een veld, vangt wilde pokémon in het hoge gras, neemt er één mee als **buddy**, aait en traint hem zodat hij levelt, en vecht tegen **3 NPC-trainers** die na elke nederlaag sterker worden.

### Besturing
| Toets / actie              | Wat                                                                            |
| -------------------------- | ------------------------------------------------------------------------------ |
| `WASD` / `ZQSD` / pijltjes | Rondlopen                                                                      |
| Door hoog gras lopen       | Kans op een wilde pokémon                                                      |
| `E`                        | Meteen een wilde pokémon (demo; `?species=mew` in de url voor een vaste soort) |
| Slepen over je buddy       | Aaien (om de 30 s): healt HP, of geeft XP als hij volle HP heeft               |
| `T`                        | Team-menu: buddy kiezen, HP en levels bekijken                                 |
| `R`                        | Trainen: ballen ontwijken (`spatie` / klik = springen)                         |
| `F` (bij een NPC)          | Vechten                                                                        |

### Shaders en interactie
| Shader                                                                          | Waar                                                     | Reageert op                                                                                                                              |
| ------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Hartje** (`src/shaders/heart/fragment.wgsl`, port van Wsj3R1, enkel het hart) | Boven je buddy na het aaien                              | Muis: slepen/klikken laat het hart poppen (`progress`). Uniform `happiness` maakt het roze, laat het sneller kloppen en geeft een gloed. |
| **Speed lines** (`src/shaders/encounter/fragment.wgsl`, port van wsfcDM)        | Fullscreen overgang bij encounters, trainen en gevechten | Gameplay: `progress` (lijnen schieten naar binnen tot wit) + `time` (schokkerige anime-animatie).                                        |
| **Gras** (vertex-shader in TSL, `src/objects/grassMaterial.js`)                 | Alle plukken hoog gras                                   | Speler- en buddy-positie als uniforms: gras buigt weg, ritselt terwijl je erdoor loopt, en wiegt zacht in de wind.                       |

De volledige code van alle shaders staat hieronder in [Shader-code](#shader-code).

### Gameplay-systemen
- **Vangen:** pokéball gooien in een boog, wiebelen, vangkans en vluchtkans volgens zeldzaamheid (★).
- **Buddy:** volgt je, reageert op aaien (sprongetje + pirouette), wordt groter met zijn level.
- **Levels & HP:** XP door aaien (30 s cooldown), wandelen (+1 per 10 s) en trainen (meeste XP). Max HP = 20 + 5 × level. Healen kan enkel door te aaien (dan geen XP).
- **Trainen:** mini-game "ballen ontwijken" in een aparte arena.
- **NPC-gevechten:** beurtgebaseerd (aanval / sterke aanval / verdedigen), HP-balken. Na elke overwinning wordt de pokémon van die NPC 3 levels sterker. Een buddy met 0 HP kan niet vechten.
- Alles wordt bewaard in `localStorage` (team, buddy, HP, XP, overwinningen).

### Extra's
- **Meerdere shaders**: hartje + speed-lines-overgang (allebei geport naar WGSL, aangestuurd door eigen uniforms) en een TSL-vertex-shader voor gras dat wegbuigt voor de speler.
- **Eigen Blender-modellen** voor de trainer (speler) en de NPC's, gerigd met **Mixamo**.
- **Animaties aansturen** met `AnimationMixer`: loopcyclus van de speler (pauzeert met de benen samen bij stilstaan) en idle-animatie van de NPC's.
- **NPC's herkleurd in code**: het kleurenpalet van het model wordt per NPC aangepast (canvas-texture).
- **Procedurele animaties** voor alle pokémon (hop, zweven, spartelen, reacties in gevechten).
- **Instancing** voor gras en decor, verdeeld in vakken zodat three.js wat buiten beeld is kan overslaan.
- Laadscherm met voortgang en een duidelijke melding als WebGPU niet beschikbaar is.

### Lokaal starten
```bash
npm install
npm run dev      # ontwikkelserver
npm run build    # productie-build in dist/
npm run preview  # build lokaal bekijken
```
Werkt in browsers met **WebGPU**: Chrome of Edge 113+ (desktop), Safari 26+. Zonder WebGPU toont de game een melding (de WGSL-shaders werken niet in de WebGL2-fallback).

Credits en licenties van alle modellen: zie [`CREDITS.md`](CREDITS.md).

---

## Shader-code

Alle shaders van het project. De twee Shadertoy-shaders zijn geport naar **WGSL** en worden in Three.js gebruikt via `wgslFn` op een `MeshBasicNodeMaterial`; de gras-shader is een vertex-shader in **TSL**.

### 1. Hartje – aaien van je buddy
- **Origineel:** https://www.shadertoy.com/view/Wsj3R1 (enkel het hart-effect, zonder de cirkels eromheen)
- **Bestand:** `src/shaders/heart/fragment.wgsl`, gebruikt in `src/objects/heart.js`
- **Uniforms:** `progress` (pop-animatie bij aaien), `happiness` (0–1: roze kleur, sneller kloppen, gloed), `time`

```wgsl
// Port van het hartje uit https://www.shadertoy.com/view/Wsj3R1 (zonder de cirkel-effecten).
// uv: 0..1 over de plane
// progress: 0 = hartje in rust, 0 -> 1 = "pop" (bij aaien/klikken)
// happiness: 0..1, hoe blij de buddy is -> rustkleur grijs -> roze + kloppende gloed
// time: seconden, voor het kloppen van de gloed
fn heartShader(uv: vec2f, progress: f32, happiness: f32, time: f32) -> vec4f {
  let pos = (uv - vec2f(0.5)) * 2.2;
  let t = clamp(progress, 0.0, 1.0);

  // Hoe blijer, hoe sneller het hart klopt.
  let beat = 1.0 + sin(time * (3.0 + happiness * 5.0)) * 0.04 * happiness;

  let t3 = max(1.0 - t * 3.0, heartEaseOutBack(t));
  let heartLen = heartLength(pos * mix(6.0, 2.0, t3) / beat);
  let th = max(clamp(t * 5.0, 0.0, 1.0), happiness);
  let heart = 1.0 - smoothstep(1.0, 1.02, heartLen);

  let col = heartHsv2rgb(mix(vec3f(0.0, 0.0, 0.8), vec3f(0.0, 0.5, 0.95), th));

  // Zachte gloed rond het hart, enkel bij een blije buddy.
  let glow = (1.0 - smoothstep(1.0, 1.6, heartLen)) * happiness * (0.35 + 0.15 * sin(time * 4.0));
  let glowCol = heartHsv2rgb(vec3f(0.95, 0.35, 1.0));

  let alpha = max(heart, glow);
  return vec4f(mix(glowCol, col, heart), alpha);
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
```

Gebruik in JavaScript (`src/objects/heart.js`):

```js
const heartShader = wgslFn(heartShaderSource);
const shaderOutput = heartShader({ uv: uv(), progress: uProgress, happiness: uHappiness, time: uTime });
material.colorNode = colorSpaceToWorking(shaderOutput.rgb, THREE.SRGBColorSpace);
material.opacityNode = shaderOutput.a;
```

### 2. Speed lines – overgang naar een encounter, training of gevecht
- **Origineel:** https://www.shadertoy.com/view/wsfcDM
- **Bestand:** `src/shaders/encounter/fragment.wgsl`, gebruikt in `src/objects/transition.js` (fullscreen overlay)
- **Uniforms:** `progress` (0 = niets, 1 = volledig wit; vervangt `RADIUS`), `time` (vervangt `iTime`)
- In plaats van `iChannel0` te mengen met wit, geeft de shader wit + alpha terug: de 3D-scène eronder is de "texture".

```wgsl
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
```

### 3. Gras – buigt weg voor de speler (TSL vertex-shader)
- **Bestand:** `src/objects/grassMaterial.js`, gebruikt in `src/objects/tallGrass.js`
- **Uniforms:** `uPlayer` en `uBuddy` (posities), `uMoving` (ritselen tijdens het lopen), `uTime` (wind)

```js
import * as THREE from 'three/webgpu';
import { positionLocal, uniform, vec2, vec3, float, sin, smoothstep, max } from 'three/tsl';
import { GRASS_MOTION } from '../constants/world.js';

// Gedeelde uniforms: posities van trainer en buddy, hoeveel je beweegt, tijd.
export const grassUniforms = {
  uPlayer: uniform(new THREE.Vector2()),
  uBuddy: uniform(new THREE.Vector2(9999, 9999)),
  uMoving: uniform(0), // 0 = stil, 1 = lopen (vloeiend)
  uTime: uniform(0),
};

// Duwt een vertex weg van een punt: geeft de verschuiving in xz terug.
const pushAway = (position, point, heightFactor) => {
  const offset = position.xz.sub(point);
  const distance = offset.length();
  const strength = smoothstep(float(GRASS_MOTION.bendRadius), float(0), distance);
  const direction = offset.div(max(distance, float(0.001)));
  return { push: direction.mul(strength.mul(GRASS_MOTION.bendStrength).mul(heightFactor)), strength };
};

// Vervangt het (gewone) GLTF-materiaal door een node-materiaal met een vertex-verschuiving.
// positionLocal is hier al na de instance-matrix toegepast, dus = wereldpositie (de meshes staan op de oorsprong).
export const createGrassMaterial = (original) => {
  const material = new THREE.MeshStandardNodeMaterial({
    color: original.color,
    roughness: original.roughness,
    metalness: original.metalness,
    side: original.side,
  });

  const { uPlayer, uBuddy, uMoving, uTime } = grassUniforms;
  const position = positionLocal;

  // 0 aan de grond, 1 bovenaan: de voet van het gras blijft staan, de top buigt.
  const height = position.y.div(GRASS_MOTION.height).clamp(0, 1);
  const heightFactor = height.mul(height);

  const player = pushAway(position, uPlayer, heightFactor);
  const buddy = pushAway(position, uBuddy, heightFactor.mul(0.7));
  const bend = player.push.add(buddy.push);

  // Ritselen rond de trainer terwijl hij loopt + zachte wind overal.
  const rustle = sin(uTime.mul(18).add(position.x.mul(4)).add(position.z.mul(3)))
    .mul(player.strength.mul(uMoving).mul(GRASS_MOTION.rustle).mul(heightFactor));
  const wind = sin(uTime.mul(1.6).add(position.x.mul(0.35)).add(position.z.mul(0.25)))
    .mul(GRASS_MOTION.wind)
    .mul(heightFactor);

  const sway = vec2(wind.add(rustle), wind.mul(0.6));
  const offset = bend.add(sway);

  // Weggeduwd gras zakt ook een beetje (het buigt, het wordt niet langer).
  const sink = bend.length().mul(0.45);

  material.positionNode = vec3(position.x.add(offset.x), position.y.sub(sink), position.z.add(offset.y));
  return material;
};

export const updateGrassUniforms = (delta, playerPosition, buddyPosition, moving) => {
  grassUniforms.uTime.value += delta;
  grassUniforms.uPlayer.value.set(playerPosition.x, playerPosition.z);
  if (buddyPosition) grassUniforms.uBuddy.value.set(buddyPosition.x, buddyPosition.z);
  else grassUniforms.uBuddy.value.set(9999, 9999);
  grassUniforms.uMoving.value = THREE.MathUtils.damp(grassUniforms.uMoving.value, moving ? 1 : 0, 6, delta);
};
```

---

## 1. Opdracht in één zin

Een Shadertoy fragment shader porteren naar WGSL, integreren in een Three.js-scène met `WebGPURenderer`, en zorgen dat de shader reageert op interactie. Het project moet **online werken** (geen online = geen punten).

### Waar punten vallen
| Eis                                    | Hoe we het invullen                                                |
| -------------------------------------- | ------------------------------------------------------------------ |
| Shader gepord + reageert op interactie | Shadertoy-shader als effect dat reageert op muis/gameplay (zie §4) |
| Meer dan rondkijken                    | Rondlopen, pokémon vangen, aaien, trainen, vechten                 |
| Physics (extra)                        | Rapier: speler-collision, pokéball gooien                          |
| Meerdere shaders (extra)               | Veld/gras, aaien-effect, vang-effect, battle-arena                 |
| Extra WebGPU libs (extra)              | Rapier, evt. GSAP, evt. compute-shader voor particles              |
| Eigen Blender-model (extra)            | Eigen trainer of een stuk veld, gebakken licht                     |
| Animaties aansturen (extra)            | Mixamo-animaties (idle/walk/run) via `AnimationMixer`              |

---

## 2. Spelidee (scope)

- Je loopt rond in een open veld (third person).
- In het hoge gras kun je **willekeurige pokémon tegenkomen** en vangen.
- Bij je trainer kan je **1 gevangen pokémon** laten meelopen/plaatsen.
- Die pokémon kan je **aaien** (klik/sleep over hem) en **trainen** (mini-oefening) → hij wordt sterker (level/stats).
- Op het veld staan **3 NPC-trainers** waartegen je kan vechten (beurtgebaseerd, simpel).

### Bouw in lagen (MVP eerst!)
Elke laag moet **werken en gedeployed** zijn voor je aan de volgende begint.

1. **MVP:** veld + trainer die rondloopt + 1 shader met interactie → deployed
2. Willekeurige encounters + vangen
3. Pokémon die meelopen + aaien (shader reageert)
4. Trainen + stats opslaan (localStorage)
5. 3 NPC-trainers + simpel gevecht
6. Extra's: physics, Blender-bake, extra shaders

> Als tijd tekortschiet, schrappen we van onder naar boven. Lagen 1–2 zijn al een geldige inzending.

---

## 3. Tech stack & regels (belangrijk voor de AI-agent)

- **Vite** + **Three.js** via npm (zoals The Aviator / Shadertoy-project in de les).
- Altijd importeren uit `three/webgpu`, nooit uit `three`.
- `new THREE.WebGPURenderer({ canvas, antialias: true })`, loop via `renderer.setAnimationLoop(...)`. Geen eigen `requestAnimationFrame`.
- **Geen `ShaderMaterial`** (werkt niet met WebGPURenderer). Gebruik `MeshBasicNodeMaterial` + `wgslFn` uit `three/tsl`.
- WGSL-bestanden in `src/shaders/<naam>/fragment.wgsl`, geïmporteerd met `?raw`.
- `wgslFn` leest de signatuur van de **eerste** functie in het bestand → helperfuncties **eronder** zetten. Parameternamen in JS moeten exact overeenkomen.
- Uniforms: `uniform(...)` nodes (`iTime`, `iMouse`, `iResolution`, + eigen), `.value` updaten in de loop.
- Shadertoy-vertaling (zie cheat sheet uit de les): `vec2→vec2f`, `float→f32`, `texture→textureSample` (+ sampler), `out fragColor → return`, geen `#define/#if`, geen `.s/.t`, `let` vs `var`, geen `*=` op swizzles (`.rgb *= ...` mag niet), accolades verplicht bij `if`.
- Kleurruimte: de shader levert display-klare kleuren → `colorSpaceToWorking(shaderOutput, THREE.SRGBColorSpace)` als er ook gewone belichte materialen in de scène zitten.
- Modellen: **glTF/GLB** met `GLTFLoader` (`three/addons/loaders/GLTFLoader.js`). Modellen klein houden (< 5 MB per stuk, liefst Draco/meshopt).
- Code in kleine modules (`src/objects/`, `src/systems/`, `src/shaders/`, `src/constants/`), net als bij The Aviator.
- Elke stap eindigt met: `npm run dev` werkt, geen console-errors, commit + push.
- **Geen `node_modules` committen** (`.gitignore`).

### Mappenstructuur
```
pokemon/
├─ README.md
├─ CREDITS.md
├─ index.html              # canvas + laadscherm
├─ package.json
├─ vite.config.js
├─ .gitignore              # node_modules, dist
├─ .github/workflows/      # automatische deploy naar GitHub Pages
├─ public/
│  └─ models/              # .glb bestanden (trainers, decor, pokemon/)
└─ src/
   ├─ main.js              # startpunt: laadscherm + WebGPU-check, laadt game.js
   ├─ game.js              # renderer, scene, loop, modes (rondlopen/encounter/trainen/gevecht)
   ├─ constants/           # config, kleuren, wereld, pokémon, NPC's
   ├─ objects/             # trainer, buddy, pokemon, pokeball, npc, gras, decor, arena, hartje, overgang
   ├─ systems/             # input, camera, pointer, encounters, vangen, team (save), progressie, trainen, gevecht
   ├─ shaders/
   │  ├─ heart/fragment.wgsl
   │  └─ encounter/fragment.wgsl
   ├─ ui/                  # HUD + laadscherm (html/css overlay)
   └─ utils/               # seeded random, tweens
```

---

## 4. Shader-plan (kern van de opdracht)

Kies **één hoofd-shader** op Shadertoy en vul de URL bovenaan in. Zorg dat die het zichtbaarst is en duidelijk op interactie reageert. Ideeën:

| Waar                                | Shader-idee                                                              | Interactie                                                          |
| ----------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Aai-aura rond pokémon               | plasma/glow/ripple (bv. zoals het plasma-voorbeeld uit de les)           | muispositie over de pokémon → intensiteit/kleur; "happiness" stijgt |
| Gevechtsarena of encounter-overgang | swirl/warp/transition-shader (zoals de warp- en displacement-oefeningen) | start bij encounter, `iTime` + progress uniform                     |
| Veld/gras                           | procedureel gras of golvende vlakte, evt. vertex-wind (TSL)              | speler-positie als uniform → gras buigt weg                         |
| Vangeffect                          | ring/ripple op de grond                                                  | pokéball-impact                                                     |

Port-stappen per shader (zoals in de les):
1. Shadertoy-inputs bekijken (welke `iXxx` worden echt gebruikt?).
2. Als eenvoudige WGSL-functie met parameters porteren, eerst als grijswaarde/uv-gradient testen.
3. Extra buffers/tabs (Buffer A) → `RenderTarget` + tweede scène + `texture()` node.
4. Kleuren controleren t.o.v. origineel (sRGB-fix).
5. Eigen uniform toevoegen die door gameplay wordt aangestuurd (bv. `uHappiness`, `uPlayerPos`).

---

## 5. Assets

- **Pokémon & decor:** poly.pizza (let op de **licentie/attributie** per model → lijst in `CREDITS.md` bijhouden).
- **Trainer(s):** humanoïde modellen → **Mixamo** (auto-rig + idle/walk/run). Export als FBX, daarna omzetten naar GLB (Blender: import FBX → export glTF).
- ⚠️ **Mixamo werkt enkel voor humanoïde rigs.** Pokémon (vierpotig, bol, enz.) rigt Mixamo meestal niet goed. Oplossing voor pokémon:
  - gebruik de animaties die al in het model zitten (poly.pizza-model met clips), **of**
  - procedurele animatie in code: bobbing, squash & stretch, draaien naar de speler, kleine hop bij aaien.
- Eigen Blender-extra (optioneel): eigen trainer, huisje of boom + **gebakken licht/schaduw** naar texture (zoals in de Blender-bake-les).
- Pokémon is een beschermd merk: dit is een **niet-commercieel schoolproject**. Vermeld dat in de README, gebruik geen officiële artwork/logo's.

---

## 6. Stappenplan

Vink af per stap. Elke fase eindigt met een **deploy**.

### Fase 0 – Setup & eerste deploy
- [x] Git-repo + GitHub-repo aanmaken, `.gitignore` (`node_modules`, `dist`)
- [x] `npm init -y`, `npm install three`, `npm install -D vite`, dev-script
- [x] `index.html` met fullscreen canvas, `src/main.js` met WebGPURenderer + camera + scene + licht
- [x] Eenvoudige test-cube die draait
- [x] **Deployen** (Vercel/Netlify/GitHub Pages; bij GitHub Pages `base` in `vite.config.js` zetten) en live url in README zetten
- [x] Testen in Chrome **en** controleren dat de WebGL2-fallback niet crasht

### Fase 1 – Veld, trainer & eerste shader (MVP)
- [x] Vlak veld (grond) met mist/hemelkleur, lichten, schaduwen
- [x] Trainer-model laden (GLB) + Mixamo idle/walk via `AnimationMixer` (eigen model, loopcyclus)
- [x] Besturing: WASD/pijltjes (+ evt. klik-om-te-lopen), camera die de trainer volgt
- [x] Gekozen Shadertoy-shader porteren (§4) en op een mesh zetten
- [x] Shader reageert op muis (`iMouse`) of speler-positie
- [x] README invullen met **Shadertoy-URL**, commit, deploy

### Fase 2 – Encounters & vangen
- [x] Zones met hoog gras (visueel andere kleur/shader)
- [x] Bij lopen in gras: kans per stap op een random pokémon (lijst van 5–8 soorten uit `constants/pokemon.js`) → 14 soorten met zeldzaamheid
- [x] Encounter-overgang (warp/swirl-shader) → speed lines (wsfcDM)
- [x] Pokéball gooien (physics met Rapier voor extra punten) → vangkans op basis van stats (boog via tween, nog zonder Rapier)
- [x] Gevangen pokémon opslaan in "team"-lijst (localStorage)
- [x] UI: team-menu waar je 1 pokémon kiest om mee te nemen
- [x] Commit + deploy

### Fase 3 – Pokémon meenemen & aaien
- [x] Eén pokémon laden en naast de trainer laten volgen (smooth follow)
- [x] Raycaster: muis over pokémon = hover, klik/sleep = aaien
- [x] Aaien verhoogt `happiness` → uniform in de aai-shader (glow, hartjes/particles, kleurverandering)
- [x] Kleine reactie-animatie (hop, draaien)
- [x] Commit + deploy

### Fase 4 – Trainen
- [x] Mini-oefening (bv. klik-ritme, ballen ontwijken of timer-gebaseerd "sparren") → ballen ontwijken
- [x] XP/level/stats stijgen, opgeslagen in localStorage (+ HP, healen door aaien)
- [x] Visuele feedback (schaal, aura-shader wordt intenser met level) → schaal per level, gloed volgens happiness
- [x] Commit + deploy

### Fase 5 – 3 NPC-trainers & gevechten
- [x] 3 NPC's op vaste plaatsen in het veld, elk met eigen pokémon + moeilijkheid
- [x] Naderen → dialoog → battle-modus (camera zoomt, arena-shader) → speed-lines-overgang naar de arena
- [x] Beurtgebaseerd systeem: aanval / sterke aanval / verdedigen, HP-balken
- [x] Winst → XP + NPC krijgt "verslagen"-status (opgeslagen) → en wordt sterker
- [x] Commit + deploy

### Fase 6 – Extra's (enkel als alles hierboven werkt)
- [ ] Physics: speler-collision met bomen/rotsen, pokéball-worp
- [ ] Eigen Blender-model met gebakken belichting
- [ ] Extra shaders (gras-wind, vangeffect) → gras-wind + wegbuigen: klaar, vangeffect nog niet
- [ ] Compute shader voor particles (aai-hartjes of vangeffect)
- [ ] Geluid, mobiele besturing, loading screen (loading screen: klaar in Fase 7)

### Fase 7 – Afwerking & inlevering
- [x] Performance check (modelgrootte, schaduwresolutie, aantal draw calls) → modellen ≤ 1,2 MB, schaduw 1024², ~180 draw calls, gras/decor per vak gecullt (3,4 → 1,7 M driehoeken)
- [x] Loading screen en foutmelding als WebGPU niet beschikbaar is
- [x] `README.md`: Shadertoy-URL, instructies (`npm install`, `npm run dev`, `npm run build`), besturing, credits
- [x] `CREDITS.md` met modellen, licenties, Mixamo-animaties
- [ ] Controleren dat de **live url werkt in een incognitovenster** en op een ander toestel
- [ ] Zip of repo-link **zonder `node_modules`**; url en broncode in de aparte opdrachten indienen

---

## 7. Werkafspraken met de AI-agent

**Kopieer dit als eerste prompt:**

```
Lees README.md volledig. Werk fase per fase en stop na elke fase.
Regels:
- Gebruik uitsluitend three/webgpu, WebGPURenderer, MeshBasicNodeMaterial en wgslFn (geen ShaderMaterial).
- Eerst de MVP werkend maken; geen features uit latere fases vooruit bouwen.
- Houd modules klein en benoem uniforms duidelijk.
- Na elke fase: leg kort uit wat je gedaan hebt, geef de commit-boodschap en de test-stappen die ik moet doen.
- Wijzig nooit de mappenstructuur of dependencies zonder het te melden.
- Vraag bij twijfel (bv. welke Shadertoy-shader) eerst bij mij na.
```

**Per fase vragen aan de agent:**
1. "Voer Fase X uit en verifieer met `npm run build`."
2. "Welke console-errors verwacht je in Chrome? Controleer ze."
3. "Maak een korte testchecklist voor deze fase."

**Als iets stuk gaat:** plak de exacte Chrome-foutmelding (WGSL-fouten geven regelnummers relatief t.o.v. de shader-string) + de betrokken shader/code.

---

## 8. Risico's & oplossingen

| Risico                             | Oplossing                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| Pokémon-model heeft geen animaties | Procedurele animatie in code                                                 |
| Mixamo kan pokémon niet rigen      | Enkel voor de trainer gebruiken                                              |
| Shader te zwaar                    | Lagere render-resolutie, `devicePixelRatio` beperken                         |
| Shader-kleuren te licht            | `colorSpaceToWorking(..., SRGBColorSpace)` of `outputColorSpace` aanpassen   |
| Deploy toont wit scherm            | Pad-problemen: `base` in Vite, modellen in `public/`                         |
| WebGPU niet in browser             | WGSL-shaders werken niet in WebGL2 → laadscherm toont een duidelijke melding |
| Te veel scope                      | Terug naar MVP: lagen 1–2 zijn voldoende                                     |

---

## 9. Inleverchecklist

- [ ] Live url werkt (incognito getest)
- [x] Shader reageert zichtbaar op interactie
- [x] README bevat de originele **Shadertoy-URL**
- [x] Broncode zonder `node_modules` (repo of zip)
- [ ] Url en broncode in de **aparte** opdrachten ingediend
- [x] Extra's vermeld in README (physics, meerdere shaders, Blender, ...)
- [x] Credits en licenties van modellen

---

## Credits

Zie `CREDITS.md` (bij te houden tijdens het project).
Dit is een niet-commercieel schoolproject; Pokémon is een handelsmerk van Nintendo / Game Freak / The Pokémon Company.
