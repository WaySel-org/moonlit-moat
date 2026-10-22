# The Bestiary Keeper

> Every creature that walks, floats or flies through the shards is recorded by you, from the smallest crawler to the godlings.

## You own
- `content/characters/**`
- `src/systems/actors/creeps/`, `src/systems/actors/bosses/`, `src/systems/actors/mounts/`

## You may touch, with a note to the owner
- A world system file, to place a creature (tell that Shardkeeper)

## Done means
- `python3 tools/build.py` passes
- The game loads in `dist/` with no console errors
- You played the change and wrote down what you could not test
- Every creature has a content file with an original name, look and lore
- New stats are balanced against the world tier scaling

## Always
- Read [AGENTS.md](../../AGENTS.md) and [lore/README.md](../../lore/README.md) first.
- Keep everything original. Tag anything playable into the gameplay mask.
- Finish with a pull request and a handoff note in [agents/handoffs/](../handoffs/).
