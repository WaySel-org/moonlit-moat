# Handoff on game review regressions

- **Date** 2026-11-20
- **Roles** Gatewright, Bestiary Keeper and Shardkeeper of the Moat
- **Issue and PR** #61 and #60
- **Branch** `gatewright/smooth-hero-animation`

## What changed

- A flask charge is committed when the drink starts. Analog walking uses the stick magnitude, with the same speed cap as keyboard diagonals. Moonhook keeps the head at the tether endpoint and rotates at 18 radians per simulation second, the old rate at 60 FPS.
- The renderer and HUD keep updating while pause or a shop holds the simulation. Gameplay commands entered over a shop do not enter the action buffer.
- Saves keep pending story travel, the one-time World Heart payout, royal revival timers and the run's maze seed. The same seed and tier produce the same hedge layout. A legacy position that lands in a hedge tries the nearest maze cell. Ambush expiry removes the elite and clears its bounty eligibility.
- Rigid friendly and hostile objects use the existing mask passes. Imported rigs share the third pass and draw in their current pose with the appropriate color. Main already handles bloom height changes and skips blur in pure ASCII.
- The build embeds a local crescent icon. Audio initialization waits for browser activation. The README uses the current key bindings.

## Verification

- `python tools/build.py` passed. The initial compressed bundle was 346.6 KB against the 400 KB budget.
- In local Chromium, jumping and pressing Flask preserved three charges. A valid buffered drink spent one and healed the hero. At first contact, a Warden charge left HP and its hit flag unchanged through pause and a shop, then hit when play resumed. Quarter stick moved 0.068 units against 0.272 at full input in a 40 ms frame. The Moonhook head matched the tether endpoint.
- Reloading after the last shard played the finale and granted its reward once. A second reload kept the reward. The Ascension lull survived reload and respawn, and both royals rose two levels stronger when it expired. Focused source tests covered automatic chapter travel, a field royal revival, maze layout across reloads, and expired and active Ambush bounties.
- Enhanced Raw rebuilt both bloom buffers after a height-only resize. ASCII used three mask passes and skipped bloom. Separate WebGL 1 and 2 pixel checks confirmed that the skinned friend and foe colors followed their animated poses, including overlap through depth. Local Chromium reported no warnings, JavaScript exceptions or HTTP errors in the integrated run.

## Notes for the next agent

- Legacy saves with all four shards keep their recorded rewards. Their saves do not say whether the old finale paid out, so loading them does not award another payout.
- The Warden's airborne slam behavior is a design check. The verified fixes preserve attack ranges and timing. Stick pressure was tested with injected inputs, and physical controller and touch tests remain open.
