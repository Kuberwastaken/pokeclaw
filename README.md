# pokeclaw bridge blueprint

This repository is a minimal blueprint for recreating a private MCP bridge and the tools exposed through it.

What is included:
- `src/bridge.mjs` — transport bridge that forwards MCP traffic over stdio or HTTP/SSE
- `scripts/tailscale-bridge.sh` — Tailscale bootstrap for a private bridge host
- `TOOL_SPEC.md` — complete tool catalog and schemas for the bridge surface
- `LIVENESS.md` — handshake and connectivity check guide
- `PROMPTS.md` — prompts for the developer agent and the receiving Poke instance

Design goals:
- no personal data
- no secrets committed to git
- environment-driven configuration only
- enough detail for a teammate to recreate the bridge from zero
- focused only on the MCP bridge and its tools

Run modes:
- stdio: `node ./src/bridge.mjs`
- HTTP/SSE: `BRIDGE_MODE=http node ./src/bridge.mjs`

The bridge can proxy to either a local upstream process or a remote SSE upstream. Configure the upstream entirely through environment variables.
