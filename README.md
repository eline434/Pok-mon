# Pokémon Field

Een kleine third-person pokémon-game in de browser, gemaakt met **Three.js (`WebGPURenderer`)** en shaders die van **Shadertoy** geport zijn naar **WGSL**.

**Live demo:** https://eline434.github.io/Pok-mon/
**Broncode:** https://github.com/eline434/Pok-mon

## Originele Shadertoy-shaders

| Shader in de game | Originele Shadertoy-URL |
| --- | --- |
| Hartje boven je buddy als je hem aait | https://www.shadertoy.com/view/Wsj3R1 |
| Speed lines bij de start van een encounter, training of gevecht | https://www.shadertoy.com/view/wsfcDM |

---

## Het spel

Je loopt als trainer rond in een veld vol bomen, bloemen en hoog gras.

1. **Vangen:** loop door het **hoge gras** (donkergroene plekken). Bij elke stap is er een kans dat een wilde pokémon opduikt. Gooi een pokéball: de bal wiebelt en met wat geluk heb je hem. Zeldzame pokémon (★) zijn moeilijker te vangen en vluchten sneller. Mew (★★★★) kom je bijna nooit tegen.
2. **Buddy:** één pokémon uit je team loopt met je mee. Je kiest hem in het team-menu.
3. **Aaien:** sleep met de muis over je buddy. Er verschijnt een hartje en hij maakt een sprongetje. Aaien kan één keer per 30 seconden: is je buddy gewond, dan healt hij; heeft hij volle HP, dan krijgt hij XP.
4. **Levelen:** je buddy krijgt XP door te aaien, door met je rond te wandelen en vooral door te **trainen**. Hoe hoger het level, hoe meer XP er nodig is. Met elk level krijgt hij meer HP en wordt hij een beetje groter.
5. **Trainen:** in een mini-game rollen pokéballs op je buddy af en moet hij erover springen. Hoe meer ballen je ontwijkt, hoe meer XP.
6. **Vechten:** in het veld staan **3 trainers** (Lotte, Noor en Fien). Ga bij hen staan om te vechten. Elke beurt kies je *aanval*, *sterke aanval* (meer schade, kan missen) of *verdedigen*. Win je, dan krijgt je buddy XP en wordt de pokémon van die trainer sterker voor de volgende keer. Een buddy met 0 HP kan niet vechten: aai hem eerst om hem te healen.

Je voortgang (team, buddy, levels, HP, overwinningen) wordt bewaard in je browser.

### Besturing

| Toets / actie | Wat |
| --- | --- |
| `WASD` / `ZQSD` / pijltjes | Rondlopen |
| Slepen over je buddy | Aaien |
| `T` | Team-menu (buddy kiezen, HP en levels) |
| `R` | Trainen (`spatie` of klik = springen) |
| `F` (bij een trainer) | Vechten |

---

## Shaders en interactie

| Shader | Bestand | Reageert op |
| --- | --- | --- |
| **Hartje** (port van [Wsj3R1](https://www.shadertoy.com/view/Wsj3R1), enkel het hart) | `src/shaders/heart/fragment.wgsl` | Aaien met de muis laat het hart poppen (`progress`). Hoe blijer je buddy (`happiness`), hoe rozer het hart, hoe sneller het klopt en hoe sterker de gloed. |
| **Speed lines** (port van [wsfcDM](https://www.shadertoy.com/view/wsfcDM)) | `src/shaders/encounter/fragment.wgsl` | Gameplay: bij een encounter, training of gevecht schieten de lijnen naar binnen tot het scherm wit is (`progress`), met een schokkerige anime-animatie (`time`). |
| **Gras** (eigen vertex-shader in TSL) | `src/objects/grassMaterial.js` | De positie van de speler en de buddy: het gras buigt weg als je erdoor loopt, ritselt mee en wiegt zacht in de wind. |

De WGSL-shaders worden in Three.js gebruikt met `wgslFn` op een `MeshBasicNodeMaterial`.

## Extra's

- **Meerdere shaders:** twee geporte Shadertoy-shaders (WGSL) en een eigen TSL-vertex-shader voor het gras.
- **Eigen Blender-modellen** voor de speler en de trainers, gerigd met **Mixamo**.
- **Animaties aansturen** met `AnimationMixer`: de loopcyclus van de speler en de idle-animatie van de trainers.
- **Trainers herkleurd in code:** het kleurenpalet van hetzelfde model wordt per trainer aangepast.
- **Procedurele animaties** voor alle pokémon: springen, zweven, spartelen en reacties in gevechten.
- **Instancing** voor gras en decor, verdeeld in vakken zodat wat buiten beeld is overgeslagen wordt.
- **Laadscherm** met voortgang en een duidelijke melding als de browser geen WebGPU heeft.

---

## Lokaal starten

```bash
npm install
npm run dev      # ontwikkelserver
npm run build    # productie-build in dist/
npm run preview  # build lokaal bekijken
```

**Browser:** de game heeft **WebGPU** nodig: Chrome of Edge 113+ op een computer, of Safari 26+. Zonder WebGPU toont de game een melding.

## Gemaakt met

- [Three.js](https://threejs.org/) (`three/webgpu`, `three/tsl`) en [Vite](https://vite.dev/)
- Modellen van [poly.pizza](https://poly.pizza/), eigen modellen in Blender, animaties via [Mixamo](https://www.mixamo.com/)

## Credits

Alle modellen, makers en licenties staan in [`CREDITS.md`](CREDITS.md). Het oorspronkelijke stappenplan en de volledige shader-code staan in [`plan.md`](plan.md).

Dit is een **niet-commercieel schoolproject**. Pokémon is een handelsmerk van Nintendo / Game Freak / The Pokémon Company.
