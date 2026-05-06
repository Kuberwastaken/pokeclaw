#!/usr/bin/env bash
set -euo pipefail

: "${TAILSCALE_AUTHKEY:?Set TAILSCALE_AUTHKEY to a pre-approved auth key before running}"
TAILSCALE_HOSTNAME="${TAILSCALE_HOSTNAME:-pokeclaw-bridge}"
BRIDGE_PORT="${BRIDGE_PORT:-8787}"
BRIDGE_BIND_HOST="${BRIDGE_BIND_HOST:-127.0.0.1}"

# Attach this host to the tailnet.
# Recommended Tailscale ACL tag for this host: tag:mcp-bridge
sudo tailscale up \
  --authkey "${TAILSCALE_AUTHKEY}" \
  --hostname "${TAILSCALE_HOSTNAME}" \
  --ssh \
  --accept-dns=false \
  --accept-routes=false

echo
printf 'Bridge should listen on http://%s:%s\n' "$BRIDGE_BIND_HOST" "$BRIDGE_PORT"
echo 'Keep the service bound to localhost and publish it only through your chosen Tailscale mechanism or reverse proxy.'
echo 'Suggested operational pattern:'
echo '  1) run the bridge on 127.0.0.1:8787'
echo '  2) expose it over the tailnet using your approved private routing approach'
echo '  3) protect the endpoint with Tailscale ACLs and, if applicable, a service-specific auth token'
