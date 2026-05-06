# Bridge Skill: Recreate the Poke-to-MCP Bridge

## Purpose

This skill documents how another Poke instance can recreate the bridge architecture used with the Pi in a separate, sanitized build.

The goal is to preserve the operational model while removing all secrets, personal data, and sensitive credentials from the repository.

## Core idea

The bridge sits between Poke and the MCP services:
- Poke decides what action is needed
- the bridge maps that action to a specific MCP tool
- MCP services perform the external operation
- results are returned to Poke in a normalized, predictable format

## Architectural principles

1. Separation of concerns
   - Poke handles reasoning and task orchestration
   - the bridge handles protocol and tool invocation details
   - MCP servers handle external capabilities

2. Explicit interfaces
   - each tool should have a clear name, input shape, and output shape
   - avoid implicit behavior and hidden side effects

3. Sanitized configuration
   - no secrets in git
   - no private user data in examples
   - use placeholders for all environment-specific values

4. Reproducibility
   - another Poke instance should be able to rebuild the bridge from this document alone
   - setup instructions should not depend on undocumented local state

## MCP setup

To reproduce the bridge, configure the following layers in the target environment:

- Poke runtime
  - the agent that receives user intent
  - the orchestrator that calls tools

- Bridge adapter
  - a thin layer that translates Poke operations into MCP tool calls
  - should be deterministic and easy to test

- MCP server connections
  - connect only the services needed for the target workflow
  - keep credentials in runtime secrets or provider-managed auth flows

### Recommended connection pattern

- define the tool list explicitly
- validate each tool before using it in production flows
- keep endpoint and auth details outside the repository
- use separate configuration for development, staging, and production

## Setup steps

1. Create a clean repository
   - initialize a new GitHub repo or branch
   - add README.md and SKILL.md first

2. Add bridge documentation
   - describe the architecture
   - document the tool flow
   - list runtime assumptions and security rules

3. Implement the adapter layer
   - translate Poke actions into MCP calls
   - normalize responses
   - handle errors consistently

4. Configure runtime secrets externally
   - use environment variables or a secret manager
   - never commit private values

5. Test the bridge safely
   - use non-sensitive sample data
   - verify tool invocation, error handling, and response formatting
   - confirm that the repository remains clean after testing

6. Publish only sanitized artifacts
   - remove machine-specific files
   - remove logs with private information
   - review diffs before sharing

## Operating rules for another Poke instance

When another Poke instance uses this skill, it should:
- read this file before trying to build the bridge
- keep the implementation generic and reusable
- avoid hardcoding personal or account-specific data
- prefer documented configuration over manual one-off steps
- store any required credentials outside source control

## Safe placeholders

Use placeholder values like these in any example configuration:
- POKE_MCP_ENDPOINT=https://example.invalid/mcp
- POKE_MCP_TOKEN=<stored-outside-git>
- POKE_BRIDGE_MODE=development

Do not replace them with real values in committed files.

## Example responsibilities

The bridge may be responsible for:
- invoking repository tools
- coordinating structured workflows
- relaying tool results to Poke
- maintaining a stable interface for future Poke instances

The bridge should not be responsible for:
- storing secrets in source control
- exposing private user details
- depending on undocumented local state

## Definition of done

A sanitized bridge repository is ready when:
- the architecture is documented
- the setup steps are clear
- all examples are generic
- no secrets are present
- another Poke instance can follow the instructions without needing private context
