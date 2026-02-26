---
description: how to auto-run all commands without user approval
---
// turbo-all

This workflow enables automatic execution of all terminal commands without requiring manual approval.

When this workflow is active, ALL `run_command` tool calls should use `SafeToAutoRun: true`.

## Steps

1. All terminal commands should be executed with `SafeToAutoRun: true`
2. No manual approval is needed for any command
3. The agent should proceed autonomously without waiting for user confirmation on commands
