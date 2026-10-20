# Next experience council — plan only

Reconciled with parent brief: published main `e5687c9`, alpha.4 improvement branch; current source paths rechecked.

## Current experience and evidence

Preserve EMBERWAKE’s original Lyra/Aster story, three realms, six runes, guardians, both endings, art and saved journeys. This is an original adventure continuation, not an official Swordigo sequel. No replacement campaign or engine is justified.

The shipped `index.html` loads `assets/scripts/*`, not the parallel `src/` application. Findings below concern that user-facing chain.

**New player:** Begin journey → difficulty → Moonroot’s three-line introduction. Controls teach double-jump and casting at then collecting runes; HUD largely repeats “Release two world-runes.” Remappable controls, guard, optional named cache routes and nearby interaction prompts already exist. Journal presents realm lore, statistics, every optional room name and a delivery checklist. Aster advice is behind Journal and currently prioritizes optional deliveries even on an unfinished main-road journey (`client.js:153–185`, `controls-v11.js`, `presentation-v12.js`, `chapter-data.js:289–300`). The missing piece is coordinated next-action guidance, not another controls manual.

**Returning player:** Continue resumes unfinished journeys with a generic welcome. A completed journey instead opens its ending screen; “Continue deliveries” explicitly resumes the preserved chapter anchor or Moonroot (`client.js:129,153,171,175`; `chapter-runtime.js:27`). Ending-aware acknowledgements, committed-repair scenery and precise mechanism advice already exist; do not sell their reimplementation as new value.

**Timing correction:** Four rooms exist, but they are not all post-ending-only. Millpond, Cooling Gallery and Rootcellar have unrestricted entrance requirements; only Star Archive requires completion (`chapter-data.js:73–85`). Native fresh-journey Water delivery independently corroborates this. Keep this early exploration; describe Archive as the post-ending continuation.

**Evidence limits:** `qa/correction/next-final/validation.json` reports four full ordinary-input earned simulation cases, not human/browser pacing proof. `chapter-browser/report.json` demonstrates fresh native-key Water delivery; its two ending routes use completed-import fixtures. `next-final/visual-inspection.md` covers injected rendering fixtures, not discovered routes. Historical `next-experience-result.md` says the runtime hook was pending; current `chapter-runtime.js:33–34` contains it. Human discovery remains unproven. Nothing was launched or retested for this council.

## Three bounded priorities

### 1. One journey-aware next action, taught where needed

Replace competing HUD/advice/checklist recommendations with a shared pure selector: `deriveNextAction(base, chapter, context) → {track, stage, text, target, reason}`. Default unfinished main roads to campaign progression: release a sealed rune → collect its light → second rune → guardian → world-gate. Inside optional rooms retain local valve/item/return guidance. No hints inferred from awards, elapsed time or rush unlocks.

Use the existing objective slot for one concise contextual cue, not another overlay, toast stream or automatic dialogue. Change only when the meaningful stage changes; announcements must not repeat every HUD tick. Use the actual keyboard binding or touch/controller action label. Explain release-versus-collection when relevant; explain guardian recovery only during that encounter. Reopen through existing Aster advice. No forced tutorial sequence, timers, saved hint history or extra combat interruption.

**Ownership:** narrative owner: `chapter-data.js` selector/copy; client owner: `client.js` HUD/advice; input owner: `controls-v11.js` action-label helper, no binding changes. Preserve `deriveObjectives` and `selectStory` contracts.

**Acceptance:** fresh input-only player can identify and perform the next rune action without opening Controls; optional-room guidance changes immediately on exit. Remapping updates cue labels. **Negative:** released-but-uncollected rune never counts as collected; all browser awards on a fresh journey change nothing; rush receives no chapter advice; opening advice changes no state/resources.

### 2. Make exploration navigable, not a global shopping list

Add an explicit Campaign / Optional deliveries journal distinction and a session-only “Follow this delivery” choice. The selected task supplies recipient, carried-versus-delivered status and the next legal door/road step on HUD and Map. Label existing map doors by destination and lock reason. Distinguish discovered rooms from unknown leads; stop printing all room names as if discovered. Preserve a small authored invitation to the nearest available optional door.

Route over existing paired doors plus runtime-authorized realm travel; do not draw direct travel to rooms. Discovery must not require a hidden persistent quest flag. Clear/recompute selection on journey switch/import; default back to campaign outside optional rooms before the ending.

**Ownership:** narrative/data owner: `chapter-data.js` route descriptors using existing IDs; client owner: `client.js` journal/map/HUD; runtime owner: `chapter-runtime.js` read-only route-eligibility adapter. `journal-v12.js` retains original cache-letter statuses.

**Acceptance:** native-input Water pickup → recipient → delivery with Map guidance; Charter return identifies Orin, not merely “find item.” **Negative:** locked Archive, combat-blocked travel, unknown destinations and disconnected rooms never receive usable travel buttons; selection grants no discoveries, rewards or teleports. Door traversal still never refills flasks.

### 3. Give the continuation a playable dramatic frame

On completed title saves, offer distinct “Revisit ending” and “Continue deliveries” actions. Both use validated existing resume/continuation authority; neither starts a new journey. At continuation, replace the generic toast with a nonblocking bridge: “The hearts are free. Now help their keepers rebuild; the Archive waits on the Spire road.” Pair it with one local next action, honoring repairs already made. Do not replay dialogue on every door crossing.

After releasing Archive hours, direct the player optionally back to Lyra’s existing open-letter desk. Re-reading becomes a short outcome-aware coda naming actual repairs, acknowledging unfinished ones, and retaining mercy/rekindle nuance. Existing recipient scenery makes the return walk consequential. No mandatory delivery sweep or new ending/reward/schema.

**Ownership:** client owner: `client.js` menu/dispatch; narrative owner: `chapter-data.js` continuation/coda responses; runtime owner: `chapter-runtime.js` existing finish/open-letter dialogue contexts.

**Acceptance:** both endings resume saved anchors; coda differs with partial/complete repairs and remains readable. **Negative:** no false publication, signature, death or delivery claims; no reset of ending/checkpoint/campaign statistics; persistence failure never acknowledges repair.

## Integration and gates

Cross-council correction: `presentation-v12.js` already appends `EW_JOURNAL.read` per-realm statuses and named routes; improve selection/wayfinding, do not rebuild those. Parent should assign one `chapter-data.js` writer for gameplay/experience proposals and one client writer, avoiding independent wrappers.


Risk: more prose masquerades as depth. Mitigation: accept only playable guidance, destination selection and an in-world return coda; no documentation milestone. Risk: spoilers/competing objectives. Mitigation: local-first discovery and explicit track choice. Risk: wrapper conflicts or stale imports. Mitigation: one selector, named interfaces, recompute on resume, parent-owned integration. Parent gates source tests, earned-input routes, native fresh/returning discovery and portrait/controller review separately; fixtures cannot certify discoverability. Existing release/repeatability holds remain independent. Parent decides implementation.
