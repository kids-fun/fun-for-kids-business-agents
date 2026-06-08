---
name: fun-for-kids-business
description: Business workflows for leads, customers, bookings, sessions, attendance, comms, tasks, content, and settings over the Fun for Kids MCP server.
homepage: https://github.com/kids-fun/fun-for-kids-business-agents
metadata:
  openclaw:
    emoji: "🧒"
    requires:
      mcp: ["fun-for-kids-business"]
    install:
      - id: "mcp"
        kind: "mcp"
        server: "fun-for-kids-business"
        config:
          command: "npx"
          args: ["-y", "github:kids-fun/fun-for-kids-business-agents"]
        label: "Add Fun for Kids Business MCP server"
      - id: "login"
        kind: "shell"
        command: "npx -y github:kids-fun/fun-for-kids-business-agents login"
        label: "Sign in to Fun for Kids"
---

# Fun for Kids Business

Use this skill when a business user wants to manage their operations through the Fun for Kids MCP server.

## Setup

The skill requires the `fun-for-kids-business` MCP server. The server is a stdio proxy backed by a CLI:

```
npx -y github:kids-fun/fun-for-kids-business-agents serve
```

First-time users must authenticate:

```
npx -y github:kids-fun/fun-for-kids-business-agents login
```

This opens a browser for OAuth sign-in. Tokens are cached at `~/.fun-for-kids/tokens.json`.

Check connection status:

```
npx -y github:kids-fun/fun-for-kids-business-agents status
```

## Mental Model

- One plugin
- One MCP server
- One business-facing skill

The MCP tool catalog is still organized by domain, but the user should not have to think in terms of separate `provider-ops`, `content-ops`, or `admin-ops` installs.

## Workflow

1. Start with `context.list_accessible_providers` or `provider.context.get`.
2. Work inside one explicit `providerId` at a time.
3. Read current state first before any mutation.
4. Use the narrowest domain tool that matches the request.
5. For write tools, always send `_meta` with:
   - `tool_risk`
   - `requires_confirmation`
   - `idempotency_key`
   - `dry_run` for medium/high risk tools
   - `approval_token` for live medium/high writes after dry-run
6. After writes, confirm what changed and note any follow-up actions.

## References

- Read `references/provider-tool-catalog.md` when choosing exact MCP tools, checking operation names, or auditing tool coverage.
- Read `references/provider-workflows.md` for workflow-specific rules, especially transfers, make-ups, attendance, class disruptions, split classes, and high-risk writes.

## Connection Rules

- Use the MCP tools first. Do not inspect local repo files to decide how to answer a normal business request.
- Do not use Vercel CLI, local curl probes, or plugin config inspection during normal business workflows.
- If MCP is unavailable or authentication has not completed, stop quickly and tell the user the Fun for Kids MCP connection is unavailable instead of exploring the environment.
- Do not infer business data from local files. Business data must come from MCP tool responses.
