# Server-side maintenance plan

This document describes the server components that must exist to keep the MCP bridge reliable over time.

## 1. Runtime process

Run the bridge as a long-lived service under a process manager such as systemd, s6, or a container orchestrator.

Responsibilities:
- launch the bridge on boot
- restart on crash
- restart on config change or deployment
- keep stdout and stderr captured in structured logs

Recommended settings:
- bind HTTP only to `127.0.0.1` unless the service is intentionally fronted by a private proxy
- run as a dedicated non-root user
- load all secrets from environment variables or a secret manager

## 2. Transport termination

The bridge itself should remain transport-agnostic. The server must decide how the endpoint is exposed.

Supported patterns:
- local stdio for a direct MCP client
- local HTTP/SSE for a remote client
- private exposure through Tailscale or a private reverse proxy

Server responsibilities:
- terminate TLS if the endpoint is reachable over HTTPS
- preserve SSE headers and disable buffering for event streams
- forward only the minimum required headers

## 3. Tailscale connectivity

If the bridge is reachable through Tailscale, the host must be managed as a private service node.

Responsibilities:
- install and authenticate Tailscale with a short-lived or pre-approved auth key
- assign a stable hostname
- apply ACLs to limit who can reach the bridge
- avoid public exposure unless explicitly intended

Operational notes:
- keep the service on localhost and publish it through the tailnet only
- rotate auth keys as part of normal secret hygiene
- record the hostname and tailnet route in deployment notes

## 4. Configuration management

Everything should be environment-driven.

Server needs to manage:
- bridge mode (`stdio`, `http`, or `both`)
- upstream transport settings
- upstream command and arguments for stdio mode
- upstream SSE URL and POST URL for SSE upstreams
- reconnect timing
- session timeout values

Best practices:
- store runtime config in an `.env` file or secret store outside the repo
- keep example values in the repository only
- never commit tokens, auth keys, or service credentials

## 5. Health and readiness

Expose a lightweight health endpoint if HTTP mode is enabled.

The server should verify:
- the process is alive
- the HTTP listener is reachable
- the bridge can open an upstream connection

Add readiness checks that can be used by:
- systemd watchdogs
- container health checks
- deployment pipelines

## 6. Logging and observability

The bridge should produce enough information to debug connection issues without logging message contents that may be sensitive.

Log:
- startup and shutdown events
- upstream connection failures
- reconnect attempts
- invalid JSON or transport errors
- session creation and cleanup

Avoid logging:
- secrets
- raw authorization headers
- full payloads unless the environment is explicitly non-production and debug logging is enabled

## 7. Upgrade path

Treat the bridge as an independently deployable service.

Server-side upgrade process:
- deploy a new build to a staging instance
- verify one stdio client and one SSE client can connect
- confirm the Tailscale endpoint still resolves
- roll forward gradually
- keep rollback artifacts for the previous version

## 8. Failure handling

The bridge must be able to recover from:
- upstream process exit
- temporary network loss
- SSE disconnects
- malformed client messages

Server responsibilities:
- restart the process when needed
- let the bridge reconnect to SSE upstreams if configured
- keep idle sessions bounded by timeout
- clean up stale session state after disconnects

## 9. What the server owner still needs to build

The repository provides the bridge logic, but the server owner still needs to supply:
- the actual upstream MCP server command or endpoint
- Tailscale authentication and ACL policy
- the process supervisor configuration
- the private endpoint exposure path
- secrets management for any upstream auth material
- deployment and rollback automation

## 10. Minimal deployment checklist

- [ ] choose stdio, HTTP/SSE, or both
- [ ] set upstream transport variables
- [ ] attach the host to Tailscale
- [ ] run the bridge under a service manager
- [ ] confirm health endpoint returns ok
- [ ] verify one sample MCP request succeeds end to end
- [ ] record the final endpoint and transport settings in deployment notes
