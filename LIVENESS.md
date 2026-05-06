# LIVENESS

This guide describes the minimum handshake and connectivity checks for the MCP bridge.

## Goal

Confirm that:
- the bridge process is alive
- the bridge transport is reachable
- the upstream MCP connection works
- the session can carry at least one harmless tool call end to end

## Supported bridge endpoints

HTTP/SSE mode:
- `GET /healthz` — basic process health
- `GET /sse` — opens a server-sent event stream
- `POST /messages?session=<session_id>` — forwards a JSON-RPC message into the session

stdio mode:
- a client writes newline-delimited JSON-RPC messages to stdin
- the bridge writes newline-delimited JSON-RPC messages to stdout

## Handshake sequence

### HTTP/SSE mode
1. Start the bridge in HTTP mode.
2. Request `GET /healthz` and verify a 200 response with `{"ok":true}`.
3. Request `GET /sse` and capture the returned `endpoint` event.
4. Extract the session-specific POST URL from that event.
5. Send an MCP `initialize` request as JSON to the POST URL.
6. Confirm the bridge returns a valid JSON-RPC response on the SSE stream.
7. Send one harmless tool request, such as `file_list` or `process_list`, and confirm the response returns on the SSE stream.

### stdio mode
1. Start the bridge in stdio mode.
2. Send an MCP `initialize` request over stdin using newline-delimited JSON.
3. Confirm the bridge writes a valid JSON-RPC response to stdout.
4. Send one harmless tool request and confirm the response is returned.

## What counts as a valid liveness check

A liveness check should verify all of the following:
- the bridge process accepts input
- the transport does not hang
- the upstream connection responds
- one no-op or low-risk tool call succeeds

Safe example tool calls:
- `process_list` with no filter
- `file_list` on a known workspace directory
- `grep_files` with a narrow pattern in a known path

## Failure handling

If the check fails:
- record the transport mode
- record the upstream transport mode
- record the first failing step
- avoid logging raw secrets or private payloads
- reconnect and retry only after the configured backoff interval

## Session hygiene

- expire stale HTTP sessions after a bounded timeout
- close upstream connections when a client disconnects
- keep keepalive comments enabled in SSE mode
- remove session state when the client closes the stream

## Minimal acceptance criteria

The bridge is live when:
- `/healthz` returns ok in HTTP mode, or stdio initializes successfully
- `/sse` emits an `endpoint` event in HTTP mode
- `initialize` succeeds over the active transport
- one harmless tool call completes successfully
