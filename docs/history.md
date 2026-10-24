# History

Built in one long Claude session, 2026-10-11 to 2026-10-23.

## Origin
- Wasay shared an Instagram reel of a solo dev's ASCII MMORPG and asked how it is made. Answer: a normal 3D scene converted to characters per cell in a post-process shader (brightness picks the glyph; edge detection adds `| - / \`), not an image-to-ASCII generator.
- First demo: "Moonlit Moat", a moonlit keep with a lake reflection (mirrored camera render), swaying grass, torches and a moon. Published as a claude.ai artifact: https://claude.ai/artifact/NRpETC9HTeWqEgW3kN6Wou

## Combat and bosses
- Fighting: light combo, heavy, roll with i-frames, block and parry, flasks, lock-on, hit-stop, screen shake, damage numbers, synthesised sound.
- Gate Warden boss (original): slam, sweep, charge, phase two with shockwaves and leaps. Telegraphed attacks with red ground marks.
- Bug fixed: death froze the game loop (updatePlayer returned undefined). Loop now schedules the next frame first.
- Power pods on bushes: green health, blue mana, red damage, yellow agility, electric-blue armour. Moon bolt spell.
- Castle roof, gatehouse, stairs sealed by a ward until the Warden dies. Lake made wadeable.
- Rooftop bosses. Requests to use Lara Croft, Dota 2's Medusa and Queen of Pain were declined; built originals instead: an adventurer hero, **Vesthra the Gorgon** (myth-based: serpent tail, snake hair, stone gaze) and **Nyxara the Thorn Empress** (briar sorceress).
- HUD: spiral "soul coil" health gauge (inspired by a request for Soul Reaver-style health; original design), mana orb, armour ring.

## World and progression
- Dragon **Cinderwing**: first a rooftop hazard, then made peaceful; circles the castle launching fireworks and only fights back if hit.
- RPG layer: XP, levels, attribute points (Strength, Vitality, Agility, Spirit), gold, Moon Shrine upgrades, Warden's Might (leap + stat boosts) for beating the Warden.
- Skills: dagger (Z), bolt (C), arc volley (V, level 3), leap (X).
- Map doubled; creeps (crawlers, wisps) with levels, categories and ancients; treasure chests that upgrade over time; world tier every two minutes scales bosses and loot.
- Hedge maze (11x11 cells of 5 m, reshuffles each tier, traps, six ancients, marked entrances).
- Rotating environments per tier: Moonlit Night, Blood Moon, Creeping Mist, Aurora, Ember Storm.
- Pause (Esc, plus auto-pause when the tab or window loses focus).
- Feel pass: calmer near-monochrome ASCII by default, higher camera, trees fade when blocking the hero, faster movement.
- Sword with five upgrade looks (Iron Sword to Moonblade) and swoosh arcs on swings.
- Mythical mounts, ridden instantly with E: **Moonstag** (Lunar Nova, Starbound Charge), **Gryphon** (Gale Wing, Sky Pounce), **Ember Drake** (Fire Breath, Inferno Dive).
- Two open outpost keeps with three levels; Warden hunts you every three minutes (or its Echo after you beat it).
- Readability pass: gameplay mask so heroes, enemies and pickups stay bright while scenery recedes.
- Spirit realm (Q): Soul Reaver-like *mechanics* only (plane shift, life drains, devour souls, return at rifts), with dreamy warp, violet tint, falling-code rain, a larger outer map, original spirit enemies (Hollow Lanterns, Tide Shades, Ember Wraiths) and two fallen godlings (Aurelion the Sunless, Varghast the Hollow Thunderer). Requests to use Avatar: Korra characters were answered with original elemental spirits.
- On-screen map (M to enlarge).

## Hosting and open source
- Local: Python server on port 8765 via the app's preview (launch config "moonlit-moat").
- Hardened static build on Vercel (project `moonlit-moat`, account `waysel`), bundled three.js, strict CSP and security headers. Custom domain play.waysel.com (waysel.com DNS is on Vercel; no records were changed, the wildcard already pointed there).
- Made public as https://github.com/WaySel-org/moonlit-moat (MIT), with README, CONTRIBUTING and third-party credits. First commit 2a1f17a.

## Restructure (2026-10-23)
- Made the project an isolated repository at `~/Claude Docs/moonlit-moat` (a clone of the public repo).
- Split the single game file into 45 system files by domain (`tools/split.py`), assembled by `tools/build.py`; the assembled code was verified identical to the original.
- Added data-driven content (`content/`), lore canon (`lore/`), storyline-based agent roles (`agents/`), container + nginx + Kubernetes manifests, CI/CD with image publishing, and GitHub templates.

## Combat depth, new creeps and relics (2026-10-23)
- Every player hit now runs through one `strike()` path: crits (5% base, +1.5% per Agility), backstabs on creeps (x1.35), Riposte (the first hit within 2 s of a parry, x2) and Flow (a perfect dodge mid-roll: 2.5 s of doubled stamina regen and guaranteed crits).
- Heavy hits apply Rend, a bleed of up to three stacks on creeps and the Warden. Poison, from a Fen Stalker's bite, ticks through armour until a flask cures it.
- Two new moat creeps with their own AI: the **Fen Stalker** (circles at five to seven metres, then lunges down a telegraphed lane) and the **Thornback** (a shell-walker whose front takes a third damage until it is staggered or struck from behind).
- **Relics**: ten original passive keepsakes, three slots, dropped by gilded and crystal chests, ancients, elites, godlings, the Warden and cleared stages. Drop one from the hero sheet to swap.
- Hero sheet shows derived combat stats (weapon and spell multipliers, crit chance, speed) and the carried relics.
- `#debug` in the URL exposes `window.MM_DEBUG` for play-tests and the planned CI smoke test.

## Ascension and mythics (2026-10-24)
- Beating the Gorgon and the Empress no longer ends the game. It triggers an **Ascension**: the moat's edge moves out by 22 m (up to 168 m), revealing pre-built rings of forest, stone circles and two crystal-tier chests; creeps hit 15% harder per Ascension; after a three-minute lull the queens return with +50% health and +25% damage per Ascension.
- **Mythics**: a director wakes a named mythical creature far from the castle every 45 to 120 s (sooner with tier and Ascension), up to a cap. Seven from public-domain myth unlock by world tier; three original tyrants unlock by Ascension. Each drops a relic and a bounty and is marked on the map.
- Wasay asked to use Dota 2, League of Legends, Bleach, One Piece and Dragon Ball characters; that was declined (copyrighted, and the repo's originality rule) and myth-based and original creatures were built instead.
