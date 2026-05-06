# pokeclaw

A clean, documented reference repository for a separate Poke build that reproduces the bridge architecture used with the Pi.

This repository is intentionally sanitized:
- no secrets
- no private credentials
- no personal data
- no environment-specific tokens

## What this repo is for

This project captures the architecture, setup flow, and MCP wiring needed for another Poke instance to build and run the same bridge pattern in a separate environment.

It is meant to be a production-quality starting point for:
- understanding the bridge layout
- recreating the MCP connection model
- bootstrapping a fresh implementation safely
- documenting the setup so another agent can follow it without additional context

## High-level architecture

The bridge architecture is organized around three layers:

1. Poke instance
   - Coordinates the workflow
   - Chooses tasks and delegates actions
   - Talks to the user and to other systems through tools

2. Bridge layer
   - Translates Poke actions into MCP tool calls
   - Normalizes inputs and outputs
   - Keeps the implementation isolated from provider-specific details

3. MCP-backed services
   - Provide structured capabilities through tools
   - Handle external interactions such as repository operations, automation, or other integrations
   - Remain behind the bridge so the Poke instance only sees stable interfaces

## Design goals

- Keep the implementation reproducible
- Keep secrets out of the repo
- Keep credentials out of code and docs
- Make the bridge easy to reason about
- Make the setup simple enough for another Poke instance to reuse
- Prefer explicit configuration over hidden behavior

## Repository contents

- README.md: overview, architecture, and setup summary
- SKILL.md: the operational skill file for another Poke instance

## Setup assumptions

A fresh deployment should assume:
- a clean GitHub repository
- an external secrets manager or runtime environment for credentials
- MCP servers already provisioned or otherwise reachable
- no sensitive material committed to source control

## Recommended workflow

1. Clone or fork the repository.
2. Review the architecture described in SKILL.md.
3. Configure the bridge layer in the target environment.
4. Point the new Poke instance at the sanitized MCP endpoints.
5. Validate the bridge using non-sensitive test actions.
6. Keep any runtime secrets outside the repository.

## Security and hygiene rules

- Never commit API keys, tokens, cookies, or session material.
- Never commit personal addresses, phone numbers, or private identifiers.
- Keep examples generic and replace real values with placeholders.
- Store credentials in environment variables or a managed secret store.
- Review diffs before publishing or handing the repo to another agent.

## How another Poke instance should use this repo

A second Poke instance can use this repository as the canonical reference for the bridge implementation:
- read SKILL.md first
- identify the MCP services it needs
- recreate the bridge contract in its own runtime
- validate the tools through safe, non-production calls
- avoid introducing repo-local secrets or one-off machine state

## Status

This repository is documentation-first and intentionally clean. It is ready to be extended with implementation files, tests, or deployment scripts as needed.
