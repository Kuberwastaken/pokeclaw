# TOOL_SPEC

This document defines the bridge-facing tool surface that Poke expects the upstream MCP server to provide.

The schemas below are written in JSON Schema style for clarity. All tools accept a JSON object as input unless noted otherwise. Optional fields may be omitted.

Conventions:
- paths are absolute or workspace-relative unless the tool says otherwise
- `timeout` values are in seconds unless the tool says otherwise
- `job_id` refers to the identifier returned by background or agent tools
- all text fields are UTF-8 strings
- tool implementations must avoid leaking secrets, auth headers, or private user data into logs

## 1. shell_exec

Description: run a shell command synchronously and return combined stdout/stderr.

Schema:
{
  "type": "object",
  "required": ["command"],
  "properties": {
    "command": { "type": "string" },
    "timeout": { "type": "number", "minimum": 1, "maximum": 300 },
    "workdir": { "type": "string" }
  },
  "additionalProperties": true
}

Notes:
- use for short-lived commands
- default timeout is implementation-defined, but should be safe for interactive work
- the server must not hardcode secrets into the command string

## 2. shell_bg

Description: start a long-running shell command and return a job identifier.

Schema:
{
  "type": "object",
  "required": ["command"],
  "properties": {
    "command": { "type": "string" },
    "workdir": { "type": "string" }
  },
  "additionalProperties": true
}

Notes:
- use for build, watch, or test tasks that should continue after the tool call returns
- pair with job_status, job_output, and job_kill

## 3. job_status

Description: check whether a background shell job is still running.

Schema:
{
  "type": "object",
  "required": ["job_id"],
  "properties": {
    "job_id": { "type": "string" }
  },
  "additionalProperties": true
}

## 4. job_output

Description: read recent output from a background shell job.

Schema:
{
  "type": "object",
  "required": ["job_id"],
  "properties": {
    "job_id": { "type": "string" },
    "tail": { "type": "number", "minimum": 1 }
  },
  "additionalProperties": true
}

## 5. job_kill

Description: terminate a background shell job.

Schema:
{
  "type": "object",
  "required": ["job_id"],
  "properties": {
    "job_id": { "type": "string" }
  },
  "additionalProperties": true
}

## 6. file_read

Description: read a file with line numbers and optional pagination.

Schema:
{
  "type": "object",
  "required": ["path"],
  "properties": {
    "path": { "type": "string" },
    "offset": { "type": "number", "minimum": 1 },
    "limit": { "type": "number", "minimum": 1 }
  },
  "additionalProperties": true
}

## 7. file_tail

Description: read the last N lines of a file, primarily for logs.

Schema:
{
  "type": "object",
  "required": ["path"],
  "properties": {
    "path": { "type": "string" },
    "lines": { "type": "number", "minimum": 1 }
  },
  "additionalProperties": true
}

## 8. file_write

Description: overwrite a file with the provided content.

Schema:
{
  "type": "object",
  "required": ["path", "content"],
  "properties": {
    "path": { "type": "string" },
    "content": { "type": "string" }
  },
  "additionalProperties": true
}

## 9. file_append

Description: append content to a file, creating it if necessary.

Schema:
{
  "type": "object",
  "required": ["path", "content"],
  "properties": {
    "path": { "type": "string" },
    "content": { "type": "string" }
  },
  "additionalProperties": true
}

## 10. file_edit

Description: replace an exact string with another exact string inside a file.

Schema:
{
  "type": "object",
  "required": ["path", "old_string", "new_string"],
  "properties": {
    "path": { "type": "string" },
    "old_string": { "type": "string" },
    "new_string": { "type": "string" }
  },
  "additionalProperties": true
}

Notes:
- the match should be exact
- use when a surgical edit is safer than rewriting the whole file

## 11. file_delete

Description: delete a file or an empty directory.

Schema:
{
  "type": "object",
  "required": ["path"],
  "properties": {
    "path": { "type": "string" }
  },
  "additionalProperties": true
}

## 12. file_move

Description: move or rename a file or directory.

Schema:
{
  "type": "object",
  "required": ["src", "dst"],
  "properties": {
    "src": { "type": "string" },
    "dst": { "type": "string" }
  },
  "additionalProperties": true
}

## 13. file_list

Description: list files in a directory, optionally filtered by a glob pattern.

Schema:
{
  "type": "object",
  "properties": {
    "path": { "type": "string" },
    "pattern": { "type": "string" }
  },
  "additionalProperties": true
}

## 14. grep_files

Description: search file contents by regex pattern.

Schema:
{
  "type": "object",
  "required": ["pattern"],
  "properties": {
    "pattern": { "type": "string" },
    "path": { "type": "string" },
    "glob": { "type": "string" },
    "ignore_case": { "type": "boolean" },
    "max_results": { "type": "number", "minimum": 1 }
  },
  "additionalProperties": true
}

## 15. process_list

Description: list running processes, optionally filtered by a substring.

Schema:
{
  "type": "object",
  "properties": {
    "filter": { "type": "string" }
  },
  "additionalProperties": true
}

## 16. messages_send

Description: send a message through the messaging gateway.

Schema:
{
  "type": "object",
  "required": ["target", "message"],
  "properties": {
    "target": { "type": "string" },
    "message": { "type": "string" }
  },
  "additionalProperties": true
}

Notes:
- target format is `platform:identifier`
- keep content concise and free of secrets unless the user explicitly asks otherwise

## 17. events_poll

Description: poll for new conversation events.

Schema:
{
  "type": "object",
  "properties": {
    "session_key": { "type": "string" },
    "after_cursor": { "type": "number", "minimum": 0 },
    "limit": { "type": "number", "minimum": 1 }
  },
  "additionalProperties": true
}

## 18. typing_keepalive

Description: send repeated typing indicators to a messaging platform.

Schema:
{
  "type": "object",
  "required": ["target"],
  "properties": {
    "target": { "type": "string" },
    "seconds": { "type": "number", "minimum": 1, "maximum": 120 }
  },
  "additionalProperties": true
}

## 19. events_wait

Description: block until a new conversation event arrives or the timeout expires.

Schema:
{
  "type": "object",
  "properties": {
    "session_key": { "type": "string" },
    "after_cursor": { "type": "number", "minimum": 0 },
    "timeout": { "type": "number", "minimum": 1, "maximum": 55 }
  },
  "additionalProperties": true
}

## 20. agent_spawn

Description: spawn a sub-agent for a task and return immediately with a job identifier.

Schema:
{
  "type": "object",
  "required": ["prompt"],
  "properties": {
    "model": { "type": "string" },
    "prompt": { "type": "string" },
    "toolsets": { "type": "string" },
    "max_turns": { "type": "number", "minimum": 1, "maximum": 30 }
  },
  "additionalProperties": true
}

Notes:
- intended for delegated work that can run independently
- toolsets should be explicit and minimal

## 21. agent_poll

Description: poll a running sub-agent for status and recent output.

Schema:
{
  "type": "object",
  "required": ["job_id"],
  "properties": {
    "job_id": { "type": "string" },
    "tail": { "type": "number", "minimum": 1 }
  },
  "additionalProperties": true
}

## 22. agent_result

Description: block until a sub-agent finishes and return its final output.

Schema:
{
  "type": "object",
  "required": ["job_id"],
  "properties": {
    "job_id": { "type": "string" },
    "timeout": { "type": "number", "minimum": 1, "maximum": 300 }
  },
  "additionalProperties": true
}

## Tool usage guidance

- use `shell_exec` for short commands and `shell_bg` for long-running work
- use file tools for all repository edits and inspection
- use `grep_files` before rewriting large areas when looking for a precise string
- use `events_wait` for reactive message handling rather than polling when possible
- use `agent_spawn` only when the task can be delegated cleanly
- keep all tool outputs free of personal data unless the task explicitly requires it
