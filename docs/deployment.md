# Deployment guide

## Runtime modes

### stdio mode
Use when a local MCP client connects directly to this bridge.

Environment:
- `BRIDGE_MODE=stdio`
- `UPSTREAM_TRANSPORT=stdio` or `UPSTREAM_TRANSPORT=sse`
- if `stdio`, set `UPSTREAM_COMMAND` and optional `UPSTREAM_ARGS_JSON`

Start:
- `node ./src/bridge.mjs`

### HTTP/SSE mode
Use when a remote client needs to reach the bridge over the private network.

Environment:
- `BRIDGE_MODE=http`
- `BRIDGE_PORT=8787`
- `UPSTREAM_TRANSPORT=stdio` or `UPSTREAM_TRANSPORT=sse`

Start:
- `BRIDGE_MODE=http node ./src/bridge.mjs`

## Upstream configuration examples

### Upstream is a local process
Example:
- `UPSTREAM_TRANSPORT=stdio`
- `UPSTREAM_COMMAND=node`
- `UPSTREAM_ARGS_JSON=["/opt/upstream/mcp-server.mjs"]`

### Upstream is a remote SSE endpoint
Example:
- `UPSTREAM_TRANSPORT=sse`
- `UPSTREAM_SSE_URL=https://example.internal/mcp/sse`
- `UPSTREAM_SSE_POST_URL=https://example.internal/mcp/messages`
- optional `UPSTREAM_SSE_HEADERS_JSON={"Authorization":"Bearer ..."}`

## Tailscale exposure pattern

Recommended pattern:
1. bind the bridge to `127.0.0.1`
2. attach the host to the tailnet
3. expose the local port only through an approved private access path
4. restrict access with ACLs

## Verification steps

1. Hit `/healthz` if HTTP mode is enabled.
2. Open `/sse` and confirm an `endpoint` event is returned.
3. POST a harmless MCP initialization payload to `/messages?session=<id>`.
4. Confirm the upstream response is forwarded back to the client.
