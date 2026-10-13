# Emberwake correction design council

## Decision: deepen the supplied game, do not replace it

Upgrade **EMBERWAKE: The Hollow Crown** in place: Lyra, Aster, Mara, Tovan, Orin, Veyr, the three world-hearts, the painted realm plates, Canvas renderer, combat, checkpoints, and journey saves are the foundation. Lumenblade/Wren/its separate seven-biome campaign is not the requested sequel and is not the basis of this plan. Repository name `Swordigo-V2` is not a license or affiliation claim.

**Evidence labels:** “Observed” means source inspection or an explicitly named existing screenshot. “Reference” means public Swordigo description. Everything in sections 4–9 is an **original design proposal**, not functionality already implemented. No game code, Git state, credentials, build scripts, or downloaded code was changed or executed for this audit. Only this document was written.

## 1. Read-only source audit

### 1.1 Entry-point correction verified; packaging follow-through remains

**Observed at the final recheck:** parent has restored root `index.html` to **EMBERWAKE: The Hollow Crown**, loading the seven baseline scripts and Emberwake boot flow. The alternate candidate is archived at `assets/lumen-preview.html`. This resolves the earlier default-entry mismatch; it is not an outstanding blocker or a change performed by this agent. Keep the restored root and do not switch back to the replacement.

**Observed remaining:** `package.json` still names `lumenblade-second-dawn` and selects Lumenblade tests as its default; `ASSETS.md` contains documentation for both projects. Align package/build/cache/test/provenance documentation with the restored primary runtime. Inspect `sw.js` and bundling/build scripts before implementation; do not assume their cache/output routes follow the root correction. Keep the alternate candidate isolated, not an unrequested deletion.

### 1.2 Baseline worth keeping

| Evidence location | Observed capability | Keep / improve |
|---|---|---|
| `worlds.js:4–51` | Moonroot Vale (4800 units), Cinderworks (5200), Hollow Spire (5600); each has two runes, two caches, three beacons, two shrines, one NPC, one boss, eastern exit | Retain IDs, major destinations, story anchors, and discoveries. Expand topology, not merely width. |
| `engine.js:10–28` | Variable-height double jump, 0.11 s coyote window, 0.13 s input buffer, one-way platforms | Keep feel constants as baseline; calibrate new geometry against them. Do not lock away the already-available double jump. |
| `engine.js:102–107,174–181` | Three-stage sword combo, lumen bolt, invulnerable dash, blade/heart/focus attunement | Keep all basic moves available. Add ability-specific interactions rather than resetting Lyra to a helpless new character. |
| `core-v11.js:22–35` | Precision guard/reflection, stun/recovery feedback, explicit beacon rest, preserved fall damage | Keep skill expression and accessibility; test it with new hazards. Guard is not a lava/fall solution. |
| `client.js:23–89` | Canvas 2D scene, procedural articulated hero/enemies/bosses, palette terrain, glow/particles, horizontal camera | Improve those functions. No WebGL/Three.js rewrite is necessary. |
| `realm-v11.js:3–8` | Three painted region plates over procedural skyline, limited plate shift, parry flash and conditional minimap | Keep artwork; revise contrast and compositing order. |
| `client.js:112,132` | Travel between visited realms already exists; discoveries remembered, disabled during bosses/rush | Backtracking is supported, but destinations/returns need better state and discoveries. Do not claim it is absent. |
| `journey-v11.js:4–18` | Import confirmation, rolling backup, export, local milestones | Preserve recovery/focus safeguards; update content assumptions. |

### 1.3 Why the adventure currently feels thin

**Observed from `worlds.js`:** all three acts use almost the same arrangement: opening NPC/shop, three broad ground gaps, paired two-step rune climbs, another cache climb, then guardian and eastern exit. Width and hazard color differ; exploration logic rarely does. The initial NPC is at x=275 in each realm; general floors remain y=590 and raised shelves mostly y=480/370. Six rune collectibles are campaign keys, not differentiated discoveries.

**Observed from `engine.js:149–169`:** bosses share an alternating charge/non-charge controller; Warden and forge boss use slam, Regent substitutes rain, and low health modifies timing/speed. Their silhouettes differ more than their decision patterns. Add carefully telegraphed region-specific moves, not three larger health bars.

**Observed from `engine.js:71–74`:** defeated ordinary enemies remain absent on reload through `flags.defeated`. This respects progress but makes returns empty. Add authored one-time changed-world encounters, not unconditional respawn farming or retroactive loss of kills.

**Observed from `client.js:133,142`:** journal is lore/statistics, not an actionable quest log. HUD objective is hardcoded from rune count/boss state/east gate. It cannot yet explain branching errands, a destination, or a newly available return route.

### 1.4 Architectural constraints that the design must respect

- `progress.level` is a numeric campaign index. Renderer terrain/skyline, plate lookup, HUD act labels, exit progression, boss rewards, ending checks, and save validation use it. **Do not append side dungeons into `EW_LEVELS` casually.** Keep the three main campaign indices stable and introduce nested room IDs within those regions.
- `core-v11.js:6–16` infers progression from the furthest seen index, requires all preceding bosses/runes, and assumes completion in the last level. That rule fits a line, not arbitrary region exploration. Update validation intentionally with migration and dependency tests.
- `getSolids()` and `finish()` assume exactly two runes for a guardian/final completion. Keep the original six mandatory world-rune IDs; new quest seals use another collection, not counterfeit extra sigils.
- `current.npc`, `current.exit`, one boss, and arrays of specific object types are current contracts. Supporting hubs/multiple doors/NPCs requires actual data/simulation/rendering work, not just adding text to the journal.
- Camera/rendering have a 720-unit logical height and horizontal scrolling. First expansion should use **screen-sized linked rooms with local vertical platforms**, not a huge vertical tower whose camera cannot follow. Defer vertical camera overhaul until justified.
- `loadLevel()` fully restores player resources and creates a new room encounter. Map travel already uses it. New room doors must separate ordinary room transitions from explicit rest/travel; otherwise every door becomes a free heal and fight escape.
- `journey-v11.js` cache award, codex counts, ending cache totals, two-rune HUD, act array, and map markers are fixed-count assumptions. Replace new-content denominators with schema-derived totals while preserving the original-six-letter milestone.
- Existing prototype wrappers depend on load order. Do not add more hidden wrappers for every new subsystem; expose narrow engine/render/app hooks and keep old wrappers working until tested consolidation.

## 2. Existing visual evidence and asset audit

### 2.1 Inspected evidence, not a new playtest

Individually inspected `qa/legacy-http/landscape-game.png` (844×390) and `portrait-game.png` (780×1688). These are Emberwake frames, not `qa/lumen` replacement screenshots. Their capture timestamp/current input state was not independently verified; use them as baseline visual evidence, not proof of today's executable behavior.

- **Landscape:** excellent painted scenery and atmosphere, but Lyra occupies only roughly 25–30 display pixels vertically in the scene. The environment is much richer than the near-flat geometric ground. HUD, region heading, objective, central welcome toast, and dialogue prompt all compete. Keyboard-like action boxes consume a full lower strip.
- **Portrait:** Lyra is more readable; the pointed tunic, warm scarf and Aster light already form a distinctive identity. Large toast and interaction prompt occupy separate central bands. Large controls/footer leave substantial unused vertical space. “Speak to Mara” appears well above Mara, weakening spatial association. The floor repeats large dark polygon blocks, visually unlike the detailed painted ruins.
- **Both:** the artwork suggests deep floating-island exploration while gameplay sits on a long horizontal strip. This is a composition/topology mismatch, not a reason to throw away the images.

Existing `qa/legacy-http/browser-results.json` reports 53 passed checks; `qa/emberwake-qa-results.json` describes engine-only story-difficulty simulations. The inspected engine/worlds/core SHA-256 values match the corresponding three recorded hashes. That supports attribution of that simulation evidence to those modules, **not** fresh browser/input performance or successful extended-campaign tests. Nothing was rerun here.

### 2.2 Current image inventory

All four region/panorama images are **1672×941 RGB**, opaque full-scene plates—not sprites, transparent cutouts, terrain tiles, collision masks, or separate depth layers.

| File | Inspection / intended retention |
|---|---|
| `assets/images/moonroot_hd.webp` | Individually viewed: blue-green nocturnal forest, waterfalls, turquoise river, enormous moon/castle. Retain as Moonroot distant environment; tree/river landmarks can orient return journeys. |
| `assets/images/cinderworks_hd.webp` | Individually viewed: warm foundry, hanging chains/lamps, clock/gear landmarks, lava falls. Retain; its prominent detailed chains are background decoration unless deliberately matched by new collision geometry. |
| `assets/images/hollowspire_hd.webp` | Individually viewed: pale floating architecture, gold sunrise, clouds, overgrown arches. Retain, but pre-restoration lighting needs a cool veil so an already-bright sunrise does not contradict the sleeping Dawnheart. |
| `assets/images/emberwake_panorama.png` | Dimensions/source usage verified; not individually visually evaluated in this pass. Keep title/fallback role; do not assert its appearance from the filename. |

`realm-v11.js` currently paints the plate after the original procedural skyline, with menu alpha .98/gameplay .64, then a lower veil. This reduces the visible independent parallax layers. A monolithic image cannot acquire correct physical depth through three offsets; retain it as a distant plate and place sparse existing procedural silhouettes in front. No fabricated “layer extraction complete” claim.

## 3. Swordigo reference versus Emberwake proposals

**Reference:** Touch Foo's public description emphasizes running/jumping/fighting through a broad adventure, towns/dungeons/treasure, XP/leveling, weapons/items/spells, atmospheric lighting, and customizable precise touch controls. Those support the goals of readable action, distinct destinations, exploration rewards, and mobile ergonomics.[^http://www.touchfoo.com/swordigo] The Google Play listing also explicitly advertises exploration and XP progression.[^https://play.google.com/store/apps/details?hl=en_US&id=com.touchfoo.swordigo]

Those descriptions do **not** substantiate exact input timings, map topology, progression order, physics constants, boss cadence, or playtime; this audit does not invent those facts. The linked rooms, ability gates, characters, quests, timings and art directions below are original Emberwake proposals, not copied Swordigo designs. No proprietary sprites, music, maps, dialogue or source were obtained. Public release must retain the existing non-affiliation statement and owner provenance review.

## 4. Original story extension: a future must remain unwritten

**Proposed working chapter label:** “Emberwake — The Unwritten Roads,” within The Hollow Crown, not a new branded replacement.

### Preserve the existing emotional spine

Lyra delivers a letter addressed to who she might become. Aster guides her through the stolen Rootheart, Forgeheart and Dawnheart. Mara wants growth, Tovan wants children to grow up, Orin records denied possibilities, and Veyr imprisoned the future to avoid loss. Keep the original confrontations and mercy/rekindle ending choice.

### Expand causes, consequences and relationships

Restoring a heart does not instantly make every broken connection safe. Ancient crown mechanisms distribute “approved” futures along damaged conduits. Lyra discovers that villages need room to choose their own lives—not a courier making everyone's choice for them.

- **Moonroot:** Mara's orchard contains seeds addressed to children not yet born. The Warden guards that possibility, not merely the eastern gate. After its defeat, a visible bud opens and one local route grows back.
- **Cinderworks:** Tovan has saved one coal bearing his daughter's first summer. He needs the furnace diverted from consuming lives to warming living homes. Lyra helps him reconnect an old cooling channel, then returns its key to Mara's frozen cellar: fire and growth depend on each other.
- **Hollow Spire:** Orin's archive lists futures as decrees. Lyra gathers ordinary testimony from garden and furnace, not royal permission. Veyr's grievance remains understandable without being excused.
- **Epilogue after either ending:** an **Archivist Engine**, a nonhuman residual crown mechanism, continues assigning one compulsory future to each household. This is an original new threat, not resurrected Veyr or a fourth stolen world-heart. Lyra breaks its claim through returned letters and a local final encounter. Mercy permits a remorseful Veyr annotation; rekindle gives Orin that role. Neither ending is declared noncanonical or mechanically inferior.

Example proposed dialogue: Mara, “A seed is not a promise that nothing will hurt. It is permission to begin.” Tovan, “Keep the coal. Bring back the summer.” Lyra, “I will deliver the letter. You decide what comes after.” Short exchanges should trigger at changed landmarks, not interrupt every corridor.

## 5. Region topology and purposeful backtracking

### Main campaign graph

Keep the main indices `moonroot=0`, `cinderworks=1`, `hollowspire=2`. Nested identifiers below are proposed room IDs, not new campaign array entries.

```
Moonroot / courier_landing ↔ lantern_hollow ↔ canopy_run ↔ crownless_watch [Warden]
                      ↘ rootcellar [Cinderseal return gate] ↗
                      ↘ millpond [Rootbinding optional loop] ↗
Warden → Cinderworks / cold_anvil ↔ hourglass_bridge ↔ gantries ↔ titan_threshold [Hour-Eater]
                                    ↘ cooling_gallery [Cinderseal trial] ↗
Hour-Eater → Mara/rootcellar → Seasons Charter → Spire / broken_observatory
Spire / broken_observatory ↔ unwritten_hall ↔ last_threshold [Veyr]
                     ↘ star_archive [Dawnstep epilogue] ↗
Seen main beacons connect by map travel outside encounters; unvisited doors require local discovery.
```

**First-visit goal:** 12–18 minutes per main act, 45–65 minutes for the revised core story; optional/epilogue content 20–35 minutes. These are playtest targets, not measurements of the current build. Scope first slice to one Moonroot loop; do not pad to hit a number.

### Region identities and concrete room recipes

- **Courier's Landing:** retain x=150 beacon, Mara at x=275, first shrine/cache identity. Build a small delivery courtyard and sheltered tutorial lane, not a new disconnected town. Show locked cellar in the first three minutes with a frost-and-furnace symbol and journal pin.
- **Lantern Hollow/Canopy Run:** reuse current x≈1060–1420 and x≈2060–2430 climbs as route junctions. A ground lane is safer but misses letters; a canopy lane offers combat spacing and a shortcut back to the hollow. Keep original rune IDs and cast-then-collect lesson. Use a separate side-room entrance near the x=1930 beacon instead of obscuring original collectibles.
- **Millpond:** optional 900–1200-unit room with three terraces. Rootbinding grows a bridge at marked root sockets, exposing an irrigation letter and opening a one-way gate back to Lantern Hollow. Returning after Cinderseal reveals a thawed sluice, not identical terrain.
- **Cinderworks/Gantries:** keep original molten gaps, but interleave a timing route over piston-like ledges with an alternate longer maintenance path. First implementation uses authored timed solid segments, not untested general-purpose moving-platform physics. A cooling valve visibly changes the safe route; lava remains lava elsewhere.
- **Cooling Gallery:** 900–1200-unit loop off Hourglass Bridge with three visible vents, one cold alcove, and a bypass lever on the far side. Telegraph active/inactive states by shape, hiss and timing, never color alone. Tovan's letter and the ability tutorial are not behind an unrelated purchase.
- **Hollow Spire:** linked observatory/hall/chamber screens create a tower ascent without changing the vertical camera. Broken constellation rails and distinct door landmarks communicate elevation. The archive route is visible but marked dormant until Dawnheart restoration.
- **Star Archive:** 1200–1600-unit optional epilogue room; Dawnstep traverses marked broken rails, three returned testimonies disable the Engine's compulsory-decree shield, then a compact encounter ends with delivery rather than another heart hunt.

### Return rules

One required return after Forgeheart: map travel to Lantern Hollow, thaw Mara's nearby Rootcellar, then return through an opened cellar exit/beacon. Target **under 90 seconds of compulsory replay traversal**, excluding new room/action/dialogue. No walking the full 4800 units again. Unlock the shortcut before requiring the return hand-in. Optional branches take roughly 3–6 minutes and end near a known beacon.

New enemies on returns are **new authored IDs tied to story phase** (e.g. `m-return-wisp01`), with one-time rewards and persistent defeat flags. Old defeats/caches remain remembered. Region restoration changes at least one route, one NPC exchange and one environmental landmark, not merely tint.

## 6. Quest and progression specification

### Ability plan: do not revoke basic moves

| Ability | Acquisition | Mandatory use | Earlier-region value / safeguards |
|---|---|---|---|
| Existing sword, bolt, double jump, dash, precision guard | Available from start as now; stagger tutorial messages only | Existing six runes, combat and gaps | Existing saves preserve them. No generic wall-jump retrofit needed. |
| **Rootbinding** | Automatically with Rootheart/Warden victory | Grow the broken root causeway at Cinderworks approach | Optional Millpond loop and canopy shortcut. Activate only at carved sockets; no arbitrary platform creation. No MP softlock: socket interaction is free. |
| **Cinderseal** | Automatically with Forgeheart; practice in Cooling Gallery | Thaw Rootcellar and recover Seasons Charter for Spire entrance | Open vent bypass/cache in Cinderworks and thaw Millpond sluice. Does not grant universal lava immunity; acts on explicit marked seals. |
| **Dawnstep** | Automatically with Dawnheart/Veyr defeat | None before the original ending; used for epilogue Archive | Existing dash gains a contextual rail-crossing mode at marked constellation anchors. Preserve ordinary dash cooldown/invulnerability. Land at a validated safe anchor, not arbitrary teleport. |

No critical ability is sold, hidden in an optional cache, or consumed. XP and ember attunements support combat survivability, not access permissions. Returning-veteran saves receive heart-earned abilities during migration.

### Quest state model

Use stable IDs and monotonic states `unseen → active → ready → complete`; prerequisite events can make an unseen quest ready without forcing an NPC conversation first. Store unique deliveries/ability grants/rewards atomically with the state transition. Quest items are nonconsumable facts, not ordinary gold inventory. Journal shows giver, destination, next action, and blocked-by condition. Track one HUD quest, not six simultaneous sentences.

| Proposed quest ID / title | Prerequisites and giver | Destination and action | Reward / completion and return |
|---|---|---|---|
| `q_first_spring` — The First Spring | Start; Mara | Original Moonroot runes and Warden | Rootheart + Rootbinding once; Mara's bud opens. Preserve original boss gold/XP, do not double-grant. |
| `q_water_remembers` — Water Remembers (optional) | Rootbinding; Mara | Millpond: grow socket bridge, restore irrigation lever, collect letter | 60 embers once; garden testimony; gate back to Lantern Hollow. Hand-in at Mara or auto-ready if already collected. |
| `q_hours_home` — Bring the Hours Home | First Spring; Tovan | Gantries runes and Hour-Eater | Forgeheart + Cinderseal once; cooling state persists; existing eastern route now points to Charter requirement. |
| `q_seasons_charter` — A Season of Our Own | Forgeheart; Tovan, automatically recorded at victory | Travel to Mara; thaw Rootcellar, retrieve her original garden ledger, speak to Mara | Seasons Charter; opens Spire entrance; short return exit to beacon. Not dependent on optional irrigation quest. |
| `q_daughter_summer` — The Summer Coal (optional) | Cinderseal; Tovan | Cooling Gallery: divert marked vents and recover coal | Furnace testimony + 80 embers once; Tovan's dialogue changes. No escort AI or survival timer. |
| `q_unwritten_names` — The Unwritten Names | Charter; Orin | Original Spire runes and Veyr; choose mercy/rekindle | Dawnheart + Dawnstep; original ending retained; begin epilogue only by explicit “Continue deliveries” choice. |
| `q_open_letter` — An Open Letter (epilogue) | Story complete; Orin/Aster | Finish optional garden/furnace testimony, obtain Orin's witness page; bring all three to Star Archive; disable decrees and defeat Engine | Delivery epilogue, no fourth heart. Player can leave to finish missing testimonies; never lock them inside the Archive. |

**Dependency proof obligation:** Rootheart → Cinderworks → Forgeheart → Rootcellar → Charter → Spire → Dawnheart → epilogue. Garden and furnace testimony sit only on the epilogue branch. No Dawnstep-dependent objective awards Dawnstep; no quest relies on an NPC being spoken to before an item was found. Missing gold cannot halt main progression.

## 7. Combat and art direction using current systems

### Improve the encounter grammar

Keep the existing enemy trio as readable roles: crawler teaches close timing, sentinel teaches frontal guard/dash, wisp teaches ranged priority. New arrangements should vary safe ledges, approach direction and pairing; avoid placing projectile threats immediately beyond a blind door.

- Warden: retain charge/slam; add a root-socket tell and one temporary lane obstruction in phase two. Ability reward follows victory, so the fight cannot require Rootbinding. Preserve the existing dash-through-charge lesson.
- Hour-Eater: retain charge/wave; add alternating vent lanes with safe alcoves. Telegraph for at least the current story/adventure warning duration before first activation. Cinderseal is awarded afterward, so vents must remain avoidable with basic moves.
- Veyr: retain falling-light markings; add a clear safe central/outer-lane alternation, not unpredictable rain. Maintain a deliberate recovery window and readable staff pose.
- Archivist Engine: reuse controller infrastructure with its own original mechanical silhouette, three seal markers and a decree beam. Start with one new move plus supported waves, not a new combat framework.

Treat hit-stop (initial proposal 35–55 ms) and attack snap as experiments; freeze simulation deliberately if adopted, not browser input/audio/save timers. Reduced-motion disables camera impulse and trailing effects while preserving enemy pose, labels and hazard timing. Keep 0.19 s precision guard/.62 s cooldown baseline until real-device tests justify changes.

### Art direction: painted distance, illustrated foreground

1. **Keep the four images.** They are reusable atmosphere, not a failed asset library. No new full-plate generation is required for first slice.
2. **Reorder layer composition:** palette sky → distant plate → low-detail procedural midground → restrained atmosphere → collidable terrain/objects → combatants → bounded effects → readable UI. Use the current `skyline`, `terrain`, `hero`, `enemy`, `boss`, `object` functions.
3. **Prevent false geometry:** background bridges, waterfalls and hanging chains remain softer/lower contrast than collidable shapes. Use a consistent solid top-edge material for real platforms. Never draw a bright decorative floor edge that invites a fatal landing.
4. **Foreground material kit:** Moonroot uses root arcs/moss breaks and irregular rock seams; Cinderworks riveted girders, cooled slag, valve notches; Spire pale fractured masonry, engraved constellations and cloth. Replace giant repeating floor polygons with 2–3 reusable Canvas motifs per biome; no need to turn the opaque plate into terrain textures.
5. **Lyra stays Lyra:** preserve scarf, green tunic, asymmetrical sword silhouette and Aster. Improve planted feet, pelvis/shoulder counter-rotation, attack anticipation/recovery and landing compression in the existing drawing routine. Add a restrained dark contour and warm rim, not an unrelated shiny 3D hero. Visual scaling must track collision/camera expectations; don't silently stretch the hero inside unchanged hazards.
6. **Region restoration:** Moonroot adds new buds and a grown socket bridge; Cinderworks dims the life-consuming furnace and opens cooling valves; Spire transitions from cool overlay to dawn. Do not repaint the plate each frame or use full-screen flash as the only signal.
7. **Plates as subregion context:** reuse per-room crops with stable framing around the moon/water, great gear and observatory. Crop selection creates local identity, not claimed multilayer artwork. Existing modest plate drift is sufficient; avoid amplified parallax nausea.
8. **UI reduction:** suppress repeated welcome toast after a short nonblocking interval; replace always-visible regional title/subtitle with entrance title then compact location. Put interaction prompt near the object or in one consistent lower safe band. Use concise next-step objective and numeric ability labels.
9. **Mobile:** do not solve tiny actors by merely enlarging button chrome. Prototype a gameplay camera viewport that shows Lyra at **at least 36 CSS pixels body height** in 844×390 landscape, with hazard/landing lookahead preserved. Keep the 720-unit simulation; alter presentation framing only after proving that telegraphs and landing surfaces remain visible. Portrait gets compact HUD/controls and room-specific zoom, not forced landscape lock.
10. **Controls:** 44×44 CSS-pixel minimum target, clear Jump/Sword/Magic/Guard labels, configurable layout where already supported. Replace font-dependent empty-square-looking symbols in evidence frames with existing Canvas/SVG-authored simple UI icons plus labels—not borrowed commercial icons. Contrast is measured, not assumed from hex colors.

## 8. In-place implementation sequence and save compatibility

These are future changes, not performed by this audit.

| Order | Work and likely ownership | Exit gate |
|---|---|---|
| 0 | Keep parent-restored Emberwake root; verify remaining build/cache/package identity; preserve seven baseline modules and archive current behavior evidence | Default URL and built/offline artifact open Emberwake, original artwork loads, title/noscript/metadata agree; no alternate-runtime substitution. |
| 1 | `worlds.js`: one Moonroot branch and stable room/door IDs; `engine.js`: room transitions/object interactions; `client.js`: room drawing | One full loop with original rune/boss route still playable. No new framework. |
| 2 | Save/schema migration in `engine.js`/`core-v11.js`; quest state and reward events; preserve `journey-v11.js` import safeguards | V3 original saves, completed saves and backups migrate predictably; invalid dependencies rejected. |
| 3 | Rootbinding/Cinderseal/Dawnstep contextual interactions; expand Cinderworks/Spire; journal/HUD/map | All main gates have reachable ability source and explicit fail message. |
| 4 | `client.js` + `realm-v11.js` materials/compositing/pose/readability and control styling | Before/after visual checks for all three realms and mobile sizes. |
| 5 | Authored return encounters, differentiated boss phases, opt-in postgame | Core and both endings unchanged in meaning; postgame can exit safely. |
| 6 | Update `journey-v11.js` milestones, dynamic totals, QA docs/build/provenance | Exact-source campaign and real-input browser acceptance evidence, not screenshots alone. |

### Migration design

Keep original `EW_STORY_V3` and backup untouched until a valid new-version save has been produced and explicitly committed. Proposed V4 adds `roomId`, `checkpointByRegion`, abilities, quest states, delivery facts, world-state events and epilogue status. Keep numeric `level` for original regions; don't derive campaign order from arbitrary room discovery. Map travel returns to an unlocked selected beacon, not an unseen free destination.

On V3 import: preserve difficulty, rank, XP, gold, upgrades, all old flags/statistics, checkpoint and ending. Infer Rootbinding/Cinderseal/Dawnstep only from their actual defeated boss/heart facts. Original valid completed journeys retain completion and ending; offer continuation separately. Already-seen Spire journeys are grandfathered through Charter permission without charging/replaying required backtracking; mark compatibility provenance internally. Fresh V4 journeys enforce Charter. Validation must distinguish a legacy entitlement from a fabricated new save.

Separate `storyCompleted` from `epilogueCompleted` and playing/won UI state; continuing after original ending cannot erase it. Transition saves commit destination room/checkpoint only after validation; death restores a known safe beacon and retains deliveries. Unique rewards and quest completion write together so reload cannot duplicate embers/abilities. Rush remains its three-original-guardian mode, independent of Charter/side-room requirements and postgame content.

## 9. Acceptance criteria and rejection gates

### Functional / narrative

- Default entry point, offline entry and exported artifact boot Emberwake with Lyra/Aster and the supplied images. A separate game passing tests is **not** acceptance.
- Preserve all six original world-runes, original boss identities, both mercy/rekindle outcomes, remappable keyboard/touch/controller operation, three flasks, guard, backup/import/export and owner notices unless a specific approved change is documented.
- Each region has at least one genuinely playable loop/branch, one distinctive landmark and one persistent restoration change. Three longer copies of the same two-platform climb fail.
- Main dependency graph has no circular gates. Test every ability socket before unlock, after unlock, on reload, after death and from a migrated save. Required abilities/Charter never depend on optional purchases or optional testimony.
- Quest reward fires exactly once; collecting before talking, leaving/reentering, dying, and importing preserve valid progress. HUD/journal/map point to the same current destination and requirement.
- Required Mara return includes new cellar action and changed dialogue/route; compulsory already-cleared traversal is under 90 seconds in timed human play, excluding new content. Opening the map does not permit undiscovered travel or boss escape.
- Original defeated enemies remain defeated. New return encounter IDs award once and cannot be farmed by room-door cycling.
- V3 fresh/mid-Moonroot/mid-Cinderworks/Spire/completed-both-endings/rush saves and rolling backups are covered. Inconsistent flags and unknown IDs reject without clobbering the active journey. Ordinary doors do not refill HP/MP/flasks or remove live combat state as an exploit.

### Visual / usability

Capture Emberwake (not Lumenblade) at 1440×900, 844×390 and ~390×844 CSS viewports. Include all three region entries, one branch each, rune interaction, guardian wind-up/recovery, damage, return-state change, map, journal, shop, dialogue, ending and low-quality/reduced-motion modes. Label logical/CSS/image pixel dimensions; the existing 780×1688 PNG is not evidence of a 780-CSS-pixel phone.

- Landscape Lyra body ≥36 CSS px in proposed camera presentation; visible landing surface and incoming attack remain readable without camera snap. If that target fails with the fixed-height view, revise framing—not collision jumps or unsupported claims.
- At every captured state, HUD/toast/prompt/controls do not cover Lyra, nearby landing hazard or mandatory boss warning. No simultaneous central welcome toast and interaction instruction crowding the route.
- Actual text contrast ≥4.5:1, meaningful controls/boundaries ≥3:1; state also conveyed through shape, pose, icon/label or sound. Minimum 44 px touch targets with no overlapping hit areas; essential displayed text ≥14 CSS px where feasible.
- Real platform top edges align with collision within 2 logical pixels; decorative plate arches cannot be mistaken for intended immediate footholds in review. Foreground material families visibly match their realm.
- Reduced-motion keeps threats understandable with static markers and timings; low quality preserves mechanics and silhouette, not merely more empty scenery. Missing plate falls back gracefully without failing play.

### Feel, performance and honesty

Measure on a named desktop and midrange phone before and after the slice. Target 60 fps desktop/30 fps minimum mobile, p95 frame budget ≤16.7/33.3 ms respectively during worst tested battle, with input-to-visible response ≤100 ms on supported real devices. Those are proposed thresholds, **not** verified results. New room loading must not freeze held-input sampling or produce phantom jumps/guard on modal close. Test touch diagonal/run+jump/attack combos and controller reconnect, not just programmatic simulation.

Run real-input campaign checks for all difficulty modes and both endings plus opt-in epilogue, alongside engine/save tests. Record code hashes, browser/device, viewports and failures. Existing rapid scripted completion counts do not establish enjoyable pacing. A council review should watch one first-time player navigate an ability return without verbal help and one returning player identify what changed.

**Reject delivery** if it ships a renamed replacement, discards the usable painted assets, copies Touch Foo content, claims official sequel status, substitutes generated screenshots for actual game frames, breaks saved journeys without disclosure, or marks unrun tests as passed.

## Source record / limits

Primary evidence: supplied `assets/scripts/{client,worlds,realm-v11,engine,core-v11,controls-v11,journey-v11}.js`, root `index.html`, `assets/legacy.html`, `ASSETS.md`, `package.json`, four image metadata records, three individually viewed realm images, two individually viewed Emberwake screenshots, and the two named QA JSON files. Line references refer to this minified-line baseline and may shift after edits.

Public reference URLs above are evidence of advertised Swordigo features only. `plan/repos.md` is an unrelated broad repository list and was not treated as authority for game design, nor used to download/run tools. At final recheck, all seven script SHA-256 values independently matched `/data/work/provided-emberwake/assets/scripts/`, the supplied ZIP extraction identified by the parent. The ZIP archive itself was not executed or opened by this audit. No new runtime, performance, browser or completion test was executed. This is a grounded correction design and implementation acceptance plan, not a claim that the upgrade is built.
