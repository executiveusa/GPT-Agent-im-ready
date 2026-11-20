# Runtime source and publication changes

The runtime code and three original test files were extracted from the existing council implementation at revision `9f60c758d0d212ee7e3f01637cebf0b567ab6487` on 2026-11-20. This is a host-local extraction pin, not a publicly recoverable upstream commit. The original license was recovered from the pinned local git object and matched byte-for-byte against this package. No private host path is needed to use this package.

The original repository's `LICENSE` was inspected at extraction time. It is the MIT license with Copyright (c) 2026 Andrew Sims; the license text is retained here without changes. The source header in `sidecar/pauli-council.js` also records earlier multiplayer-room and council-protocol provenance. Those header references are attribution, not bundled dependencies.

Unchanged source files:

- `sidecar/pauli-council.js`
- `sidecar/pauli-council-runner.js`
- `sidecar/pauli-board-skills.js`
- `test/pauli-board.test.js`
- `test/pauli-council-runner.test.js`
- `test/pauli-board-opener.test.js`
- `test/_assert.js`

Publication changes to `scripts/pauli-board.js` pin the credential-bearing request to the fixed OpenRouter chat-completions endpoint, reject custom endpoint configuration and refuse HTTP redirects. The private source is unchanged.

This package adds documentation, a package test command, a public-path/endpoint test, a 12-seat subset manifest, a dated zero-price model snapshot and a registry containing only the supplied King Doe workflow notes. Some seats have source indexes rather than full profiles. The registry does not pretend those indexes are complete callable workflows.

The model snapshot was checked against `https://openrouter.ai/api/v1/models` on 2026-11-20. It is not a promise of future availability, pricing or account limits. No live model call was used to qualify this publication package.
