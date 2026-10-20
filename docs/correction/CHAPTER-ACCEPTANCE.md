# The First Unwritten Day — chapter acceptance

## Scope and compatibility decision

This is an in-place continuation of the supplied Emberwake, not a replacement engine or an official Swordigo sequel. The engine council's bounded four-room proposal was selected over the design council's ten-room expansion. No elapsed-duration or “100x” quality claim is substantiated.

Four room registries are separate from the unchanged three-entry `EW_LEVELS`: Millpond irrigation, Cooling Gallery, Rootcellar Charter and completed-story Star Archive. Five paired connections preserve ordinary return routes; 15 certified anchors, eight mechanisms, five nonconsumable item facts, three deliveries (60/80/0) and 13 chapter foe IDs include dormant phases. Existing campaign rune/cache/beacon/guardian IDs, endings and rush stay canonical. No Charter/testimony gates an existing ending, Archive access or its optional encounter. No fourth heart or replacement ending was added.

Runtime owns door proximity/source/unlock/landing/combat checks, inactive frozen encounter caches, safe recovery and scene identity. Door passage does not call `loadLevel` or replenish resources. A chapter death ends that tick; durable facts survive, transient encounters rebuild at the validated anchor. Original completion/ending and recorded campaign statistics remain immutable during post-ending activity. Heart conveniences never remove existing double jump/dash/guard; Cinderseal affects marked vents only, not all lava.

## Persistence model

`EW_STORY_V4` stores normalized current/previous payloads in one synchronous `setItem`, with an expected revision. Portable payload contains frozen campaign identity + normalized original V3 base + bounded chapter facts. UTF-8 import budget: 512 KiB. Unknown IDs/dependency violations/unsafe anchors/newer formats fail closed. Normalize twice gives the same result. Valid V3 migration initializes empty chapter facts without free deliveries; legacy primary/backup bytes are untouched, as are rush keys. Completed imports resume in ending view.

Delivery facts and gold changes are prepared/validated together and persisted before in-memory/UI grant. Storage failure yields neither; retry remains possible. Imported old files intentionally rewind a journey and are not globally unique provenance. Revision checking detects observed competing writes, but localStorage is not a cross-tab compare-and-swap transaction or guaranteed disk durability.

Replacement stages an isolated Game after validation, preserves the live journey, writes the target and only then swaps. Delayed file reads bind epoch/generation and cannot replace a later owner. Malformed-current recovery requires a human confirmation carrying exact observed raw bytes; the helper rechecks that token and normalized previous before writing repaired current/revision. Cancellation retains the corrupt envelope. No silent fallback overwrites a present malformed/future V4.

## Verification boundary

Alpha.3 adds an observation-only, scene-aware controller reusing the original controller's navigation/defense. It earns each original ending independently, then all four rooms, both paid deliveries (+140 exactly), published Charter, all items/three Archive seals, opt-in Engine combat and chapter finish. Both endings at 60/120 Hz and exact replays pass. Authored nonlethal fall, enemy-caused death/respawn, validated earned Gallery save/restore and won-first explicit anchor continuation are included. Player positions, facts, resources and enemies are not injected for these earned simulations. Canonical ending/checkpoint/stats and XP/rank/upgrades remain unchanged during optional play. This is Storykeeper-difficulty simulation evidence, not native-browser full-chapter play or human pacing qualification.

Current exact-build results are consolidated in `qa/correction/next-final/validation.json`; `chapter-final/` is older alpha.2 evidence. Native keyboard play separately earns Water Remembers and its +60 durable reward, opens non-granting advice, and uses clearly labeled completed-import fixtures to test both endings' map/Archive connections plus reload/explicit saved-anchor continuation. Those imports are not earned campaign evidence. Render fixtures intentionally seed state and require separate individual visual review.

The update harness retains original V3 assertions and adds byte-exact V4 current/previous/revision, paid reward and rush sentinel checks through failed installation, activation, offline, historical rollback and re-upgrade for both endings. A prior historical rollback timeout remains preserved without an established root cause. A later pass, even a bounded repeatability experiment, cannot establish that cause or certify production rollback robustness.

Source/build/served/SRI/worker coherence is checked after runtime edits. First-load digest URLs plus SHA-384 SRI and fail-closed boot protect pre-worker scripts/styles; the worker verifies installation/misses and waits for old clients to close. Saved state is not cleared to repair caches. Exact-source/runtime results, not historical reports, determine the current local evidence boundary.

## Remaining release holds

- Human first-time-player objective discovery, backtracking/fight pacing and actual duration are unmeasured.
- Physical controller, iOS/Android, Safari/Firefox, low-end thermal/frame-time/memory and accessibility reviews remain unqualified here.
- Owner rights/license/trademark/asset-provenance decisions remain required; `UNLICENSED` is not distribution clearance.
- Exact-commit remote CI, deployed MIME/cache/header behavior and owner publication approval are separate from local tests.
- The larger ten-room council story, six mandatory post-ending errands, new sentry art/animation and broader device qualification are not included in this bounded chapter.

Release status: playable chapter alpha with explicit gates; not production certification.
