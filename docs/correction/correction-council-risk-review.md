# Council round 2 — adversarial release risk review

## Decision

**GO for bounded implementation; NO-GO for release until the gates below pass.** Initial scope: canonical Emberwake entry/build identity, full-viewport presentation preserving Canvas/art/controls, simulation-owned travel authorization, terminal death handling and their regression tests. No new story, rooms, abilities, economy, mandatory backtracking, V4 schema or Lore migration. Describe delivery as a corrective release candidate, not the council's proposed expanded adventure.

Evidence: read `correction-design-council.md` and `correction-engine-audit.md`. Both are static reviews, not fresh executable acceptance evidence. Design council's final recheck reports restored root identity; engine audit's earlier “wrong default” wording is therefore stale, not a newly established blocker. Packaging/cache acceptance remains open. Parent reports implementation underway; I have not tested that patch. This review writes only this file and executes no project/downloaded code or credentials.

## Adversarial challenges

1. **“First slice” is overloaded.** Design council's sequence adds a Moonroot branch before schema work, while its acceptance section demands three region loops, persistent restoration, Charter and epilogue. Those are incompatible with a bounded correction. Freeze those proposals as later backlog. Fullviewport does not authorize a vertical-camera rewrite, altered collision scale, new dependencies or new content.

2. **Preservation is semantic, not byte-frozen.** Keep source snapshots, IDs, artwork and schema; authority/death corrections necessarily change code and some behavior. Do not retain a defect merely to preserve old replay timing. Conversely, any unrelated tuning change needs explicit approval. Separate original baseline proofs from new patch proofs and intentional expectation changes.

3. **V4 is unnecessary now—and the two proposed migration commitments differ.** Engine audit keeps original V3 primary/backup untouched in a new namespace; design council permits commitment after producing a valid new save. “Valid” does not prove persistence or recovery. For this release retain V3 keys/serializer and campaign requirements. No silent conversion, field stripping, new namespace or tightened validator that rejects legitimate old exports.

4. **Future migration cannot trust a compatibility flag.** Proposed grandfathered Charter entitlement must derive from validated original progression, not caller-supplied provenance. Freeze original campaign validation, preserve endings/rush unlocks, separate story/epilogue completion, and require deterministic migration plus crash-safe commit/recovery before expansion. A rolling autosave backup is not an archive; neither review can promise permanent downgrade recovery without retained original bytes and a tested restore path.

5. **Authority is not UI disablement.** Every player travel path must enforce discovered destinations, run mode, boss lock and valid checkpoint before mutation. Keep internal loading separate. Denial must leave progression, health, entities and events unchanged. This is local consistency, not server anti-cheat.

6. **A death barrier can fix one exploit and break recovery.** Identify all death paths, halt postmortem interactions/rewards/checkpoint refill/finish, but preserve one death event/count, intended checkpoint reconstruction and save/export recovery. Do not blindly stop event processing or suppress legitimate pre-death progress.

## Required release gates

- **Identity/package:** built root and project-prefix HTTP URLs boot exactly one Emberwake App with seven intended scripts/images, correct metadata and no required Lumenblade bundle. Old-entry compatibility works. Test existing same-scope worker upgrade, partial network failure and rollback; offline support must be explicitly supported or safely retired, never assumed. Do not clear journey storage.
- **Persistence:** import/read/export/write fixtures cover fresh, midrealm, backtracked, prefinal, both completed endings, rush and backup saves. Preserve settings/bindings/milestones. Malformed input, denied/quota storage, primary-write failure after backup, cancel and stale async import leave recoverable data and truthful persistence messaging.
- **Lifecycle:** targeted tests cover denied travel with zero mutation, boss/rush restrictions, lethal enemy/projectile/void/checkpoint overlap, exactly-one death and restart. Existing applicable engine/campaign tests plus new ordinary-input proofs pass; explain intentional replay changes.
- **Presentation/devices:** root browser checks cover portrait/landscape, resizing, safe areas, simultaneous touch, remaps, held-input pause/resume, controller disconnect, focus, reduced motion and image fallback. Fullviewport must preserve hazard lookahead and collision alignment. Record before/after frame-time/memory evidence on named hardware; synthetic controllers/software rendering do not qualify phones.
- **Release honesty:** fresh source/build hashes, environment, passes/failures/skips and rollback rehearsal accompany the artifact. Rights/notices review remains required. Unrun device/accessibility checks remain disclosed, not passed.

## Tool boundary

Parent reports pinned REA 6.4.0 static analysis on isolated supplied extraction with npm scripts disabled, still ongoing: neither completion nor a security clearance. Require result provenance/limitations; ignore-scripts does not sandbox later execution. Parent reports Lore v0.10.1 digest verified but blocked by GLIBC_2.39: integrity is not compatibility. **Defer Lore entirely; no server, migration or host-library upgrade.** No numerical effectiveness or commercial-certification claims.
