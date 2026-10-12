# Premortem — concrete mitigations, not a "100x" claim

| Failure | Prevention | Validation / fallback |
|---|---|---|
| Looks like a small web demo | Full-screen world, dimensional models, layered biomes, minimal HUD | Review title, combat and mobile screenshots |
| Impossible route or spell softlock | Ability granted before gate; free regen/shrines; retain shard flags on death | Topology/ability-order tests plus input-only campaign route |
| Game feels floaty | Fixed timestep, coyote/buffer, variable jump, windups/hit-stop | Movement/combat regressions; human balance review still needed |
| Enemy farming breaks progression | One-time defeated/cache IDs, bounded rewards | Reload/revisit tests |
| Save corruption erases hours | Strict schema, backup, guarded storage, export/import | Malformed, unknown-version and storage-denied tests |
| Mobile controls stick | Per-pointer state, pointer capture/cancel, blur clearing | Independent pointer tests and viewport review |
| Browser stalls after background | Cap frame delta; pause on visibility | Pause/reload browser checks |
| Memory balloons on travel | Dispose room geometries/materials; pool or cap effects | Repeated-room browser test; long-session profiling remaining |
| GPU fails/phone heats | Quality tiers, ratio cap, WebGL error screen | SwiftShader test; actual device gate; legacy fallback |
| Fake production claim | Report measured tests and untested gates separately | QA report checked before README status |
| Credential leak | External helper only, no command echoes, scanner before push | Repo/runtime scanner; owner rotate token |
| Stale PWA hides release | Versioned cache, scoped shell, update on reload | Offline/reload checks, clean uninstall path |
| Too many dependencies | Only rendering/build/browser-test libraries | npm audit and lockfile; offline runtime |
| Copyright confusion | Original title, art, maps/dialogue/music | README disclaimer; owner trademark/legal review |
| Massive planned scope never ships | Compact 22-room complete campaign; defer excess modes | Ending/recovery/continue tests before feature expansion |

No numeric "100x better" effectiveness is asserted. These layered mitigations are testable engineering commitments.
