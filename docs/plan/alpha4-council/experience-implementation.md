# Experience implementation handoff — source frozen

## Scope / cross-review

Reviewed all three other councils and parent brief before implementation. Withdrawn duplicate work: presentation-v12 already appends per-realm letter/heart statuses and named routes. journal-v12.js was inspected and deliberately left byte-unchanged. The early Millpond, Cooling Gallery and Rootcellar entrance requirements remain unrestricted; only Archive requires an original ending. No official Swordigo-sequel or replacement-campaign claim.

Modified only assets/scripts/chapter-data.js, assets/scripts/client.js and new tests/emberwake-discovery.test.cjs. No runtime/engine/controls/presentation/save/schema/roster/build/Git edits by this owner. Gameplay owner supplied upgradePreview and canChapterAbility; parent supplied inputLabel. Exact stateless return-lamp entry was inserted once by this owner as contracted.

## Delivered in-play value / reached paths

1. **One contextual next action.** Pure deriveNextAction uses live journey flags and local scene facts, independent of browser awards/rush unlocks. HUD, journal/map summary and user-invoked Aster advice consume it. Main roads default to campaign unless the player explicitly follows a delivery. Sealed rune → released light to collect → second rune → guardian → eastern gate are distinct. Realm-specific canopy/gantry/hall wording; combat text updates without repeated phase announcements. Existing objective slot, no new forced tutorial/modal or automatic hint timer. Stage announcements occur once per transition, never each HUD tick.
2. **Session-only delivery tracking.** Journal has explicit original-adventure/optional-continuation framing, follow/reset controls, carried-versus-delivered status and discovered-only room names. Unknown rooms use authored leads; unvisited realm tasks are withheld. Selection clears at enter/import/new/resume boundaries and Game ownership changes; it never enters a save. Main-road campaign default returns after completing a tracked delivery. Local room advice takes precedence while inside a room.
3. **Readable map paths.** Existing current-scene door symbols and gold points have a text label list. Doors explain ending lock, nearby danger or occupied landing. Unknown lead wording becomes actual room name only on discovery. No new travel button: original realm canTravel/travel dispatch remains intact. Cross-realm guidance only offers Map revisits when that current runtime authorization is true, otherwise describes continuing the original adventure.
4. **Actual input wording.** Objective/advice/journal and nearby E-prefixed interaction prompts use parent App.inputLabel, including remapped keys and active touch/pad mode. Label HTML is escaped; HUD/advice use textContent. Portrait nameplate selection/layout untouched.
5. **Explicit continuation.** Completed saves show separate Revisit your ending and Continue deliveries title actions. Direct continuation invokes existing validated resume and continueDeliveries authority, preserving saved chapter anchors and original ending/statistics. Nonblocking bridge names The First Unwritten Day, the freed hearts, repairs and now-open Spire Archive, then gives the local next action. It does not replay a forced finale or create a new journey.
6. **Authored return payoff.** After actual Archive completion, re-reading the existing open-letter desk gets an ending/repair-aware coda. Carried Charter never counts as publication; unsigned testimony remains unread; missing deliveries remain unfinished. Original open-letter text persists before completion. Reached through ordinary existing item interaction → selectStory, not fixture-only text.
7. **Earned shortcut / truthful shrine.** Return-lamp data requires this journey's Engine defeat plus Dawnstep, from recovery1950 to entry130, no new persisted ID/anchor/reward. Client consumes runtime chapterAbility + subsequent note to show actual released-versus-unfinished hours and no refill; it does not invent progress. Shrine displays gameplay upgradePreview current→next stats, rounded third strike, rank scaling, costs/caps and affordable-only remaining embers. Every purchase refills HP/MP, never flasks. Prices/economy unchanged.

## Focused validation (synthetic unless stated otherwise)

Command: `node --test tests/emberwake-discovery.test.cjs tests/emberwake-story.test.cjs tests/emberwake-chapter-client.test.cjs tests/emberwake-chapter-data.test.cjs tests/emberwake-journal.test.cjs`

Final: **41 Node tests/files passed, zero failures**, including **21 new discovery/UI contract tests** and the existing client file's **17 internal isolated checks**. Log: /data/work/plan/next2-experience-focused.log. Discovery tests cover purity/immutability, all realm stages, released-vs-collected, early rooms, local advice, tracking/reset, authorization-limited routes, unknown discovery, both-ending partial/full coda, lamp roster safety, rush isolation, real client action/event dispatch with DOM facade, stage-bound announcements, menu saved-anchor resume, failed continuation preserving live journey, shrine projection/refill truth and HTML escaping. Initial new UI test failure was an incomplete fake bindings object; fixture corrected to complete valid bindings, not a runtime bypass.

These are NOT native keyboard/touch/browser discovery, human pacing, layout, performance or full earned-campaign evidence. Gameplay's one mercy/120 quick earned run used earlier data hash d4521a…; subsequent guidance-only wording/stage edits invalidate any exact-current-source claim for that run. Lamp schema/physics unchanged. Parent must run frozen-source earned matrix/replays and native/UI/portrait acceptance separately. Prior reliability holds remain.

## Freeze / integration

- chapter-data.js SHA256 cab3d4328dab188682ea78624e83ca51fe04b33d23b50a90a4a39ba39a3b2216
- client.js SHA256 dcc82411b583170674fe3727be585f0d72662da65c62c6ee8812919fc9f06863
- journal-v12.js unchanged SHA256 297fdd10d6ef18cf4480feecce9a6415fa213769938f998eedcd04a09b15ec4c
- discovery test SHA256 85eda855c14fb1c4cdef55cc588e79ae817bd38f87e80106a218275d4eb619bb

Parent CSS hooks: journey-guidance, journey-track, delivery-follow, map-paths, upgrade-preview; new title button #continue-chapter uses existing secondary button class. No new HUD overlay. Parent owns wrapping/44px targets/portrait review, SRI/build/deployment integration and final serial gates. No browser, Git, build, installation, authentication or CPU-heavy suite launched here.
