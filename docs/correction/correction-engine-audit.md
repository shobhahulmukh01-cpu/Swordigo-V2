# Emberwake in-place correction: engine and compatibility audit

## Decision and scope

**Upgrade the supplied EMBERWAKE: The Hollow Crown 1.1.0-rc.3 in place. Do not ship Lumenblade as the default and do not transplant its independent simulation/save/world model.** The preservation boundary is the seven existing `assets/scripts/` files, the Emberwake cast/worlds/art, the `EW` / `EWClient` contracts, and existing portable version-3 journeys. Preserve working behavior while making focused, tested changes inside those systems. Keeping Emberwake behind a “legacy” link is not this correction.

This is a **static code and test-source audit**, not implementation or newly executed validation. I read the seven baseline scripts, HTML entrypoints, package/build/server/workflow configuration, Emberwake campaign/browser test sources, selected Lumenblade tests, and existing QA reports. I used local Python only to read files and calculate SHA-256; I did not execute repository game/test/build code, fetch/run external reference code, access credentials, or perform Git operations. The branch name `feat/emberwake-in-place-sequel` and source-ZIP equality are supplied by the parent; I did not independently inspect Git or the ZIP. Only this audit file is written by this task.

`/data/work/plan/repos.md` is a broad reference catalog, not a requirement to download or run its repositories or its embedded install commands. No outside framework is necessary to establish the preservation plan. In particular, do not add an orchestration/model dependency to a dependency-free game merely because it appears in that list.

## 1. Current architecture and the incorrect default

| Existing seam | Observed contract | Preserve and extend here |
| --- | --- | --- |
| `assets/scripts/engine.js:7–33` | `EW.Physics.step`, rectangle collision, acceleration, gravity, coyote time, jump buffer, variable/double jumps, one-way platforms; numeric pixel coordinates | Add explicit collision/body metadata and targeted movement fixtures before new platforms; retain the existing feel as the baseline preset. |
| `engine.js:39–54`, `core-v11.js:5–21` | Version-3 save normalization and stricter journey validation; `EW.Save.read/write` plus guarded `Game.resume` | Centralize schema/migration rules without weakening category/progression checks. Keep legacy import and storage namespaces. |
| `engine.js:56–203` | `EW.Game`: state, progress, encounters, checkpoints, currency, upgrades, damage, spells, melee, event queue, simulation step | Extend existing methods/state with data-driven abilities/encounters; simulation remains DOM-free. |
| `assets/scripts/worlds.js:3–52` | Three authored realms, persistent entity IDs, fixed geometry, NPC/lore/intro/victory data | Deepen Moonroot/Cinderworks/Hollow Spire routes and encounters first; do not substitute an unrelated world graph. |
| `core-v11.js:22–34` | Prototype wrappers add guarded loads/finish, fall-vital preservation, parry/reflection/stun, explicit same-beacon rest | Preserve these fixes. Migrate wrappers into explicit methods only as isolated behavior-preserving work with regression gates. |
| `assets/scripts/client.js:94–147` | `EWClient.App`, fixed-step browser loop, input aggregation, modal/UI/HUD, persistence, audio, renderer, global `emberwake` | Add coherent menu/input/save lifecycle methods here; keep event processing and simulation ownership separate. |
| `controls-v11.js:9–26` | Capture-phase remapping, aliases, touch guard, controller quarantine/menu navigation, guard edge, input/HUD adaptation | Expand action definitions rather than create competing listeners; preserve release/blur/pointer cancellation behavior. |
| `journey-v11.js:4–17` | Restore/replacement confirmation, async generation/modal epoch cancellation, focus return, rolling backup UI, local milestones | Extend import preview/migration and durable-save messaging; preserve cancellation and stale-read protections. |
| `realm-v11.js:3–11` | HD background plates/fallback, guard visual feedback, mini-map/preferences | Extend renderer/scene feedback and cartography; keep Canvas2D fallback and reduced-motion behavior. |

### Boot and packaging correction is the first dependency

- `index.html` boots `assets/lumen/game.js`, declares Lumenblade branding/manifest, and relegates Emberwake to `assets/legacy.html`.
- `assets/legacy.html` is the real supplied game host. It sets `<base href="../">`, loads **worlds → engine → core-v11 → client → controls-v11 → journey-v11 → realm-v11**, then boots on `DOMContentLoaded`. Keep that order; later scripts wrap earlier prototypes before App construction.
- `package.json` identifies Lumenblade and `npm test` defaults to release-builder tests plus Lumenblade tests. `scripts/bundle.mjs` builds `src/app.mjs` into `assets/lumen/*` and rewrites `sw.js` with a Lumenblade cache list. `npm run build` executes that bundle step first.
- `sw.js` only caches the Lumenblade shell, not Emberwake's seven scripts/images. Existing Lumenblade offline tests do not establish offline Emberwake operation.
- `tests/browser-smoke.py:140,244` explicitly navigates to `assets/legacy.html`. Its success does **not** prove the root opens Emberwake.
- CI/Pages run both products' checks and build the current Lumenblade default; a green run is not acceptance of this correction. Manual Pages deployment is main-only, not the supplied feature branch.

**Parent implementation:** make the root host the existing Emberwake game, preserve one App boot, fix root asset resolution, and remove the Lumenblade bundler from Emberwake's production build path. Do not copy the legacy `<base href="../">` unchanged into a project-prefix root: it would resolve outside `/Swordigo-V2/`. Keep a compatible old-entry alias/redirect with correct prefix resolution. Retain byte-verified source snapshots through the parent's usual review process; do not silently erase the previous work as part of this audit. Whether to keep a nondefault experimental Lumenblade artifact is an owner decision, not the upgrade strategy.

If offline is included, author an Emberwake-specific cache manifest, version it against all essential assets, and test updates from the old same-scope Lumenblade worker. Leaving the old worker registered can serve the old shell during offline navigation even after the online root is corrected. Do not wipe `localStorage` to repair caches; cache cleanup and journey storage are separate.

The existing release builder's manifest/hash/cap/symlink controls and static server path/CSP controls are worth preserving. `scripts/serve.mjs` hashes inline HTML scripts and permits a same-origin base; test the new root boot under its CSP rather than weakening `script-src`. Pages does not inherit this custom server's headers.

## 2. Save compatibility: invariants and upgrade hazards

### Actual persisted contract

Version **3** includes:

- `level` as an array index; `mode` (`story`, `rush`); `difficulty` (`story`, `adventure`, `veteran`).
- `gold`, `xp`, `rank`; `upgrades.blade/heart/focus` capped at 3.
- Category-specific arrays `flags.chests/runes/sigils/defeated/seen` containing authored IDs.
- A checkpoint ID; `stats.time/kills/deaths`; boolean `completed`; ending `mercy` or `rekindle` for completed runs.

Storage keys are `EW_STORY_V3`, `EW_RUSH_V3` and each `.backup`. Preferences/milestones use `EW_SETTINGS_V1`, `EW_BINDINGS_V1`, `EW_AWARDS_V1`, `EW_MINIMAP_V1`, and `EW_RUSH_BEST`. Do not rename, clear, or reinterpret these accidentally.

`loadLevel` reconstructs the player at a checkpoint with full HP/MP and three flasks; ordinary living enemies are omitted if their IDs are in `defeated`. Export is a **journey checkpoint**, not a serialized fight. Player coordinates, active damage/resources, cooldowns, enemies' remaining HP, projectiles, modal state, and renderer particles are not persisted. Keep this promise visible. Adding exact combat resume is a separate schema/state-lifecycle project, not a harmless save improvement.

`core-v11` strengthens the base validator: unknown/misplaced IDs rejected; collected sigils require released runes; current realm must be seen; integer counters; prior realms through the furthest seen index must have their boss and both sigils; completion requires all existing realm bosses/sigils, final level, and an ending. Unknown checkpoint currently normalizes to the first checkpoint; duplicate valid flags normalize to unique values. Preserve these deliberate normalization behaviors or document/test a migration change.

### Compatibility hazards that will break otherwise valid journeys

1. **Reordering realms breaks numeric `level`.** Keep the three original indices and IDs stable until a migration introduces stable realm identity.
2. **Renaming/removing entity/checkpoint IDs breaks flags or changes restart location.** Keep `m-*`, `c-*`, `h-*` IDs; use an explicit mapping if retirement is unavoidable. Do not reuse an old ID for new content/reward semantics.
3. **Appending a mandatory realm invalidates completed v3 saves.** Validation/finish use `levels.length-1` and `levels.every(...)`, not a versioned campaign requirement. Adding a mandatory sigil/chest also changes completion/collectible semantics.
4. **Exactly-two assumptions are spread across systems.** `getSolids` gates at `<2`; boss activation and guarded `finish` require exactly 2; HUD/toasts/tutorials assume two per realm. `codex` and cache milestone hard-code six. Adding content without explicit required-vs-optional metadata can strand progression or wrongly award milestones.
5. **New persistent fields silently disappear today.** The base validator reconstructs a whitelist object. Adding `abilities`, inventory, new quests, or equipment only to progress means Save.write/resume may discard them. Extend normalization, export/import, UI, and tests together.
6. **Content growth meets current caps.** The 200-entry-per-category and 150,000-character string limits need an intentional new-version budget; the UI uses file bytes, so retain conservative UTF-8 handling. A bigger limit alone is not a migration design.
7. **Completed runs revisit an ending, not a replayable new chapter.** `resume` sets status `won`; appended content needs a deliberate continuation route. Never retroactively mark the old ending false just because content was added.
8. **Preferences/milestones are not in journey exports.** Preserve that existing distinction; if adding portability, use a bounded optional settings envelope, not an implicit promise that old exports contain it.

### Recommended migration policy

- For the first substantive release, retain the original three-heart main campaign and v3 saves; new side routes should be optional and old completion must remain valid. Do not immediately make a new world mandatory.
- If persistent abilities/equipment/quest flags are necessary, use an explicit v4 schema and a pure `migrateV3ToV4` adapter. Validate v3 against the **frozen original campaign definition**, then map stable IDs and derive only earned unlocks from original boss flags. Never validate old completion against enlarged future requirements.
- Version the campaign requirement set independently of runtime release labels. Use `campaignId` and stable realm identity in the new schema; keep a legacy index mapping.
- Migration writes go to a new namespace only after successful validation and user acceptance. Keep the original v3 primary/backup untouched for recovery; make new exports identify schema and game unambiguously. Do not import Lumenblade saves into `EW_*` keys or substitute its serializer.
- Migration must be deterministic/idempotent and preserve gold, XP, rank, all original upgrades/flags/counters, checkpoint and ending. Defaults must be safe, not unexplained free rewards. Decide explicitly whether “unbroken” milestones cover the old campaign or an extension.
- Retain both ending choices and the completed-story unlock for Echo Gauntlet. A content update must not relock an earned mode.
- Rolling backup is **one prior valid write**, not an archival slot. Autosaves overwrite it. If the owner wants durable multi-slot saves, add them expressly; keep the old keys as an import source and distinguish “saved this session” from “persisted on disk.”

## 3. Concrete correctness risks to address before adding systems

These are static observations and proposed repro/gates, not runtime-confirmed exploit claims.

### P0: wrong delivered game

Root/build/offline identity is currently Lumenblade. Correct all three and test root boot under real HTTP/project-prefix paths before calling any gameplay expansion complete.

### P1: authority and lifecycle gaps

- **Travel checks live mostly in UI.** `App.map` disables unseen/rush/active-boss travel; the click delegate directly invokes `game.loadLevel`. `core-v11` validates only index/progress existence. Introduce `Game.travel` / `canTravel` with discovered-realm, boss-lock, run-mode and checkpoint constraints. Keep internal `loadLevel` for transitions/fixtures, not a player authority API. Test denial without any state/event mutation. This is robust local gameplay state, not network anti-cheat.
- **Current-realm defeat consistency is weaker than historical completion.** Strict validation checks prior realms and completed runs, but does not expressly reject an incomplete current-realm boss defeat without its required sigils. Decide and fixture this invariant; don't tighten v3 rejection without checking legitimate exported saves.
- **Simultaneous guard + dash starts both.** Guard wrapper tests the pre-step `p.dash`; base step can then start dash from the same input sample. Define priority (e.g. dash wins and cancels guard, or guard wins) and test combined keyboard/touch/controller actions. Preserve deliberate single-action behavior.
- **Melee during dash is inconsistent.** `slash` prevents starting an attack when already dashing, but an existing attack remains active, and same-step attack starts before dash. Decide whether dash should cancel/retain attacks; encode phase/cancel rules, not accidental call order.
- **Damage can kill mid-step while later logic continues.** After `hurt` changes status to dead, the base step can still run other enemy/projectile/collectible/checkpoint/interact logic. In particular, automatic new-checkpoint refill is not guarded by `status==='playing'`. Add an explicit death terminal barrier; assert no postmortem pickup/rest/win/travel/save-state inconsistency.
- **Save UI conflates session and persistence.** `App.save` updates `savedStory/savedRush` even when Save.write fails; warn without implying durable Continue state. Separate session snapshot from confirmed persisted save and test failures after backup write but before primary write. Save replacement UI says a backup is kept even when storage is blocked; make this conditional.
- **Remap held-key ownership can leak on close.** Capture remapping returns early while a modal is open, letting the original client keydown listener see default keys after a modal closes. Key-repeat handling only blocks already-held default keys. A remapped nondefault held key can re-enter on repeat after clearInput. Track quarantined physical keys until keyup, like controller quarantine; test hold→pause→resume for remapped and default keys.
- **Guard reward is spatially broad.** `reward` stuns all nearby living enemies by horizontal distance alone, irrespective of height, walls or facing; boss recovery checks mostly horizontal distance. Scope the struck/guarded source or add intended radius/line-of-sight rules. Preserve projectile reflection reward but don't let a parry on one lane disable unrelated enemies through scenery unintentionally.

### P2: collision and time semantics

- Projectiles move to an endpoint and test targets before solids; there is no swept target/terrain time-of-impact ordering. A rune/foe can be hit in an occluded overlap before a wall kills the shot. New thin blockers/faster spells need swept or bounded-substep collision and closest-hit ordering. Decide whether arena dynamic walls from `getSolids` should block shots (currently terrain shot collision uses only `current.solids`).
- Physics uses prior-edge AABB resolution and no embedded-body recovery. Static data avoids many cases, but moving platforms/doors and newly spawned solids can overlap a body; do not add them without displacement, crush/escape, and safe spawn rules.
- Existing collision substeps are at most 1/120 but whole Game damage/update steps clamp to 1/60. Client caps wall time at .05 and catches up at 1/120 with a loop cap; long stalls discard elapsed time. This is a reasonable stability tradeoff, **not** a frame-independent speedrun timer. Specify whether `stats.time` is simulation-active time, and separate wall-clock scoring if wanted. Keep gameplay pause/visibility safety.
- Same-beacon rest is explicit, but first/new checkpoint entry still automatically fully restores, and reload/resume/return-to-beacon restores full vitals. Preserve current semantics until a deliberate recovery design changes them. Do not claim all healing requires explicit rest.
- Input held attack/spell repeats through cooldowns in `App.sample`; simulation bots feed `attackPressed` repeatedly too. If introducing timed combos, buffering/cancel windows must be compatible with hold-to-attack or expose an assist preference.

## 4. Substantial gameplay upgrade without a rewrite

### Combat depth

**Current:** three-hit sword combo with damage multiplier, one lumen bolt, invulnerable dash, 190 ms frontal guard/reflection, heal, three regular archetypes (crawler/sentinel/wisp), and three bosses. Bosses share idle/windup/charge/recover and alternate charge with slam (first two) or rain (regent); low HP changes speed/projectiles. Difficulty principally changes incoming damage and story boss windup. Rank/three shrine upgrades mostly grow numeric power.

**Extend:**

1. Add explicit attack startup/active/recovery and an input buffer around the existing `slash` API. Establish per-enemy hit-ID/one-reward invariants before polish such as hit stop. Visual hit stop must not desynchronize cooldowns/guard timing or make render state authoritative.
2. Add one earned secondary Emberwake spell with a clear traversal/puzzle purpose, using existing projectile/event/input seams. Retain lumen bolt rune release, mana regeneration and focus identity. Use per-spell metadata and cooldown/cost, plus spell selection on keyboard/touch/controller. Do not copy Lumenblade abilities wholesale.
3. Differentiate the existing guardians by pattern/arena design within `updateBoss`, preserving their names/IDs and worlds. Thorn Warden: controllable root zones; Hour-Eater: staged forge lanes/recovery opportunities; Regent: readable marked rain and a distinct final phase. Each threat needs pose/shape/audio cue, not color alone, and a counter available to an old-save player.
4. Extend enemy behavior definitions rather than multiply painted variants with identical AI. Add vertical/ranged positioning, guardable vs deliberately unguardable attacks, and varied safe engagement distances. Teach differences in low-risk encounters.
5. Make equipment/attunement choices alter tactics rather than only damage, while preserving earned blade/heart/focus investment. Persistent loadouts require the migration policy above. Do not create an inventory before it has useful choices and clear UI.

### Platforming and exploration

**Current:** three long horizontally scrolling strips, floor gaps, repeated 480→370 one-way climbs, two bolt-unseal-and-touch sigils each, optional letter caches, NPCs/shrines/checkpoints. Double jump and dash are available immediately. There is no wall jump, ledge grab, moving platform carry, meaningful vertical room graph or earned traversal progression in this engine.

**Extend:** first improve existing realms with alternate routes, optional vertical pockets, route-specific encounters and legible short puzzles. Keep existing critical route/spawns viable for old journeys. Use a world validator for safe checkpoint floor, unique IDs, enemy type existence, required-route reachability, hazard/arena placement and reasonable bounds. Build new motion/interaction mechanics one at a time with carry/crush/one-way tests; don't just draw a moving platform over static collision.

Choose either an enhanced fixed-height route design or an explicit vertical-camera extension; the renderer currently fixes 720 logical height and world placement uses many 590/370/480 constants. Tall levels require camera/world bounds/HUD/map redesign, not just larger Y coordinates. Optional ability-gated routes should not softlock the main route or existing saves. Travel should preserve discoveries, prevent boss escape, and have deterministic checkpoint destinations.

### Progression and pacing

Give each original heart a meaningful earned consequence and optional return content, without taking double jump/dash/guard away from established saves. Use a compact dependency graph for mandatory objectives and optional secrets. Derive required-rune totals and cache totals from campaign metadata; let side quests have separate IDs/requirements. Preserve Lyra, Aster, Veyr, the three hearts, the letter motif, mercy/rekindle, and Echo Gauntlet.

Enemies remain permanently defeated today and gold rewards don't farm on reload. Don't casually switch to full respawn/economy grinding. Model expected earnings and upgrade affordability before changing costs. Completion bots are efficient route solvers, not measures of human campaign length, fun, challenge, or exploration quality. Human playtests must cover comprehension, pacing, optional-route discovery and recovery cost.

### Presentation, controls and accessibility

Extend the actual Canvas2D Renderer/HD plates/procedural audio: tighter hero/attack silhouettes, consistent depth/occlusion, readable telegraphs, animation anticipation/recovery, deliberate room transitions and checkpoint camera snaps. Renderer resize already supports high DPI with a capped device pixel ratio; measure before replacing it with WebGL or adding dependencies.

New actions need shared labels, remap rules, prompts, UI glyphs and controller bindings. On portrait touch there are already seven action buttons including guard; do not add three more permanently visible buttons. Prefer spell-cycle/contextual interaction with tested hit targets and multi-touch. Preserve reduced motion, sound controls, modal focus trap, Escape while inputs are focused, native import/export, and accessible DOM menus. Canvas gameplay is not thereby screen-reader accessible. Profile actual frame time/memory/thermal behavior rather than advertising “60 FPS” from simulation tick frequency.

## 5. Existing evidence and gaps

### What is present, not newly run

- `tests/emberwake-qa.js` imports engine/worlds/core, runs observation-cloned controllers using ordinary inputs, records run-length input proof, verifies finished progression, replays exact inputs, and separately runs isolated mutating regression fixtures. Its existing report records **116/116 regressions**, four story/rush completion runs at 60/120 Hz, replay and repeat determinism. These are stored artifacts, not fresh passes from this audit.
- `tests/difficulty-matrix.cjs` adds four recorded cases across adventure/veteran, both story endings and veteran rush. This is not the entire cross-product of difficulty × rate × mode × ending.
- `tests/browser-smoke.py` exercises real Chromium DOM/Canvas input, menus/focus/import/download/storage/touch/audio and synthetic standard-layout controller polling. Existing `qa/legacy-http/browser-results.json` records **53 passing, 0 failing checks**. The report's generic scope wording mentions CDP fulfillment conditionally; inspect `assetTransport` for the actual recorded route. Neither its filename nor synthetic controller checks prove physical-device qualification.
- `tests/release.test.mjs` validates packaging determinism, hashes, managed-dist boundaries, caps, symlinks, secret scanner and server path/CSP/HTTP contracts. These generic controls are valuable and should survive the product correction.
- `tests/lumen.test.mjs`, `lumen-campaign.mjs` and `lumen-browser.mjs` target `src/*`/Lumenblade. They are not evidence for newly upgraded Emberwake abilities/content/saves.

### Coverage traps

The campaign controller's routes hard-code three realm names, surface heights, enemy order, shrine/checkpoint indices and exactly two runes. Its success proves these authored routes, not arbitrary reachability or all optional secrets. Changing content requires truthful controller/goal updates; never move the bot to direct `loadLevel`, damage, flag or win writes to rescue a proof.

`emberwake-qa.js` currently asserts exact `EW.version==='1.1.0-rc.3'`. Upgrades need a deliberate expected-release update or invariant suite split, not a permanently frozen release label. Its hashes cover only engine/worlds/core. Add all seven shipped scripts, entry HTML and essential image manifest to browser/build provenance.

Exact snapshot replay compares progress, not every transient simulation field at every frame. Add authoritative-state checksums at milestones for player/enemies/boss/shots/cooldowns/events; exclude renderer randomness. Keep old replay fixtures runnable against the frozen baseline; behavioral changes may intentionally invalidate their exact timing in the new runtime, but must produce new input-earned proofs and preserve old save imports.

## 6. Test gates and incremental implementation order

All commands below are **for parent implementation/validation**, not executed in this audit. Keep generated evidence separate from source; timestamp it and identify runtime/source hashes and environment. Do not accept old `assets/data/release.json` claims as updated evidence automatically.

| Increment | Deliverable inside Emberwake | Required acceptance gate |
| --- | --- | --- |
| 0 — preservation inventory | Freeze original schema/IDs/behavior fixtures and all seven source hashes; distinguish authored baseline from Lumenblade experiment | Baseline source comparison; original v3 fresh/midrealm/backtracked/pre-final/completed-story/both-ending/rush/backup journeys represented. No Git/credential work by this audit. |
| 1 — identity/entry/build | Emberwake root, compatible former path, correct prefix URLs, Emberwake-only production build; truthful metadata/docs; intentional worker policy | Real HTTP `/` and `/Swordigo-V2/` boot exactly one `emberwake` App with all seven scripts and images; no Lumenblade root assets; no runtime errors/404/CSP issues. Old-entry smoke remains. Test old cached shell upgrade and cold offline only if offline is supported. |
| 2 — lifecycle/authority | Travel/rest/death/input priorities and save-success state explicit; consolidate selected wrappers one at a time | No-mutation denied travel; no post-death rewards/refill; boss lock; guard+dash/attack priorities; held/remapped input quarantine; pointer cancel; storage partial-failure and modal import races. Existing applicable 116 regressions preserved, with updated expectations only for intentional changes. |
| 3 — combat vertical slice | One differentiated guardian/enemy encounter and buffered combat extension using current Game/events/UI | Ordinary-input completion of affected original route at 60/120 Hz, all difficulty presets; attack one-hit-per-ID, one death reward, rear/front guard, occlusion, projectile reflection, mana/cooldown boundaries, parry expiry and stun targeting. Readable touch/keyboard/controller telegraphs. |
| 4 — platforming/exploration slice | One optional route/puzzle in an original realm; safe geometry authoring/validation | Coyote/buffer just before/after boundaries; short/full/double jump; drop-through; ceiling/wall/edge landing; dash thin-wall/arena gates; void/lava lethal/nonlethal preservation; safe respawn. Swept shots before adding thin blockers; carry/crush tests before moving platforms. Optional route clearable without main-route softlock. |
| 5 — persistent progression | Earned tactical ability/quest/loadout only after schema decision | Pure/idempotent v3 migration if v4; all old valid fixture imports; malformed/oversize/category/counter/progression rejection; completed ending/rush unlock preserved; no Lumenblade import crossover; failure/cancel/stale-file read leaves original bytes intact. Write/read/export/import round-trip preserves every new persistent field. |
| 6 — complete three-realm upgrade | Differentiated guardians and route/puzzle/quest progression across original campaign; updated goals/maps/journal | Input-earned full campaign proofs for both endings, rush, rates and difficulties; deterministic replay with new hash provenance; no state cheats in completion evidence; optional goals tested separately. Human pacing/discovery/balance review in addition to bots. |
| 7 — release candidate | Clean deterministic build + fresh browser/HTTP/update evidence + bounded known limitations | Preserve release/server security tests; updated root browser harness; denied storage/export/import/backup/multi-touch/orientation/controller disconnect/modal focus checks; measured desktop/mobile performance and real-device sampling. Public deploy/CI/physical devices are separate reported gates, not assumptions. |

Suggested targeted suites to add before features: `emberwake-physics`, `emberwake-lifecycle`, `emberwake-save-migration`, `emberwake-content`, and root/prefix/offline browser checks. They can remain dependency-free where practical. Do not introduce a new framework simply to rename working tests. Keep `test:campaign`'s observed-input/replay method; change its route/requirements deliberately for new authored content.

### Minimum release evidence ledger

For each gate report: command/environment, tested product/entry URL, source/build hashes, pass/fail/skip counts, input-only vs isolated fixture scope, and unresolved issues. No fabricated “production certified,” physical controller, cross-browser, FPS, human duration, security completeness, asset-rights or accessibility claims. Avoid unrelated model claims entirely. Existing license/trademark/asset-origin statements require owner review; they are not resolved by this audit.

## 7. Baseline hashes observed during this audit

These local hashes match the corresponding values stored in `assets/data/release.json`; the parent separately states that the seven files match the newly supplied source ZIP. Matching a stored manifest establishes provenance consistency, not current correctness or a new test pass.

| File in `assets/scripts/` | SHA-256 |
| --- | --- |
| `engine.js` | `687f8ed258fe56a7547bf221a95eadba3656a370980c63c9c2d40aaee4b0b4d2` |
| `client.js` | `4af52ca554f70971b70fb39db72f4f67fba75dbb7ee4937b3651c09d1992fbc7` |
| `worlds.js` | `11be3617782e2db4abb5d6efa996f667837374237d3956c1f4d9a90b68c4789f` |
| `core-v11.js` | `ab2982d747e072e8c12704be19eca158a5ed0c9650bf8c749ed4c34e2e7547d6` |
| `controls-v11.js` | `a4bb090df0e1095579c2fbb36d3191b001914c8c45c369aeaf0845bbcf4120d5` |
| `journey-v11.js` | `5adac3b3dc4374b98e5151455c125b5497c326ba2e65f580875d972899edf209` |
| `realm-v11.js` | `932b7b421984795cefaf5aa8ecc2ce1fa363224b06abaa7491e19032a985dc7d` |

## Parent handoff

Start with **root/build/worker identity**, then **lifecycle/authority and save contract**, then an **Emberwake combat-and-exploration vertical slice**. Expand that proven slice across the original three worlds before introducing mandatory campaign extension. The implementation must remain recognizably and structurally an evolution of the supplied engine/client/worlds, not a second game next to untouched “legacy” code.
