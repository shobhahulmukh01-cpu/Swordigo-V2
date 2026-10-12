# Limited security safeguards

The redact-only scanner reports kind/path/line for recognized GitHub PAT forms, private-key headers, AWS IDs and labelled AWS secrets. It does not print matched secret values. Obfuscated, novel or binary-embedded secrets can be missed; a passing scan is not proof of absence or a formal security certification. Review history/assets and revoke the chat-exposed credential.

Public build input is only `index.html` and `assets/`. Recognized leaks, test/fixture paths, unsafe names, symlinks/special files and changed read sizes are refused. Caps: 16 MiB/file, 64 MiB runtime total, 2048 asset entries, 16 directory levels, 4 MiB integrity manifest. The SHA manifest is not authenticated: coherent forgery is possible. This is a trusted-workspace/no-concurrent-writers tool, not a race-proof hostile-filesystem sandbox.

The server snapshots validated dist bytes, validates loopback Hosts, refuses unsafe/encoded/dot/backslash paths, permits GET/HEAD only, supplies no-store/ETags/nosniff, and hashes normalized inline bootstrap for CSP. Injected styles require style unsafe-inline; scripts do not receive it. Self assets/blob downloads are supported. No service worker or gameplay Permissions-Policy restriction is added. Local headers do not become GitHub Pages guarantees.

Journey input has strict known schema/IDs, bounded raw size and progression-lineage consistency checks. Restore/replacement requires UI confirmation when a current journey exists, with a rolling valid story backup and stale async-read/modal ownership guards. Saves/milestones are local client data, not server-authoritative anti-cheat or a global leaderboard.

Reporting: use the owner's repository issue/security channel without including exploitable secrets or private saves. No third-party scanning service, global user collection or telemetry is included.

## Lumenblade candidate additions
The build permits one additional explicit root runtime file, `sw.js`, under the same integrity/secret checks; unknown root output remains refused. The local preview permits same-origin workers and same-origin base paths to support the offline shell and legacy entry. Only hashes of inline scripts present in trusted built HTML are admitted; unsafe-inline scripts, eval and external script hosts remain disallowed. PWA manifest/icon files are shipped from the same origin. Save import is bounded at 100 KB, validated field-by-field, and confirmed before replacing a slot; imported text is never executed. Storage-denied warnings do not block gameplay. No credentials are needed by players.
