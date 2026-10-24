# How agents work together

The project is organised like its own story. Reality was sundered into shards; each shard is a world, and each world has a **Shardkeeper**. Around them stand the **Loremaster** (canon), the **Gatewright** (the engine that joins worlds), the **Bestiary Keeper** (every creature and character) and the **Veilwarden** (security and releases). Pick the role that owns the files you will change.

| Role | Guards | File |
|---|---|---|
| Loremaster | canon, names, chapters, originality | [roles/loremaster.md](roles/loremaster.md) |
| Gatewright | engine, rendering, UI, build tools, world system | [roles/gatewright.md](roles/gatewright.md) |
| Bestiary Keeper | characters, creeps, bosses, mounts | [roles/bestiary-keeper.md](roles/bestiary-keeper.md) |
| Veilwarden | security headers, CI/CD, containers, releases | [roles/veilwarden.md](roles/veilwarden.md) |
| Shardkeeper of the Moat | the moat world (chapter 1) | [roles/shardkeeper-moat.md](roles/shardkeeper-moat.md) |
| Shardkeeper of the Veil | the spirit realm | [roles/shardkeeper-veil.md](roles/shardkeeper-veil.md) |
| Shardkeeper of Veyra | the alien world | [roles/shardkeeper-veyra.md](roles/shardkeeper-veyra.md) |
| Shardkeeper of Neon Verge | the cyberpunk world | [roles/shardkeeper-neon-verge.md](roles/shardkeeper-neon-verge.md) |
| Shardkeeper of Ashfall | the zombie world | [roles/shardkeeper-ashfall.md](roles/shardkeeper-ashfall.md) |

A new world means a new Shardkeeper: copy a Shardkeeper role file, add a row here, and ask the Loremaster to add the chapter.

## The protocol
1. **Claim.** Open or pick a GitHub issue and comment that you are taking it, naming your role. Labels: `role:<role>`, `world:<id>`.
2. **Branch.** `<role>/<short-topic>`, for example `shardkeeper-veyra/lumen-seeds` or `gatewright/world-system`.
3. **Stay in your lane.** Change only files your role owns. If you need another role's files changed, open an issue labelled `needs:<role>` describing exactly what you need, or keep the change small and tag that role on your PR.
4. **Build and play.** `python3 tools/build.py`, then load `dist/` and play the part you changed. Note anything you could not test.
5. **Hand off.** Open a PR with the template and add `agents/handoffs/YYYY-MM-DD-<role>-<topic>.md` from the [template](handoffs/TEMPLATE.md). The next agent should be able to continue from your note alone.

## Who decides
- Canon, names and whether something is original: **Loremaster**.
- Engine APIs, file layout, the manifest: **Gatewright**.
- Anything public (merges to `main`, deploys, headers): **Veilwarden** and the maintainers.
- Disagreements go in the issue thread; maintainers have the final word.
