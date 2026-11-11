# Handoff: sound design

- **Date:** 2026-11-11
- **Role:** Gatewright
- **Issue / PR:** see the PR for branch gatewright/sound-design
- **Branch:** gatewright/sound-design

## What I changed
- `src/systems/core/14-sound.js`: rewritten as a catalogue of synthesised effects (still no audio files). Shared bus with a compressor and a small room reverb; building blocks `noise`, `tone`, `whoosh`, `thump`, `metal`, `growl`, `chime`, `gallop`, `beastVoice`; the `SFX` table holds one entry per move or event. `sfx(name, beastOrBossId)` adds a few percent of pitch variation and skips the same effect within 35 ms.
- Boss voices: `BOSS` table with 23 signature calls (Warden, Vesthra, Nyxara, both queens together, Cinderwing, Gorgemaw, Ashwing Wyrm, Rimefang Wyvern, Tyrant Rex, Razorclaw pack, ten mythics, the Hive Matron, Director Halvane, the Rot Sovereign). `sfx('boss', id)` on arrival and signature roars, `sfx('bossrage', id)` at half health (pitched up), `sfx('bossdown', id)` on defeat (pitched down, collapse, victory chime). `BOSS_GAIN` trims levels so bosses arrive at similar loudness.
- Beast moves: Space is a short spring with the ridden beast's call (no more 1.2 s roar), plus claw, rampage, rear, stomp, paw landing, dive, pounce slam and one sound per beast skill (`MOUNT_SFX` in 34-beasts-and-mounts.js).
- Hero moves, Moonlit Her's hook (`hook`, `zip`), landings (`step`, `land`), rewards, puzzles, portals and banners (`horn`) all have their own sounds. About 30 call sites across actors/ and world/ now name their effect.
- `src/systems/core/54-debug.js`: `#debug` exposes `sfx`, `SFX` and `sfxMeter(name, id)`, which renders one effect offline and returns its length, peak and loudness.

No gameplay numbers changed.

## How I tested it
`python3 tools/build.py` passes. Every effect, and every boss voice with its rage and defeat versions, renders through `sfxMeter` with no errors and sits in a similar loudness range. In `#debug` I pressed the real keys while riding each beast and traced which effect played (J J J, K, Space, air J and K, Y U I O). Wasay played it on localhost and approved it. Antler Toss (Y on the stag) did not start in my test harness, so its sound is checked only offline.

## What is left
- Enemy-side explosions and dashes still use the generic `boom` and `swoosh`. They fit, but they could get their own sounds.
- No volume slider: the only control is the sound on/off toggle.

## Notes for the next agent
- To add a sound, add an entry to `SFX` (or `BOSS` for a boss) and call `sfx('name')`. Check its level with `MM_DEBUG.sfxMeter('name')`: most effects sit at 0.02 to 0.1 RMS, and big impacts at about 0.2.
- When testing in a hidden browser pane, `requestAnimationFrame` stops. Drive `MM_DEBUG.frame(t)` by hand in short calls (under a second of game time each), or the tab hangs.
