# Open world plan: Moonlit Moat as a 3D open world with storylines

Status: **plan for Wasay to approve. Nothing is built yet.** Written 2026-11-07.
Owners when building starts: Gatewright (loader, camera, save, UI), Shardkeeper of the Moat (regions), Loremaster (story), Bestiary Keeper (characters), Veilwarden (size, CSP, CI).

## The short version
- Keep what works: the moat, its four wildland regions, the spirit realm, the shard worlds, the puzzles, Ascension, the rooftop queens and Moonlit Her.
- Grow the moat into **one connected land you can walk and ride across**, split into regions that load when you get near them, so the first load stays small and phones keep up.
- Add a **story layer**: chapters, quests, a few people to talk to, a quest log and one marker on the map. Short text, no voice acting, no long cutscenes.
- Ship it in **small phases, each one playable**. Phase 1 is about a week and needs no new land or models.
- **One decision comes before any building**: which hero the open world uses. Open PR 15 would replace Moonlit Her with a build-your-own hero (open question 4).

---

## 1. What "open world" means here

**Where we are today** (measured on `main`, 2026-11-07)
- The moat is one map, about 280 m across at the start and about 540 m at full Ascension: castle, lake, hedge maze, shrine and two keeps. Four named wildland regions sit in the outer ring: **Emberwatch Ridge, Greywater Fen, Ninestone Barrows, the Dry Aqueduct**, with five puzzle sites.
- The spirit realm is an overlay on the moat (Q to enter, Veil Rifts to leave).
- Veyra, Neon Verge and Ashfall are separate arenas about 140 m across, behind World Gates. The story runs Moat, Veyra, Neon Verge, Ashfall: when a world's chapter is done, you are pulled into the next world a few seconds later.
- **Everything is built at start-up**, every world included, even the ones you are not in. A fix is designed in [instant-delivery.md](instant-delivery.md) (section 5) but not built.
- First load is **314.2 KB gzip of the 400 KB budget** (three.js 145 KB, game code 146 KB). Moonlit Her's model (3.3 MB, 1.8 MB gzip) is fetched after the game starts, outside the budget.
- **Open PR 15** (not merged) would replace Moonlit Her with a hero you build yourself from a free CC0 parts kit (Quaternius), with 49 pieces of visible gear and a modelled Gate Warden. It raises the first load to 340.6 KB and fetches a 13 MB kit after start.

**What it will mean**
- One continuous land, about **1 to 1.5 km across** (two to three times the moat at full Ascension), made of regions about 200 to 250 m wide. You can see the castle from most places and walk or ride anywhere without a loading screen.
- The world reacts to the story: places open, people move, bosses leave the roof for their own lairs.
- **Not** in scope: multiplayer, a planet-sized map, voice acting, video cutscenes, a new engine.

**The hard limits, and what each one forces**

| Limit | What it means for the design |
|---|---|
| three.js r128 in the browser | Stay on r128 (no upgrade in this plan; it would touch every file). Use what it has: fog, instanced meshes, merged geometry, the r128 GLTFLoader we already ship. |
| 400 KB first-load budget | Only the engine, the core game and the home region load first. Every other region, model and story chapter is a separate file fetched later, the way Moonlit Her already is. CI already fails over budget. |
| Phones and tablets | Budgets for what is on screen at once: about 150 separate objects to draw ("draw calls") and 300k triangles. Fog hides the edge of what is loaded. One shadow light. Auto quality drops reflections and detail when the frame rate falls (planned in `plug-and-play.md`, not built). |
| Strict CSP (`script-src 'self'`, `connect-src 'self'`, no WebAssembly) | Region files come from our own site and load the way the GLTF loader does today. The usual model-compression add-ons (Draco, meshopt) need WebAssembly or workers made from blobs, which the CSP blocks. Shrink models instead with JPEG textures, fewer triangles and mesh quantization, which the r128 loader reads with no add-on. Textures load as images (the fix from PR 16). |
| No outside network calls | Every file comes from play.waysel.com. Saves stay on the device (localStorage). No cloud saves, no analytics. |
| Zero budget for assets | Scenery stays code-built from simple shapes, as the wildlands are now (stone, trees, reeds, ruins). Real 3D models only for characters, through the free pipeline (Gemini, Hunyuan3D, Mixamo, Blender). Outside assets need a licence that allows them in this MIT game (CC0 like the kit in PR 15, or Mixamo clips from Wasay's own account as for Moonlit Her) and are listed in `THIRD_PARTY.md`. |

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
- This grows the lazy-world design already written in [instant-delivery.md](instant-delivery.md) (section 5: `later` and `ensure`, plus an idle pump that builds a little at a time). Regions add two things it lacks: fetching a region's file before building it, and unloading regions you have left. When that doc's service worker lands, it keeps region files on the device after their first visit, so repeat visits work offline too.
- The land is a grid. Each region is a data file (`content/regions/<id>/region.json`: ground, props, camps, chests, puzzle sites, quest spots) plus, if it needs special code, a script (`src/regions/<id>.js`). The build turns each into a hashed file under `dist/a/`, outside the first load.
- Three rings around the hero:
  - **Here and next door**: built, visible, creeps awake.
  - **One further**: fetched and built quietly in idle frames, hidden, nothing moving.
  - **Far**: not loaded. A cheap low hill outline and fog stand in for it.
- A region is built a little each frame, so loading never causes a hitch. It is unloaded only when you are two regions away, so walking back and forth on a border does not reload it.
- Characters with real models (bosses, people) load with their region. The block figure stands in until the model arrives, exactly how Moonlit Her works today.
- The land stays under about 2 km across, so no tricks for far-away numbers (floating origin) are needed.
- Prerequisite already on the roadmap: move world layouts from code into `content/`. We do it **region by region** as each one is moved to streaming, not as one big rewrite.
- Technical catch: today the whole game is glued into one block of code, so a region kept in its own file cannot use the game's building tools (such as `plantTree`, which places a tree). Phase 2 opens a small, named doorway to those tools for region files. It is a first step toward the roadmap item on ES modules.

### Travel and mounts
- **On foot** as now. **Mounts** (Moonstag, Gryphon, Ember Drake) become the main way to cross the land. Add a **call** (a key or touch button) so a tamed mount comes to you; sanctuaries remain where you tame them. Today a tamed beast carries you for 3 minutes, then flies off for 3 minutes. That is too short for long trips, so the proposal is no limit while travelling outside a fight (a balance change, called out in its PR).
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

This order changes two things that exist today, so both are open questions:
- **No more pull into Veyra.** Today the Gate Warden's true defeat pulls you into Veyra about 10 seconds later. In the open world it would open Veyra's World Gate and point a quest at it instead, so you are not pulled out of the land you just opened. The Veil and the far shards could then be played in any order once their gates are found.
- **New chapter numbers.** The canon numbers chapters by world (`lore/README.md`: Moat, Veil, Veyra, Neon Verge, Ashfall), and Vesthra's and Nyxara's files mark them as chapter 1. The Loremaster would renumber them.

Side quests: two or three per region, built on what exists there (camps, chests, puzzles, mythics, the maze).

### People and dialogue
- A **few** people to talk to, not crowds. Proposal: one guide at the Moon Shrine, and one person per region who gives its quests. All original, written in the canon's tone: quiet, a little melancholy, short plain lines.
- **Dialogue box**: a small panel at the bottom of the screen, two or three lines at a time, the speaker's name, tap or press to continue. Talking uses the same Use action as chests and mounts: E on a keyboard, or tapping the Use prompt on touch. It never freezes the world for long, and it closes the moment you move.
- **Choices**: at most two short answers, used rarely. No branching trees at first.
- **Moments, not cutscenes**: a camera move, a story banner (the game already has `storyBanner`), a line of text. No video.

---

## 4. Character models each phase needs

Character work follows the `moonlit-character-design` skill and `~/Claude Docs/moonlit-characters/WORLD.md`. Moonlit Her took several days, so the plan needs **at most one new model per phase**. Model work runs **in parallel with the code**, in the character folders: Vesthra's pipeline can start now, while Phases 1 to 3 are built, so she is ready when her chapter arrives. Every new model loads lazily with its region, and every character keeps a block figure as a fallback.

The table says when each model is **needed in the game**, not when work on it starts.

| Phase | Needed in the game | Why then | Notes |
|---|---|---|---|
| 1, 2 | None | Story and loading come first. | Moonlit Her is the only model in the game. Vesthra's style bible, concept and shape start now in `vesthra/`. |
| 3 | None | Travel and the first new region. | Vesthra rigged and animated; Nyxara's style bible and concept start. |
| 4 | **Vesthra the Gorgon** | Her chapter. | Draft style in `vesthra/STYLE.md`: biped rig for Mixamo, tail drawn by the game. Original gorgon from myth, nothing from any game's Medusa. |
| 5 | **Nyxara the Thorn Empress** | Her chapter. | Draft in `nyxara/STYLE.md`: floats, thorn shards and staff. Nothing from Queen of Pain. |
| 6 | **The guide** (first talking person) | People and side quests. | A simple biped: the easiest repeat of the pipeline. Needs a talk gesture and idles. Or dressed from PR 15's kit (below). |
| Later | Gate Warden, godlings, more people | As their chapters get polish. | PR 15 already has a Warden model. Mounts are four-legged; Mixamo rigs only two-legged characters, so mounts need a different plan (open question). |

Every clip list covers **roaming** as well as combat (walk, run, two or three idles; talk for people), as WORLD.md now asks. Size target: **2 MB or less per model** (Her is 3.3 MB); texture 1024 px on phones.

**PR 15 changes the picture for people.** If it merges, its free body kit and 50 animations could dress a talking character in minutes instead of days. The catch is style: the kit has its own look, which may not match the painted, grounded look WORLD.md asks for (Moonlit Her). Mixing the two needs a decision (open question 5).

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
| 6. People and side quests | 1 to 2 weeks | The guide in the game, dialogue with choices, side quests per region. |
| 7. The Veil and the far shards | 1 to 2 weeks | Godlings chapter; World Gates placed in the open land. |

### Phase 1 in detail (about one week)
No new land, no new models. Small enough to finish, big enough to feel.
1. Quest data format (`content/story/`) checked by `tools/build.py`, like characters.
2. Quest tracker: one tracked quest, a minimap marker, a one-line goal on the HUD, and a quest log on the hero sheet.
3. A simple dialogue box (text only) and a story banner when a quest starts or ends.
4. Save v2 with the upgrade from v1 (on top of PR 15's save changes if it merges first).
5. One short chain, *First Night*: reach the Moon Shrine, visit two wildland regions, solve one puzzle, defeat the Warden. Every step uses something the game already tracks.
6. Test on desktop and phone sizes with the production headers; first load stays under 400 KB.

**Done when** a new player is guided from spawn to the Warden by quests, the save survives a reload, and an old v1 save still loads.

### Phase 2 in brief
Move the four wildlands out of start-up into region files that load as you approach, using the `later` and `ensure` queue from instant-delivery.md (built here if it is not built yet). Add the doorway to the game's building tools that region files need. Add the headless smoke test to CI (already on the roadmap) because loading bugs are easy to miss by eye. Done when the land looks and plays the same, the first load is smaller, and walking a full lap of the wildlands on a phone shows no stutter.

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
9. **PR 15 and Moonlit Her compete for the hero.** PR 15 replaces Her with a build-your-own hero and changes the save, input and game-loop files that Phase 1 also touches. Decide which hero the open world uses before Phase 1 starts, and land that first. Its 13 MB kit is also a big download on mobile data.
10. **Originality** for every new region, person and boss look, especially keeping Vesthra and Nyxara far from Medusa and Queen of Pain.

## 7. Open questions for Wasay (one batch)
1. **Shard worlds**: keep Veyra, Neon Verge and Ashfall as pockets behind gates that you enter when you choose, with no pull into Veyra when the Warden falls (recommended)? Or keep today's pull, or rebuild them into the one land?
2. **Map size**: about 1 to 1.5 km across, sized for phones (recommended), or bigger?
3. **Chapters that end**: OK that chapters finish while the endless game continues around them (recommended)?
4. **The hero**: keep Moonlit Her (recommended: she is live and made for this world's look), switch to PR 15's build-your-own hero, which replaces her, or look for a way to have both? If Her stays, is she the canon's Wanderer (update `wanderer.json` to match her)?
5. **People**: OK to add a few talking characters, text only, no voices? Made through the full pipeline, or dressed quickly from PR 15's kit if it merges, even if its look differs from Moonlit Her's?
6. **The queens**: move Vesthra and Nyxara into their own lairs, with the roof as the final joint fight (recommended), or keep them on the roof only?
7. **First phase**: quests first (recommended, quick to feel) or loading regions first (foundation first)?
8. **Save slots**: one (as now) or three?
9. **three.js r128**: stay on it for this plan (recommended)?
10. **Mounts and flight**: drop the 3-minute ride limit while travelling, and keep free flight over the whole land with a height cap (both recommended)?
11. **Mounts as models**: are real 3D mounts wanted at some point? They need a different rigging route than Mixamo.
12. **New region names and themes**: happy with a petrified garden for Vesthra and a briarwood for Nyxara, or other ideas?
