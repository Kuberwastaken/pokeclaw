#!/usr/bin/env bash
set -euo pipefail

: "${TAILSCALE_AUTHKEY:?Set TAILSCALE_AUTHKEY before running}"
TAILSCALE_HOSTNAME="${TAILSCALE_HOSTNAME:-pokeclaw-bridge}"
TAILSCALE_EXTRA_ARGS="${TAILSCALE_EXTRA_ARGS:-}"

sudo tailscale up \
  --authkey "${TAILSCALE_AUTHKEY}" \
  --hostname "${TAILSCALE_HOSTNAME}" \
  --ssh \
  --accept-dns=false \
  --accept-routes=false \
  ${TAILSCALE_EXTRA_ARGS}

echo "tailscale connected as ${TAILSCALE_HOSTNAME}"
echo "bind the bridge to localhost and expose it only through your private tailnet path"
echo "recommended ACL tag: tag:mcp-bridge"
