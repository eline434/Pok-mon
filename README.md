# Pokémon Field – WebGPU + Three.js experiment

> Instructieplan voor mezelf én de AI-agent. Dit bestand is ook de README van het project.

**Originele Shadertoy shader(s):** aaien van pokemon:https://www.shadertoy.com/view/Wsj3R1   start van gevecht:https://www.shadertoy.com/view/wsfcDM  wanneer pokemon gevangen:https://www.shadertoy.com/view/7sjfRy

**Live demo:** https://eline434.github.io/Pok-mon/
**Broncode:** [https://github.com/eline434/Pok-mon.git]

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
2. Pokémon die meelopen + aaien (shader reageert)
3. Willekeurige encounters + vangen
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
pokemon-field/
├─ README.md
├─ index.html
├─ package.json
├─ vite.config.js
├─ .gitignore              # node_modules, dist
├─ public/
│  └─ models/              # .glb bestanden
└─ src/
   ├─ main.js              # renderer, scene, loop
   ├─ constants/
   ├─ objects/             # trainer, pokemon, veld, npc
   ├─ systems/             # input, encounters, battle, training, save
   ├─ shaders/
   │  ├─ field/fragment.wgsl
   │  ├─ pet/fragment.wgsl
   │  └─ ...
   └─ ui/                  # HUD (html/css overlay)
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
- [ ] Trainer-model laden (GLB) + Mixamo idle/walk via `AnimationMixer`
- [x] Besturing: WASD/pijltjes (+ evt. klik-om-te-lopen), camera die de trainer volgt
- [x] Gekozen Shadertoy-shader porteren (§4) en op een mesh zetten
- [x] Shader reageert op muis (`iMouse`) of speler-positie
- [ ] README invullen met **Shadertoy-URL**, commit, deploy

### Fase 2 – Pokémon meenemen & aaien
- [ ] Eén pokémon laden en naast de trainer laten volgen (smooth follow)
- [ ] Raycaster: muis over pokémon = hover, klik/sleep = aaien
- [ ] Aaien verhoogt `happiness` → uniform in de aai-shader (glow, hartjes/particles, kleurverandering)
- [ ] Kleine reactie-animatie (hop, draaien)
- [ ] Commit + deploy

### Fase 3 – Encounters & vangen
- [ ] Zones met hoog gras (visueel andere kleur/shader)
- [ ] Bij lopen in gras: kans per stap op een random pokémon (lijst van 5–8 soorten uit `constants/pokemon.js`)
- [ ] Encounter-overgang (warp/swirl-shader)
- [ ] Pokéball gooien (physics met Rapier voor extra punten) → vangkans op basis van stats
- [ ] Gevangen pokémon opslaan in "team"-lijst (localStorage)
- [ ] UI: team-menu waar je 1 pokémon kiest om mee te nemen
- [ ] Commit + deploy

### Fase 4 – Trainen
- [ ] Mini-oefening (bv. klik-ritme, ballen ontwijken of timer-gebaseerd "sparren")
- [ ] XP/level/stats stijgen, opgeslagen in localStorage
- [ ] Visuele feedback (schaal, aura-shader wordt intenser met level)
- [ ] Commit + deploy

### Fase 5 – 3 NPC-trainers & gevechten
- [ ] 3 NPC's op vaste plaatsen in het veld, elk met eigen pokémon + moeilijkheid
- [ ] Naderen → dialoog → battle-modus (camera zoomt, arena-shader)
- [ ] Beurtgebaseerd systeem: aanval / sterke aanval / verdedigen, HP-balken
- [ ] Winst → XP + NPC krijgt "verslagen"-status (opgeslagen)
- [ ] Commit + deploy

### Fase 6 – Extra's (enkel als alles hierboven werkt)
- [ ] Physics: speler-collision met bomen/rotsen, pokéball-worp
- [ ] Eigen Blender-model met gebakken belichting
- [ ] Extra shaders (gras-wind, vangeffect)
- [ ] Compute shader voor particles (aai-hartjes of vangeffect)
- [ ] Geluid, mobiele besturing, loading screen

### Fase 7 – Afwerking & inlevering
- [ ] Performance check (modelgrootte, schaduwresolutie, aantal draw calls)
- [ ] Loading screen en foutmelding als WebGPU niet beschikbaar is
- [ ] `README.md`: Shadertoy-URL, instructies (`npm install`, `npm run dev`, `npm run build`), besturing, credits
- [ ] `CREDITS.md` met modellen, licenties, Mixamo-animaties
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

| Risico                             | Oplossing                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------- |
| Pokémon-model heeft geen animaties | Procedurele animatie in code                                               |
| Mixamo kan pokémon niet rigen      | Enkel voor de trainer gebruiken                                            |
| Shader te zwaar                    | Lagere render-resolutie, `devicePixelRatio` beperken                       |
| Shader-kleuren te licht            | `colorSpaceToWorking(..., SRGBColorSpace)` of `outputColorSpace` aanpassen |
| Deploy toont wit scherm            | Pad-problemen: `base` in Vite, modellen in `public/`                       |
| WebGPU niet in browser             | Three.js valt terug op WebGL2; test dit; toon melding indien het niet lukt |
| Te veel scope                      | Terug naar MVP: lagen 1–2 zijn voldoende                                   |

---

## 9. Inleverchecklist

- [ ] Live url werkt (incognito getest)
- [ ] Shader reageert zichtbaar op interactie
- [ ] README bevat de originele **Shadertoy-URL**
- [ ] Broncode zonder `node_modules` (repo of zip)
- [ ] Url en broncode in de **aparte** opdrachten ingediend
- [ ] Extra's vermeld in README (physics, meerdere shaders, Blender, ...)
- [ ] Credits en licenties van modellen

---

## Credits

Zie `CREDITS.md` (bij te houden tijdens het project).
Dit is een niet-commercieel schoolproject; Pokémon is een handelsmerk van Nintendo / Game Freak / The Pokémon Company.
