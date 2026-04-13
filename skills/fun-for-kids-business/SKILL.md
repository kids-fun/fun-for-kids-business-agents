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

## Connection Rules

- Use the MCP tools first. Do not inspect local repo files to decide how to answer a normal business request.
- Do not use Vercel CLI, local curl probes, or plugin config inspection during normal business workflows.
- If MCP is unavailable or authentication has not completed, stop quickly and tell the user the Fun for Kids MCP connection is unavailable instead of exploring the environment.
- Do not infer business data from local files. Business data must come from MCP tool responses.

## Workflow Areas

### Leads and CRM

- `provider.leads.list`
- `provider.leads.create`
- `provider.leads.update`
- `provider.leads.timeline.list`
- `provider.leads.timeline.add`
- `provider.leads.timeline.update`
- `provider.leads.timeline.delete`
- `provider.leads.convert_to_booking`
- `provider.customers.list`
- `provider.customers.create_with_contact`
- `provider.customers.update`
- `provider.customers.journey.get`
- `provider.contacts.create`
- `provider.contacts.update`

### Bookings and Sessions

- `provider.bookings.create_from_contact`
- `provider.bookings.cancel`
- `provider.bookings.update_payment_status`
- `provider.bookings.unbook_assignments`
- `provider.bookings.transfer_assignment`
- `provider.bookings.convert_between_experiences`
- `provider.bookings.redeem_makeup_credit`
- `provider.sessions.list`
- `provider.sessions.list_occupancy`
- `provider.sessions.manager_overview.get`
- `provider.sessions.roster.get`
- `provider.sessions.schedule_roster_grid.get`
- `provider.sessions.sync`
- `provider.attendance.upsert`
- `provider.attendance.bulk_upsert`

### Comms and Tasks

- `provider.tasks.list`
- `provider.tasks.create`
- `provider.tasks.update`
- `provider.tasks.reorder`
- `provider.tasks.delete`
- `provider.comms.overview.get`
- `provider.comms.drafts.save`
- `provider.comms.templates.create`
- `provider.comms.templates.update`
- `provider.comms.templates.delete`
- `provider.comms.campaigns.delete`
- `provider.comms.campaigns.send`

### Listings and Business Setup

- `provider.activities.list`
- `provider.activities.create`
- `provider.activities.update`
- `provider.activities.publish`
- `provider.programs.list`
- `provider.programs.create`
- `provider.programs.update`
- `provider.programs.publish`
- `provider.places.list`
- `provider.places.create`
- `provider.places.update`
- `provider.places.publish`
- `provider.provider.update`
- `provider.provider.primary_location.upsert`

## Safety Rules

- Do not skip read-before-write validation.
- Do not live-run medium/high risk writes without a matching dry-run approval.
- Treat comms sends and business policy changes as high-scrutiny operations.
- Do not use admin-scoped tools in the business-facing plugin workflow.
