# Council runtime

This is the existing Node.js council implementation, extracted as a separate module. It does not change the hosting app or start a server. Node 18 or newer is needed for the optional live caller's `fetch` support. The deterministic tests use built-in Node modules only.

## What it does

- Keeps participants, turns and model calls in a council room.
- Runs a discovery opener, blind first-round statements, a second round and a chair ruling.
- Uses an explicit mission, expiry and budget grant before live model calls.
- Records local execution and minutes receipts.
- Selects cited workflow notes after a ruling locks.

These are software features, not proof that simulated advisors predict real customers or represent the named people.

## Offline check

From this directory:

```sh
npm test
```

Tests use fake model responses and temporary folders. They do not need an API key, call a model or spend money.

## Public subset

The accompanying manifest is the proposed public subset, pending publication review. Its profile and skill paths must all resolve within this council directory. Restricted source material, full transcripts, credentials, server state and private history are not included. The original private council is unchanged.

Start with `../README.md` for the member index and the agent-readable Drive reference.

Read [LIMITATIONS.md](LIMITATIONS.md) before integrating this code. Local CLI confirmation is not authenticated permission or a spending control.

## Live use is a separate decision

`scripts/pauli-board.js` is retained for inspection and manual integration. Do not put an API key in a command, commit or transcript. It reads an existing `OPENROUTER_API_KEY` from the environment when explicitly executed with `--yes` and a mission-bound grant.

The price table is a checked snapshot, not a billing guarantee. Recheck model availability, pricing, account limits and the exact approved budget before any live run. The runner's local receipt and advisory budget checks are not an independent provider-side spending cap. Local storage errors can fail open in this existing implementation, so it is not an audit-durable production gate. No live-model or production-readiness claim is made by the offline tests.

No daemon, scheduled job, deployment or default-branch change is part of this package.

The publication variant pins the credential-bearing endpoint to OpenRouter and refuses redirects. Custom endpoint configuration is disabled. Treat manifests and profiles as trusted local configuration, not arbitrary project input.

## License

The extracted code retains its original MIT license in `LICENSE`.
