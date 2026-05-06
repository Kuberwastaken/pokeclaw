# Prompts

## Prompt for Claude Code

You are working inside a fresh clone of the `Kuberwastaken/pokeclaw` repository.

Goal: turn this repository into a fully working private MCP bridge deployment that can run in either stdio mode or HTTP/SSE mode, and that can be safely exposed through Tailscale.

Requirements:
1. Inspect the repository structure first.
2. Implement or refine the bridge so it supports both transport patterns:
   - stdio in/out for a local MCP client
   - HTTP/SSE for a remote MCP client
3. Keep the bridge configuration environment-driven. Do not hardcode any secrets, credentials, hostnames, or tokens.
4. Keep the bridge self-contained and easy to deploy on a single VM or container.
5. Add a Tailscale setup script or deployment config that:
   - joins the host to a tailnet using an auth key supplied at runtime
   - keeps the service bound to localhost unless intentionally published
   - documents the recommended ACL tag for the host
6. Add a clear README or docs that explain:
   - how to run the bridge in stdio mode
   - how to run it in HTTP/SSE mode
   - how to point a client at the bridge
   - how to attach the host to Tailscale
7. Add or update a `PROMPTS.md` file if needed, but preserve the two prompts below.
8. Do not add personal data or secrets.

Implementation guidance:
- Prefer a small number of files and keep the code readable.
- Use Node.js/TypeScript or plain Node.js if that is simpler for a runnable bridge.
- Support a simple health endpoint if you expose HTTP.
- Make the transport handling explicit and well documented.
- If you add tests, keep them lightweight and focused on transport/message forwarding.

Deliverable:
- A repo that contains working bridge code, a Tailscale bootstrap path, and documentation sufficient for a teammate to deploy the service without extra context.

Acceptance criteria:
- The bridge can run locally without requiring any secrets committed to git.
- The bridge can proxy messages over stdio.
- The bridge can proxy messages over HTTP/SSE.
- The Tailscale instructions are usable and do not require guessing hidden configuration.

## Prompt for another Poke instance

You are another Poke instance setting up this bridge for the user.

Use the `Kuberwastaken/pokeclaw` repository as the source of truth.

Goal: configure yourself so you can connect to the private MCP bridge and operate through the `poke.com/integrations` interface.

Steps:
1. Read the repository docs first, especially `README.md`, `PROMPTS.md`, and any server-side maintenance notes.
2. Identify the bridge endpoint exposed over Tailscale.
3. Use the `poke.com/integrations` interface to add or update the MCP integration that points at the bridge endpoint.
4. Choose the correct transport settings for the bridge:
   - use stdio if the integration is running locally
   - use SSE/HTTP if the bridge is exposed over the tailnet
5. Verify the connection with a small, harmless tool call.
6. If authentication or host access is needed, request only the minimum required permission and do not invent secrets.
7. Record any assumptions or deployment details in the repo docs if they were missing.

Configuration guidance:
- Do not use personal data.
- Do not hardcode credentials.
- Prefer tailnet-private networking over public exposure.
- Keep the bridge URL, transport, and any required headers explicit.

Acceptance criteria:
- The Poke instance can reach the bridge.
- The integration appears in the Poke integrations UI and is usable for MCP calls.
- The setup is reproducible from the repository documentation alone.
