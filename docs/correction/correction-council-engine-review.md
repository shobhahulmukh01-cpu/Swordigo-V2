# Council round 2 — engine decisions

## Verdict

**Approve a substantial three-realm upgrade; reject mandatory campaign re-gating for this release.** Read `correction-design-council.md` and `correction-premortem.md`, and rechecked current entry/save/progression code. Root HTML now identifies Emberwake; the premortem’s default-entry finding is historical, not a fresh blocker. Build/cache acceptance still requires validation. Authority/death/fullscreen work belongs to the parent. This review changes no game files and executes no game/tests.

## Approved

1. **Deepen existing routes before introducing rooms.** Add one optional loop/shortcut within each existing realm’s coordinate strip: Moonroot canopy/garden, Cinderworks maintenance/cooling path, Spire observatory/constellation lane. Preserve original realm indices, six mandatory rune IDs, checkpoint IDs and critical route. Improve differentiated boss patterns, enemy arrangements, landmarks and restored-world geometry. These are gameplay deliverables, not just dialogue or recoloring.

2. **Heart-derived contextual abilities.** Rootbinding and Cinderseal may enable optional marked sockets/seals after their respective bosses. Derive permission from validated boss/rune facts; do not persist duplicate ability lists yet. Preserve sword/bolt/double-jump/dash/guard from start. Socket activation costs no mana/gold and cannot obstruct the original route. Old saves receive the same derived permission without replaying victories.

3. **Quest journal as a derived view first.** `q_first_spring`, `q_hours_home`, and `q_unwritten_names` reflect existing runes/boss/ending facts; no second quest state machine or duplicate boss rewards. Let objectives advance without a prior NPC conversation. Journal/HUD/map share one objective resolver. Completed journeys retain their ending and rush unlock.

4. **Optional return to Mara.** Recast Seasons Charter as optional lore/route restoration, not Spire admission. Keep the proposed short beacon return and changed environmental landmark. Ensure simulation-authorized travel permits discovered destinations but denies active-boss/rush escape. The current single persisted checkpoint does not provide per-region beacon history: initially use deterministic existing safe destinations rather than claiming remembered selected-beacon travel.

5. **Existing restoration facts first.** Buds/cooling/dawn may derive from boss flags; previously defeated enemies remain defeated. Any new return enemy IDs must enter the validator’s full authored roster regardless of current phase, while spawning only in their intended phase. Rewards remain once-only through `defeated`.

## Rejected for this release

- **Mandatory Rootbinding causeway and Charter→Spire gate.** The proposed graph is acyclic but changes access for valid mid-Cinderworks saves and returning players. Grandfathering only already-seen Spire misses players legitimately about to enter it. Keep the original east-gate progression for everyone, including fresh runs.
- **Extra campaign entries or mandatory sigils disguised as quest seals.** Completion, `sigilCount`, gates and finish assume three realms/two runes each. New content must not invalidate v3 completion.
- **Door transitions implemented with `loadLevel`.** It refills vitals/flasks and reconstructs encounters. Door cycling must not heal, clear live combat, farm rewards or bypass guardian locks.
- **“Legacy provenance” as anti-forgery.** Portable local JSON cannot authenticate its historical origin through a self-declared marker. Validate deterministic compatibility rules; do not promise cheat-proof entitlement verification.

## Deferred

- Nested `roomId`, multiple doors/NPCs, checkpoint maps, Dawnstep teleport rails, Star Archive/Engine and postgame continuation. These require scene ownership, safe spawn/return state, live-encounter retention and separation of playing/won/completed states; they are not small content additions.
- Persistent Water Remembers/Summer Coal deliveries and 60/80-ember rewards until a bounded schema is approved. V3 normalization drops arbitrary new fields; existing flag categories cannot safely encode quest facts. Do not award repeatedly on reload or hide new facts in collectible IDs.
- Timed solid segments until appearance-inside-player/crush/escape tests exist. “Not moving platforms” does not make changing collision safe. Hit-stop likewise waits for timing/replay tests.

## Safe sequence and gates

1. Finish parent identity/presentation/authority/death changes; verify root/project-prefix HTTP boot, input quarantine, resource recovery and packaging.
2. Ship a Moonroot geometry/encounter slice with derived journal/heart permissions, then repeat substantive distinct work in Cinderworks/Spire.
3. Only if persistent optional interactions are necessary, approve minimal v4 containing bounded optional interaction/completion facts—not the council’s entire room/inventory/epilogue schema. Preserve v3 primary/backup, migrate idempotently, retain every original counter/flag/checkpoint/ending; commit fact and reward together.
4. Gate each slice on valid early/mid/backtracked/completed/rush imports; ability denial/unlock/reload/death; once-only rewards; ordinary-input campaigns across difficulties/both endings; new replay provenance. Existing controllers hard-code routes/heights and need honest updates, never state-cheat shortcuts. Human readability/pacing and real-device performance remain separate evidence requirements.
