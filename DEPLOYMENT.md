# Publishing and release gates

## Credentials and safe Git publication

Revoke the token exposed in chat. Never put it in source, a command URL, a workflow, a log or this archive. Use a fresh securely managed credential. With GitHub CLI installed, an interactive owner flow is `gh auth login --web` followed by `gh auth setup-git`.

Run a fresh authenticated `git ls-remote --heads https://github.com/shobhahulmukh01-cpu/Swordigo-V2.git` before publishing. The public-empty observation on October 6, 2026 is historical, not permission to overwrite a later branch. Abort any auth/network error. If heads now exist, fetch and inspect before integrating; do not force-push or discard existing work.

For a still-empty remote, initialize the exported folder with Git, commit the entire source on a real main branch and push normally. Do not include browser profiles, temporary files or credentials. For later changes, create a feature branch from the actual fetched main and open a PR against that real base. An empty remote cannot host a meaningful PR before a base commit exists.

This session authenticated as the repository owner, but its connector exposes only read/issue/review actions, not file pushes, branch creation or PR creation. Consequently no push, commit SHA, PR URL, CI run or deployment is claimed.

## CI and Pages

CI uses Node 24, read-only repository permissions, disabled persisted checkout credentials and immutable official action commit pins verified on October 6, 2026. There is no dependency installation. Browser checks require Chrome and Python; campaign proofs are generated before browser tests. CI has not been executed here; local execution used Node 26.10.0.

Pages release is manual `workflow_dispatch`, main-only, gated by unit/secret/build/campaign/browser checks, and uploads only `dist`. The owner must configure the GitHub Pages Actions source and appropriate environment protection before requesting deployment. Pages does not inherit the local Node server's CSP/other response headers. Check `/Swordigo-V2/` routing in the real deployment, or use a host that can set the documented headers.

## Before public/commercial production approval

- Execute the committed CI on Node 24; verify its result and hosted URL, not merely these workflow files.
- Exercise desktop Firefox and Safari plus physical iOS/Android browsers, touch orientation, gamepad models and audio. This session's Chromium emulation/synthetic gamepad is not that certification.
- Measure rendering frame pacing, memory and input latency on target low-end hardware; 60/120 Hz proof traces are simulation steps.
- Review source/asset rights and choose the license; `UNLICENSED` is retained pending that decision.
- Review accessibility limits of a Canvas action game and test real focus/touch behavior. No full screen-reader or accessibility certification is claimed.
- Revoke exposed credentials and review account security logs.

Lore was evaluated as an optional pre-1.0 separate VCS, not installed. It does not solve the missing GitHub-write capability or network access; this project is Git-ready without adding it.
