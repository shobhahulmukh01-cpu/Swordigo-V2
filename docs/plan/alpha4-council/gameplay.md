# Next2 gameplay council — planning only

## Synchronized brief addendum

Rechecked the relevant active scripts after the parent reported published main `e5687c9` on `feat/emberwake-player-journey-alpha4`; no Git command was run. Read `next2/PARENT-BRIEF.md` and peer experience/visual councils. Their fresh-player direction priority is independently supported: the live HUD repeats “Release two world-runes” even after release. **Priority 1 must include a visible in-play next-action cue**, not only journal polish. Reuse the experience owner’s single `deriveNextAction` selector rather than build a competing gameplay selector. Crucial contract: `flags.runes` means released by a bolt; `flags.sigils` means collected. Guide cast → collect → guardian → gate using that distinction and actual active-scene observations. All optional-room guidance remains local; three rooms are accessible before the ending, only Archive is completion-gated. Preserve existing controller observations/assertions; extend tests for released-but-uncollected and imported-returning states. This coordination adds no source assignment or approval.

## Current evidence

Read the retained `assets/scripts/{engine,worlds,chapter-data,chapter-runtime,journal-v12,client,encounters-v12}.js`, alpha.3 decisions, previous gameplay/experience results, `docs/QA.md`, `qa/correction/next-final/validation.json`, and fixture-correction report. This is EMBERWAKE, an inspired original, **not an official Swordigo sequel**. No external research is needed for these code-grounded proposals.

Existing strength: three original worlds, named optional platform routes, six runes, shrine attunements, readable guardian encounters, both endings, Gauntlet, and four connected optional rooms. Alpha.3 already fixed delivery consequences, optional Aster advice, saved-anchor continuation, post-ending checkpoint/refill corruption, room identity, portrait boss clearance and native no-storage fresh play. Do not reimplement those.

Recorded alpha.3 evidence: 232 Node passes; four independently earned/replayed chapter cases across both endings and 60/120 Hz; native Water/advice checks. These are historical reported passes, not new verification today. Update-repeatability clearance remains withheld; later fixture correction does not establish the original cause or production safety.

Three remaining opportunities are directly visible: the journal computes per-realm letter/heart/route records but the client shows only aggregate campaign counts; map chapter interactions are anonymous gold dots; and Dawnstep currently moves from x370 to entry x130, a roughly 240-unit retreat rather than a substantial return shortcut. Shrine text explains increments but does not show the player's actual resulting build.

## Three bounded priorities, ranked

### 1. Make exploration readable without auto-solving it

Expose the existing `EW_JOURNAL.read` records in the journal: visited-realm letters found/total, heart status, and named optional-route instruction. Add a compact map text list linking **labels**, not new travel actions, to current-room door and interaction markers. Show available/finished/requirements-missing distinctions derived from current journey facts. Preserve undiscovered realm prose withholding; do not reveal every uncollected cache coordinate or replace exploration with arrows. Existing Aster advice stays optional and unchanged.

**Value:** players can resume a forgotten objective and understand where an existing side path leads, instead of interpreting identical dots or global totals.

**Experience owner:** `assets/scripts/client.js`, `assets/scripts/journal-v12.js`; new `tests/emberwake-discovery.test.cjs`. No new save fields, completion reward, objective-selection persistence or map teleport.

### 2. Give earned Dawnstep a useful return payoff

Preserve the existing early Archive lamp and all anchors. Add one stateless return-lamp interaction near the safe Archive recovery area (candidate x1950, feet y590), returning to the existing entry anchor. Require Dawnstep **and this journey's Archivist defeat**, and retain no-combat/clear-destination authorization. It shortens the walk home after an earned victory without bypassing seals, enemies on the first approach, the boss, or release-hours interaction. Do not auto-trigger it; explain that leaving before releasing hours is allowed and completion remains unfinished. No XP, gold, healing, new anchor or persistent fact.

**Value:** a gained ability changes traversal meaningfully; optional mastery produces convenience rather than another collectible checklist.

**Gameplay owner:** `assets/scripts/chapter-data.js`, `assets/scripts/chapter-runtime.js` only if a shared authorization helper is needed; `tests/emberwake-chapter-data.test.cjs`, `tests/emberwake-chapter-runtime.test.cjs`, additive cases in `tests/emberwake-chapter-earned.cjs`. Reuse existing ability interaction type; new interaction ID must not enter persisted rosters. No collision edits.

### 3. Make shrine spending an informed build decision

Show current → next actual max HP/MP, normal sword damage and bolt damage, alongside cost, remaining embers and level cap. Explain the third-strike bonus, lumen recharge and purchase refill accurately; all three purchase types currently restore HP/MP, not flasks. Retain prices, caps, rank scaling, economy and combat timing. No respec or new upgrade currency.

**Value:** existing progression becomes understandable before an irreversible purchase, without destabilizing earned builds.

**Gameplay owner:** `assets/scripts/engine.js` only for a pure, read-only stat projection helper; new `tests/emberwake-upgrade-preview.test.cjs`. **Experience owner:** `assets/scripts/client.js` shrine rendering. Implementation must verify effective formulas including wrappers before promising numerical previews.

## Cross-role contract

Parent approves scope first. Gameplay owns predicates/stat truth; experience owns wording and client rendering; visual owner may propose lamp art in `assets/scripts/presentation-v12.js` only after checking which renderer owns the existing lamp. One writer per file: experience alone merges client changes; gameplay alone merges chapter-data changes. Helpers receive cloned journey inputs and grant nothing. Preserve all V3/V4 IDs, anchor coordinates, campaign statistics/endings, existing routes and valid old exports. No worker/cache/build changes in council work.

## Premortem and acceptance

- **Spoiler checklist replaces discovery:** visited-only campaign details, descriptive routes, no compulsory guidance. Human first-play review remains necessary.
- **Shortcut bypasses encounter or heals:** synthetic locked/combat/occupied-target tests; earned trace must defeat Engine normally, interact at lamp, and preserve resources except natural timed MP regeneration. Test leaving before release and returning to finish.
- **Preview lies or grants rewards:** all ranks × upgrade levels × caps; compare projected values to real isolated purchases; verify pure calls leave bytes/state unchanged.
- **Old journey breaks:** old V3 and earned V4 import/export/reload tests, unchanged facts/rewards/canonical checkpoint. Keep earned controller and existing assertions; extend observations only additively. Record new ordinary-input traces separately from synthetic fixtures.

Parent acceptance also retains campaign/endings/Gauntlet regressions and desktop/portrait native navigation. No tests, browser, Git, installs or source edits ran for this plan. Physical controllers, Android/iOS, Safari/Firefox, low-end performance, accessibility and human discovery/combat pacing remain unqualified; viewport fixtures and simulation frequency cannot clear them.
