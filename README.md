# Fun for Kids Business

Connect AI coding agents to the Fun for Kids business portal.

This plugin bundles the Fun for Kids business skill plus the production MCP server at `https://funforkids.com.au/api/mcp`, so agents can work with leads, customers, bookings, sessions, attendance, comms, tasks, listings, and business settings using the same permission checks as the provider portal.

Public repo: https://github.com/kids-fun/fun-for-kids-business-agents

## Install

### Claude Code

Run these commands in Claude Code:

```text
/plugin marketplace add kids-fun/fun-for-kids-business-agents
/plugin install fun-for-kids-business@fun-for-kids-business
```

Then run:

```text
/reload-plugins
```

Claude Code installs from the GitHub marketplace in this repo at `.claude-plugin/marketplace.json`.

### Codex

Codex public plugin directory publishing is still rolling out, so the current public test path is through the repo marketplace:

```bash
git clone https://github.com/kids-fun/fun-for-kids-business-agents.git
cd fun-for-kids-business-agents
```

Open that folder in Codex, then use the plugin picker to install `Fun for Kids Business` from the `Fun for Kids Business Agents` marketplace.

Codex discovers the plugin from `.agents/plugins/marketplace.json` at the repo root. No Vercel CLI, local Fun for Kids app, or `.env` file is required for end users.

## First Use

When the MCP client connects, complete the Fun for Kids sign-in and consent flow. The account you sign in with determines which businesses can be managed.

After auth, try:

```text
@fun-for-kids-business List my programs.
@fun-for-kids-business List my upcoming schedules.
@fun-for-kids-business Show leads needing follow-up.
@fun-for-kids-business Draft a follow-up message for new leads, but do not send it yet.
```

For write operations, the skill is designed to read first, dry-run first, and ask for confirmation before doing destructive or externally visible work.

## What Is Included

- `.codex-plugin/plugin.json` for Codex.
- `.agents/plugins/marketplace.json` for Codex repo-marketplace installs.
- `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` for Claude Code.
- `.mcp.json` pointing to the Fun for Kids business MCP server.
- `skills/fun-for-kids-business/SKILL.md` with the business workflow instructions.

## Troubleshooting

- If the agent says the MCP connection is unavailable, restart the agent client and reinstall or reload the plugin.
- If you see a localhost or Vercel preview URL, reinstall from the public repo and confirm `.mcp.json` points to `https://funforkids.com.au/api/mcp`.
- If auth fails, sign in again from the prompted browser flow. You need access to at least one Fun for Kids business account.
- If a write action is blocked, check whether the agent is still in dry-run mode or whether your account lacks the required delegated scope.

## Maintainers

The source copy lives in the kids.fun monorepo at `plugins/fun-for-kids-business-agents`.

Export the public repo with the production MCP host:

```bash
FUN_FOR_KIDS_MCP_URL=https://funforkids.com.au/api/mcp bun run business-agents:export
```

Only plugin manifests, skills, and public docs should be published here. Keep application source, secrets, internal admin tooling, and local `.env` files out of this repo.
