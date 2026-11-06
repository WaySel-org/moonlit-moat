# Open world plan: Moonlit Moat as a 3D open world with storylines

Status: **plan for Wasay to approve. Nothing is built yet.** Written 2026-11-07.
Owners when building starts: Gatewright (loader, camera, save, UI), Shardkeeper of the Moat (regions), Loremaster (story), Bestiary Keeper (characters), Veilwarden (size, CSP, CI).

## The short version
- Keep what works: the moat, its four wildland regions, the spirit realm, the shard worlds, the puzzles, Ascension, the rooftop queens and Moonlit Her.
- Grow the moat into **one connected land you can walk and ride across**, split into regions that load when you get near them, so the first load stays small and phones keep up.
- Add a **story layer**: chapters, quests, a few people to talk to, a quest log and one marker on the map. Short text, no voice acting, no long cutscenes.
- Ship it in **small phases, each one playable**. Phase 1 is about a week and needs no new land or models.

---

## 1. What "open world" means here

**Where we are today** (measured on `main`, 2026-11-07)
- The moat is one map: castle, lake, hedge maze, shrine, two keeps, and an edge that starts at 140 m and grows to 268 m with Ascension. Four named wildland regions sit in the outer ring: **Emberwatch Ridge, Greywater Fen, Ninestone Barrows, the Dry Aqueduct**, with five puzzle sites.
- The spirit realm is an overlay on the moat (Q to enter, Veil Rifts to leave).
- Veyra, Neon Verge and Ashfall are separate 70 m arenas behind World Gates, unlocked by the story.
- **Everything is built at start-up**, every world included, even the ones you are not in.
- First load is **314.2 KB gzip of the 400 KB budget** (three.js 149 KB, game code 150 KB). Moonlit Her's model (3.3 MB, 1.8 MB gzip) is fetched after the game starts, outside the budget.

**What it will mean**
- One continuous land, about **1 to 1.5 km across** (roughly four to six times today's moat), made of regions about 200 to 250 m wide. You can see the castle from most places and walk or ride anywhere without a loading screen.
- The world reacts to the story: places open, people move, bosses leave the roof for their own lairs.
- **Not** in scope: multiplayer, a planet-sized map, voice acting, video cutscenes, a new engine.

**The hard limits, and what each one forces**

| Limit | What it means for the design |
|---|---|
| three.js r128 in the browser | Stay on r128 (no upgrade in this plan; it would touch every file). Use what it has: fog, instanced meshes, merged geometry, the r128 GLTFLoader we already ship. |
| 400 KB first-load budget | Only the engine, the core game and the home region load first. Every other region, model and story chapter is a separate file fetched later, the way Moonlit Her already is. CI already fails over budget. |
| Phones and tablets | Budgets per frame on screen: about 150 draw calls and 300k triangles. Fog hides the edge of what is loaded. One shadow light. Auto quality drops reflections and detail when FPS falls (planned in `plug-and-play.md`). |
| Strict CSP (`script-src 'self'`, `connect-src 'self'`, no WebAssembly) | Region files are same-origin scripts loaded with `<script src>`, like the GLTF loader today. No Draco or meshopt compression (their decoders need WebAssembly or blob workers, which the CSP blocks). Shrink models with JPEG textures and fewer triangles instead. Textures load as images (the fix from PR 16). |
| No outside network calls | Every file comes from play.waysel.com. Saves stay on the device (localStorage). No cloud saves, no analytics. |
| Zero budget for assets | Scenery stays code-built from simple shapes, as the wildlands are now (stone, trees, reeds, ruins). Real 3D models only for characters, through the free pipeline (Gemini, Hunyuan3D, Mixamo, Blender). Any outside asset must be CC0 and listed in `THIRD_PARTY.md`. |

The ASCII look stays one click away (Raw is the default view). The gameplay mask keeps working: friends, foes and pickups stay bright in every region.

---

## 2. World structure

### Regions
The moat stays the heart. The four wildlands become the first regions of the open land, made bigger. New regions are added one at a time, each with a reason to go there.

| Region | Built from | Role in the open world |
|---|---|---|
| The Moonlit Moat (home) | Castle, lake, maze, shrine, keeps | Hub. Always loaded. Moon Shrine, the Warden, the roof. |
| Emberwatch Ridge | Existing wildland | Hills and a pass; the watchtower beacon becomes a waystone. |
| Greywater Fen | Existing wildland | Marsh, Fen Stalkers, shallow water. |
| Ninestone Barrows | Existing wildland | Stone circles and tombs; spirit-realm puzzles. |
| The Dry Aqueduct | Existing wildland | Ruins that lead out toward new land. |
| *Proposed:* Vesthra's lair | New | A garden of petrified travellers. Her chapter happens here. |
| *Proposed:* Nyxara's briarwood | New | A forest choked by briars. Her chapter happens here. |

Names for new regions are proposals for the Loremaster and Wasay; all must be original.

**Veyra, Neon Verge and Ashfall stay as shard pockets** behind World Gates, not stitched into the land. They are different genres (alien, cyberpunk, zombie) and the canon already calls them separate shards. Their gates get placed in the open world so finding them is part of exploring.

### Loading regions as you move (streaming)
- The land is a grid. Each region is a data file (`content/regions/<id>/region.json`: ground, props, camps, chests, puzzle sites, quest spots) plus, if it needs special code, a script (`src/regions/<id>.js`). The build turns each into a hashed file under `dist/a/`, outside the first load.
- Three rings around the hero:
  - **Here and next door**: built, visible, creeps awake.
  - **One further**: fetched and built quietly in idle frames, hidden, nothing moving.
  - **Far**: not loaded. A cheap low hill outline and fog stand in for it.
- A region is built a little each frame, so loading never causes a hitch. It is unloaded only when you are two regions away, so walking back and forth on a border does not reload it.
- Characters with real models (bosses, people) load with their region. The block figure stands in until the model arrives, exactly how Moonlit Her works today.
- The land stays under about 2 km across, so no tricks for far-away numbers (floating origin) are needed.
- Prerequisite already on the roadmap: move world layouts from code into `content/`. We do it **region by region** as each one is moved to streaming, not as one big rewrite.
- Technical catch: today all systems share one closure, so a separate region file cannot reach helpers like `plantTree` or `wildAdd`. Phase 2 adds a small, explicit set of shared helpers that region files can call. This is a step toward the ES modules item on the roadmap.

### Travel and mounts
- **On foot** as now. **Mounts** (Moonstag, Gryphon, Ember Drake) become the main way to cross the land. Add a **call** (a key or touch button) so a tamed mount comes to you; sanctuaries remain where you tame them.
- **Flying** sees far and moves fast, which is the hardest case for loading. Cap flight height and speed, and load one ring further ahead while flying.
- **Waystones**: each region gets a Moon Shrine to light. Lit shrines allow fast travel from the map. The existing Moon Shrine is the first.
- **World Gates** to the shard pockets, and **Veil Rifts** in the spirit realm, stay as they are.

### Camera
- Keep the third-person follow camera and lock-on. Add: pull back further when mounted or flying; push in when a wall or slope is behind you (trees already fade); gentle auto-turn behind the hero when moving on touch screens; a short in-game camera move to show a new region the first time you enter (skippable, off for `prefers-reduced-motion`).
- Fog distance and the far plane follow the quality setting, so phones draw less.

### Save data
- Today: `moonlit-moat.save.v1` in localStorage, saved every 10 s and on key events.
- Add **save v2** with a one-time upgrade from v1 so nobody loses progress. New fields: regions found, waystones lit, quest states and story flags, position by region, people met.
- Keep it small (well under 50 KB) and keep **New game** on the pause screen.
- Save on entering a region and on finishing a quest step.

---

## 3. Story

### How it fits the canon
The canon (`lore/README.md`) says the story never ends: shards, the Sundering, rising tiers, Ascension. The plan keeps that and adds **chapters that do end**, with the endless game continuing around them. Chapters give a reason to go somewhere; the endless systems give a reason to stay.

### Chapters, quests and steps
- A **chapter** is a group of quests with a beginning and an end. A **quest** is a few **steps**. Each step uses something the game can already check: reach a place, defeat a named foe, solve a puzzle, light a waystone, tame a mount, survive an event, talk to someone.
- All of it is data: `content/story/chapters/*.json`. Adding a quest needs no code once Phase 1 is in.
- One quest is **tracked** at a time; it shows as a marker on the minimap and a one-line goal in the HUD. The rest sit in a **quest log** on the hero sheet.

### Main line (proposal)

| Chapter | Where | What happens | Built from |
|---|---|---|---|
| 1. The Moonlit Moat | Moat | First night: learn to fight, find the shrine, defeat the Warden, take the moat's shard. | Exists; add a guide and a quest chain. |
| 2. The Four Wilds | The four wildlands | Light each region's waystone and solve its puzzle. The roof court notices you. | Existing regions and five puzzles. |
| 3. The Gorgon's Garden | Vesthra's lair | Vesthra has left the roof. Free the travellers she turned to stone, then face her in her lair. | Vesthra boss, new region. |
| 4. The Briar Throne | Nyxara's briarwood | Nyxara's briars spread toward the moat. Cut them back, then face her. | Nyxara boss, new region. |
| 5. The Roof Court | Castle roof | Both queens return to the throne together. Beating them triggers **Ascension**, which becomes the act break. | Existing roof fight and Ascension. |
| 6. The Veil | Spirit realm | The fallen godlings, Aurelion and Varghast. | Existing spirit realm. |
| 7 to 9. The far shards | Veyra, Neon Verge, Ashfall | Find each World Gate in the open land, then the existing chapter plays. | Existing worlds. |
| The Endless | Everywhere | Mythics, tiers, waves and Ascension continue, now with side quests and bounties. | Existing systems. |

Side quests: two or three per region, built on what exists there (camps, chests, puzzles, mythics, the maze).

### People and dialogue
- A **few** people to talk to, not crowds. Proposal: one guide at the Moon Shrine, and one person per region who gives its quests. All original, written in the canon's tone: quiet, a little melancholy, short plain lines.
- **Dialogue box**: a small panel at the bottom of the screen, two or three lines at a time, the speaker's name, tap or press to continue. Talking uses the context button already planned for touch. It never freezes the world for long, and it closes the moment you move.
- **Choices**: at most two short answers, used rarely. No branching trees at first.
- **Moments, not cutscenes**: a camera move, a story banner (the game already has `storyBanner`), a line of text. No video.

---

## 4. Character models each phase needs

Character work follows the `moonlit-character-design` skill and `~/Claude Docs/moonlit-characters/WORLD.md`. Moonlit Her took several days, so the plan needs **at most one new model per phase**, made in parallel with the code. Every new model loads lazily with its region, and every character keeps a block figure as a fallback.

| Phase | New model | Why then | Notes |
|---|---|---|---|
| 1, 2 | None | Story and loading come first. | Moonlit Her is the only model. |
| 3 | None required | Travel and the first new region. | Optional: start Vesthra's concept art now so she is ready for Phase 4. |
| 4 | **Vesthra the Gorgon** | Her chapter. | Draft style in `vesthra/STYLE.md`: biped rig for Mixamo, tail drawn by the game. Original gorgon from myth, nothing from any game's Medusa. |
| 5 | **Nyxara the Thorn Empress** | Her chapter. | Draft in `nyxara/STYLE.md`: floats, thorn shards and staff. Nothing from Queen of Pain. |
| 6 | **The guide** (first talking person) | People and side quests. | A simple biped: the easiest repeat of the pipeline. Needs a talk gesture and idles. |
| Later | Gate Warden, godlings, more people | As their chapters get polish. | Mounts are four-legged; Mixamo rigs only two-legged characters, so mounts need a different plan (open question). |

Every clip list covers **roaming** as well as combat (walk, run, two or three idles; talk for people), as WORLD.md now asks. Size target: **2 MB or less per model** (Her is 3.3 MB); texture 1024 px on phones.

---

## 5. Phased roadmap

Each phase is one branch and one pull request. It ends in something Wasay can play on a preview link, on a laptop and a phone. Deploying to play.waysel.com happens only when Wasay says so. CI stays green and under budget throughout.

| Phase | Size | Playable result |
|---|---|---|
| **1. The first quests** | about 1 week | Quests on the map we already have. |
| 2. Regions that load as you go | 1 to 2 weeks | Same land, smaller first load, ready to grow. |
| 3. Travel and the first new land | 1 to 2 weeks | Waystones, mount call, camera, one new region. |
| 4. The Gorgon's Garden | 2 weeks + model | Vesthra modelled, in her lair, chapter 3. |
| 5. The Briar Throne | 2 weeks + model | Nyxara modelled, chapter 4, then the roof court and Ascension. |
| 6. People and side quests | 1 to 2 weeks | The guide modelled, dialogue with choices, side quests per region. |
| 7. The Veil and the far shards | 1 to 2 weeks | Godlings chapter; World Gates placed in the open land. |

### Phase 1 in detail (about one week)
No new land, no new models. Small enough to finish, big enough to feel.
1. Quest data format (`content/story/`) checked by `tools/build.py`, like characters.
2. Quest tracker: one tracked quest, a minimap marker, a one-line goal on the HUD, and a quest log on the hero sheet.
3. A simple dialogue box (text only) and a story banner when a quest starts or ends.
4. Save v2 with the upgrade from v1.
5. One short chain, *First Night*: reach the Moon Shrine, visit two wildland regions, solve one puzzle, defeat the Warden. Every step uses something the game already tracks.
6. Test on desktop and phone sizes with the production headers; first load stays under 400 KB.

**Done when** a new player is guided from spawn to the Warden by quests, the save survives a reload, and an old v1 save still loads.

### Phase 2 in brief
Move the four wildlands out of start-up into region files that load as you approach. Add the shared helpers region files need. Add the headless smoke test to CI (already on the roadmap) because loading bugs are easy to miss by eye. Done when the land looks and plays the same, the first load is smaller, and walking a full lap of the wildlands on a phone shows no stutter.

---

## 6. Risks
1. **The one-closure build** makes separate region files harder than it sounds. Phase 2 has to add shared helpers carefully; it may pull the ES-modules roadmap item forward.
2. **Phones** may not hold frame rate with more land and models on screen. Budgets, fog and auto quality need testing on a real phone every phase, not just the browser's phone preview.
3. **Stutter while loading** regions if a build step is too big for one frame.
4. **Model time.** Each character is several days of Wasay's clicks in Gemini, Hugging Face and Mixamo. Serpent tails, floating and four-legged mounts are the hard cases.
5. **Download size on mobile data.** Lazy models are outside the first-load budget but still cost the player about 2 MB each.
6. **CSP rules out the usual model compression.** If models get too big, loosening the CSP (allowing WebAssembly) is a Veilwarden decision with a security cost.
7. **Save upgrade** could wipe existing progress if v1 to v2 has a bug. It needs a test with a real v1 save.
8. **Scope.** "Open world" can swallow months. Each phase must ship before the next starts.
9. **Overlapping work.** Open PR 15 (character builder, visible gear) touches the hero; coordinate before Phase 1 touches the hero sheet.
10. **Originality** for every new region, person and boss look, especially keeping Vesthra and Nyxara far from Medusa and Queen of Pain.

## 7. Open questions for Wasay (one batch)
1. **Shard worlds**: keep Veyra, Neon Verge and Ashfall as pockets behind gates (recommended), or rebuild them into the one land?
2. **Map size**: about 1 to 1.5 km across, sized for phones (recommended), or bigger?
3. **Chapters that end**: OK that chapters finish while the endless game continues around them (recommended)?
4. **The hero**: is Moonlit Her the Wanderer (update `wanderer.json` to match her), or a new person in the story?
5. **People**: OK to add a few talking characters, text only, no voices?
6. **The queens**: move Vesthra and Nyxara into their own lairs, with the roof as the final joint fight (recommended), or keep them on the roof only?
7. **First phase**: quests first (recommended, quick to feel) or loading regions first (foundation first)?
8. **Save slots**: one (as now) or three?
9. **three.js r128**: stay on it for this plan (recommended)?
10. **Flight**: keep free flight over the whole land, with a height cap?
11. **Mounts as models**: are real 3D mounts wanted at some point? They need a different rigging route than Mixamo.
12. **New region names and themes**: happy with a petrified garden for Vesthra and a briarwood for Nyxara, or other ideas?
