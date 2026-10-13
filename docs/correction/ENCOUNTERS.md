# Differentiated Emberwake guardians — encounter slice

## Integration (parent-owned)

Load `assets/scripts/encounters-v12.js` **after `engine.js` and `core-v11.js`, before App boot**. Recommended browser order: worlds → engine → core-v11 → encounters-v12 → client → controls-v11 → journey-v11 → realm-v11 → parent presentation extension. Use the same script in every supported Emberwake entry and include it in shipped manifest/cache provenance. This task did not modify HTML, client, build, package, workflows or caches.

Node:

```js
const EW = require('./assets/scripts/engine.js');
const levels = require('./assets/scripts/worlds.js');
require('./assets/scripts/core-v11.js');
const encounters = require('./assets/scripts/encounters-v12.js');
// Auto-installs when globalThis.EW exists; explicit alternative:
encounters.install(EW);
```

Installation is idempotent. `EW.Encounters` exposes a frozen API with `version`, `timing`, `telegraphs(game)` and `install(EW)`. This module deliberately does **not** change `EW.version`, save version, progress flags, required abilities, guardian IDs, HP, rewards, arena bounds or world data. Parent owns the combined release version and acceptance evidence.

The wrapper supplies new `updateBoss` behavior only for `warden`, `forge` and `regent`; unknown types delegate to the captured update method. It preserves core's guard/stun behavior and original `hurt` authority. A narrow `damageEnemy` wrapper delegates original damage/rewards and invalidates tagged hostile projectile objects on boss defeat: the base engine may still be iterating an older shots array after replacing `this.shots` during victory. Reflected hero-owned shots are not invalidated.

## Mechanics and timing

All timing is simulation time. No randomness, browser API, new dependency, wall-clock timer or persisted encounter state is used. Invalid/nonpositive/>1 second update deltas are inert; valid deltas clamp to 1/60 as in the engine. Normal App simulation remains 1/120.

| Guardian | Pattern | Telegraph / active / punish window |
| --- | --- | --- |
| Thorn Warden | Alternates **root lanes** and original-style direction-locked **charge**. Roots lock the initial player-center lane and an offset lane; below 45% HP a third lane is added when spacing permits. | All roots warn together; stationary floor blooms last .35 s, radius 24, damage 16. Charge warns before moving at 380 units/s; damage 22 only on active body contact; nominal charge .65 s. |
| Hour-Eater | **Two staged groundwaves**, first launching rightward from the arena quarter, then leftward from the opposite quarter. Origins/directions lock at warning. | Second wave launches .65 s after first, independently premarked from initial warning. Each wave moves 280 units/s for .55 s, radius 13, damage 18. Neither is a whole-arena instant sweep. |
| Hollow Regent | **Two marked-light floor impacts**, first at locked player-center location, then a locked adjacent location 150 units toward the arena interior. | Second impact .65 s after first; each stationary impact lasts .25 s, radius 28, damage 18. These are ground impact zones, not invisible full-height beam collision. |

Initial warning is **1.15 s on story**, **.95 s on adventure/veteran**, including low HP. No veteran warning reduction or speed escalation. Existing difficulty multipliers, invulnerability, jump/dash and core guard/reflection remain authoritative. Root/light zones are avoidable by walking off the marked lanes or an ordinary held jump; waves can be jumped. No new ability is required. Marks are clamped to the actual boss arena, including the larger rush arena.

After the last threat's lifetime plus a one-step drain allowance, the module removes remaining tagged hostile threats and enters **1.35 s recovery**. During idle (.85 s) and warning it does not apply passive boss-body contact damage; active charge is the only body-contact attack. Boss position otherwise stays planted, allowing readable lane attacks and melee approach/punishment. Existing melee/spell damage remains effective during recovery. Core parry may interrupt a sequence into its own .8 s recovery/.12 s stun; the wrapper cancels unfired stages and hostile encounter shots, without deleting reflected hero shots or overriding that core recovery duration.

## Read-only rendering contract (parent-owned and required)

```js
const marks = game.bossTelegraphs;
// Equivalent: EW.Encounters.telegraphs(game)
```

The returned array and each entry are frozen copies; reading does not advance the simulation or modify progress. Entries:

- `bossId`, `kind`: `root`, `groundwave`, `light`, or `charge`.
- `x`, `y` (570), `radius`: world-space impact/launch marker and collision radius.
- `direction`: -1/1 for waves/charge, otherwise 0.
- `endX`: bounded projected horizontal travel endpoint for waves/charge; root/light use `x`.
- `phase`: `warning` or `active`; spent marks are omitted.
- `remaining`: seconds until activation; `warningDuration`: initial delay until that individual stage, including staged offset.
- `activeRemaining`, `activeDuration`: remaining/full nominal threat lifetime.

Draw warnings in world coordinates using `renderer.cam` and the actual parent viewport transform, not DOM screen coordinates. For waves, mark the **corridor from x to endX**, including radius and direction arrow, not just a dot at launch. For roots, draw separate lane footprints. For light, show a floor reticle and falling-light anticipation, but don't imply the entire tall column deals collision damage. Charge requires a direction/corridor cue plus the existing boss body, not only a ground circle. Use pose/shape/label cues as well as color; reduced-motion must retain every warning and countdown.

Entries retain their locked targets when Lyra moves. Later stages stay visibly warned during the first stage's activation. The reader returns `[]` immediately while menu/dead/won, boss inactive/defeated, recovery, or before a warning starts. Parent should also hide warnings while its modal/pause presentation is active; simulation is paused by App, not this module.

Events:

- Existing `warning` augmented with `bossId`, `duration`, immutable initial `telegraphs`, and `move` (`root-lanes`, `forge-waves`, `marked-light`, `charge`).
- `guardianAttack`: `bossId`, `kind`, `x`, `y`, emitted once per scheduled stage at activation.
- `guardianRecovery`: `bossId`, `duration`, emitted on normal punish-window entry.
- Existing `slam` emitted for each noncharge impact/launch, preserving audio/particle feedback.

**Update HUD move labels.** The inherited HUD recognizes only `rain` and `slam`, otherwise advertises charge. Until the parent maps these new moves to truthful labels/marks, browser integration is incomplete. Base projectile rendering shows circular glowing threats using `r`, `vx`, `vy`; parent may use `encounterKind` for root/wave/light silhouettes. Tagged shots retain ordinary engine fields, plus `encounterBossId` and `encounterKind`. `wave:true` intentionally prevents ground terrain from instantly swallowing floor impacts; these threats are bounded/lifetime-limited, not dynamic solids or new persistent geometry.

## Authority, cancellation and compatibility

- Update never acts unless status is playing, player/progress exist, boss is alive and active. No pending volley resumes while dead/menu/won/inactive.
- Lethal charge contact stops before recovery or later scheduled effects. Full simulation relies on the parent's existing post-death step barriers; this module does not replace `step` or enemy updates.
- Boss victory keeps original once-only defeated flag/currency/XP/heal/events. Tagged hostile objects are expired even if a same-frame projectile loop retains an old array reference.
- A new boss object on reload/respawn starts a fresh encounter; state is per-boss in a WeakMap and never enters snapshots. Checkpoint resume still restores baseline journey semantics, not fight state.
- Story/rush use the same patterns against their actual arenas. No HP creep, additional sigils, mandatory ability or save migration is introduced.

## Assigned validation performed

Run only:

```sh
node --test tests/emberwake-encounters.test.cjs
```

**Latest run: 89 tests passed, 0 failed, 0 skipped; Node v24.14.1.** The first run exposed a module syntax typo; it was fixed. An expanded same-frame victory assertion initially expected pre-victory HP, but original victory healing/rank-up legitimately increases max HP; that assertion was corrected to require full current max HP and no hurt event, not to disable original healing.

Coverage includes 72 warning→activation→recovery fixtures (three guardians × three difficulties × story/rush × low/full HP phase × 60/120 Hz), locked/bounded lanes, available safe lane, real `step` damage vs ordinary jump avoidance, staged volley cancellation, core guard/reflection ownership, read-only snapshots, invalid delta/stun, reload/respawn, deterministic full-step replay, lethal light/charge terminal behavior, original once-only victory rewards and same-frame hostile-shot invalidation.

These tests use **isolated encounter fixtures** (including position/phase setup), not new-game campaign completion proof or browser rendering evidence. Only the assigned suite was executed. Parent must integrate the script into its ordinary-input campaign controller/hashes and root/browser tests, render all telegraphs, and perform human timing/readability/device checks before release. Existing campaign routes may need truthful tactical controller changes; do not bypass encounters through state edits to obtain completion evidence.

## Whole-campaign harness integration and route evidence

`tests/emberwake-qa.js` now requires `encounters-v12.js` after core and includes its SHA-256 alongside engine/worlds/core. Observations remain JSON clones and include a copy of read-only guardian telegraphs. **Guardian tactics were not weakened or changed:** the original controller completed all eight historical story/rush/difficulty cases with the new encounters, so no difficulty-driven combat adaptation was necessary. Fast bot kills/staggers can shorten patterns; these campaign passes do not replace the separate sequence/telegraph encounter fixtures.

The original four main cases and four difficulty-matrix cases are preserved, as are all **116 regression assertions**. The matrix adds twelve ordinary-input **optional-route whole campaigns**: three difficulty presets × 60/120 Hz × mercy/rekindle. Each starts with `newRun`, visits each declared route `path` and `returnPath` platform via grounded waypoints, collects the route's existing cache, defeats every original enemy/guardian, releases/collects all six sigils, and reaches the actual exit choice before authorized `finish`. Rush remains its original three-guardian run; optional branch traversal is story-only.

### Observed navigation failures and bounded corrections

The first optional-route attempt timed out after a broad return-floor waypoint used the floor center, accidentally entering the Cinderworks boss arena before the remaining westward fights. Return-floor targets now stay on that actual floor **100 units before the guardian boundary**, without moving the player directly or changing the arena lock.

The next attempts died crossing the Cinderworks lava gap westward. The inherited navigator only anticipated eastward gaps. Its floor-edge jump and airborne double-jump rules now work in either direction, using cloned geometry/player observations and normal `axis`, `jumpPressed`, `jumpHeld` inputs. No health/position edits, teleports, direct loads, checkpoint bypasses, free upgrades, lowered damage or game-source changes were used to rescue these campaigns. Early failures were real and preceded the final passing evidence.

Route landing evidence records observation frame, realm/route/platform ID, actual X and foot height. Exact replay verifies each recorded landing is grounded on the specified authored platform. Final optional cases each have **27 waypoint landings**, covering the **12 newly authored route platforms** plus original approach/cache/return anchors; repeated shared anchors are not presented as distinct new platforms.

### Latest executed results

- Main campaign harness: **4/4 completed and exactly replayed**, **116/116 regressions**, repeat determinism passed.
- Difficulty matrix: **16/16 completed and exactly replayed** (four historical cases plus twelve optional-route cases).
- **20 distinct campaign cases total, all zero deaths** in the final runs. The additional main repeat is a determinism check, not another distinct case.
- Replay now checks authoritative-state SHA-256 every 240 steps and at completion: progress, player, enemies, boss, shots, telegraphs, clock, attack ID and encounter activation. This is stronger than final-save-only equality; it does not serialize private encounter state into saves.
- Standalone `--replay=...` on the four-case earned proof passed. Source-directory argument parsing now excludes that flag instead of accidentally treating it as a directory.

Executed commands used `EW_QA_OUTPUT=/tmp/emberwake-encounter-campaign` to avoid overwriting parent-owned repository QA artifacts. The directory contains `emberwake-qa-results.json`, `emberwake-input-proof.json`, `extended-difficulty-results.json`, and `extended-difficulty-input-proof.json`. Parent should promote/re-run evidence against its final integrated revision. The four runtime hashes were rechecked against local source after the run and matched; any later runtime change requires rerunning.

This evidence covers simulation and ordinary-input traversal, **not** rendered telegraph visibility, native keyboard/touch/controller mapping, human completion time, real-device balance, browser performance or release certification. Only the assigned campaign harness/difficulty suite and earned proof replay were executed during this follow-up.
