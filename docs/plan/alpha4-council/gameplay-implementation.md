# Next2 gameplay implementation — owned files frozen

## Cross-review and scope

Read experience, visual and reliability councils before implementation. Corrected my earlier diagnosis: presentation-v12 already appends per-realm journal statuses/routes; no duplicate implementation. Three optional rooms remain pre-ending, only Archive completion-gated. Guidance/client/roster changes belong to experience; art to visual; update failures and release clearance remain independent parent gates.

Only the five owned source/test files listed below changed. This handoff is the sole additional output. No Git, build, installation, authentication, browser, worker/index or unowned source/test edits. No baseline campaign controller modifications.

## Implemented interfaces

`EW.upgradePreview(progress, kind)` and `game.upgradePreview(kind)` are pure read-only projections. Null for absent progress/unknown kind. Returns:

```js
{ kind, level, nextLevel, cost, affordable, capped, goldAfter,
  current: {maxHP,maxMP,swordDamage,thirdStrikeDamage,boltDamage,
            lumenPerSecond,reflectedBoltDamage},
  next: /* same stats, or null at cap */,
  refill: {hp:true,mp:true,flasks:false} }
```

At cap: nextLevel/cost/next null, affordable false, goldAfter unchanged. Below cap with insufficient funds, goldAfter is hypothetical and may be negative; client should not label it an achievable balance. No purchase, events, storage, state mutation or rebalance. Tests compare actual effective engine+core+encounter combat (including reflected bolts, third-strike rounding and regeneration), all 20 ranks × three kinds × four levels, plus actual purchases/refills/caps/insufficient funds. Effect formulas in current wrappers do not multiply these values. Experience owner received exact API and accepted client integration.

`game.canChapterAbility(id)` is the shared read-only lamp authorization: playing story, correct active scene/source proximity, derived requirements, no combat, safe same-scene destination and no live/cached occupancy. Ability activation uses that predicate, resets traversal motion safely, emits `chapterAbility {id,fromX,toX}`, and grants no fact, reward, save, invulnerability or refill. Existing early Dawnstep remains usable without Engine defeat.

Experience owner added/froze `ch1:interaction:dawnstep-return`, x1950 feet590, from Archive recovery to existing entry anchor, requiring Dawnstep plus this journey's Engine defeat. It is not in persisted rosters. No anchor coordinates, save schema, original checkpoints, endings, prices, upgrade values or collision geometry changed.

## Tests and honest evidence

- `node --test tests/emberwake-upgrade-preview.test.cjs tests/emberwake-chapter-runtime.test.cjs`: **26/26 passed**. First run was 25/26: an isolated test tried to mutate frozen authored data. Corrected the test to supply a cloned data fixture; no gameplay failure or acceptance weakening. Cases cover both endings, locked/nonplaying/rush/remote/combat, missing/foreign/unsafe/occupied destinations, unchanged facts/vitals/cooldowns and old early lamp.
- Exactly **one** approved quick simulation, `run('mercy',1/120)` via exported runner: **PASS**, 21,691 frames. Chapter controller remains observation-only and runner whitelist unchanged. It earns Engine victory, walks to return lamp, uses ordinary E input, returns from x1929.881166642516 to x130 at frame20,929, then walks back to release the hours. Return must not complete the chapter or heal; assertions bound natural MP regeneration and preserve original canonical journey/economy. All prior room/delivery/seal/death/reload assertions remain.
- Quick action digest: `5b2b13378731ad003fda268615bccec67c42156d15a225eb522092be0d5cd402`. Frozen chapter-data hash before/after quick run: `d4521a5642cc461e0e2448ba56003a6f7b3a8e07bd0872d44d4ada2ecabe4d55`.
- No quick replay or full matrix run locally. Quick metadata is not a portable proof artifact; parent must generate full action traces with the existing CLI. Unit fixtures are explicitly synthetic, not earned journeys.

## Parent commands after integrated freeze

```sh
node --test tests/emberwake-upgrade-preview.test.cjs tests/emberwake-chapter-runtime.test.cjs
EW_CHAPTER_EARNED_OUTPUT=qa/correction/next2-final/earned node tests/emberwake-chapter-earned.cjs
```

Second command runs both endings × 60/120Hz and exact replays, including the new return check. Parent additionally owns full existing campaign/Gauntlet/save regressions, native input/UI and visual/device checks, source/build equality and release gates. Any subsequent data/runtime change requires fresh evidence. This work does not clear historical rollback/fixture failures, real devices/controllers, Safari/Firefox, human discovery/pacing, accessibility or rights review.

## Frozen owned-file SHA-256

- `assets/scripts/engine.js`: `c780eaf19f759eb1ce53b582d1e1df647356f6029103ada69a929ef23269a2dd`
- `assets/scripts/chapter-runtime.js`: `2cefaa3968d72cfed56ecb4655f61e85bda3b6b86c6feef9828fb23184015ada`
- `tests/emberwake-upgrade-preview.test.cjs`: `0879b9ff8062d1b5ad1c496dd0fef4de0e5f75350d7bbb40e35340735d23a553`
- `tests/emberwake-chapter-runtime.test.cjs`: `d8db78b261078af4017a44bfee27783e842700ba3da485484dd928f771cc1e3b`
- `tests/emberwake-chapter-earned.cjs`: `026bd5a1842a6b1a882a684cd773d518dbe028ea6cadb64a5649617a410b762e`
