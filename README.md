# Fun for Kids Business

Connect AI coding agents to the Fun for Kids business portal.

This plugin bundles the Fun for Kids business skill plus the production MCP server at `https://funforkids.com.au/api/mcp`, so agents can work with leads, customers, bookings, sessions, attendance, comms, tasks, listings, and business settings using the same permission checks as the provider portal.

Public repo: https://github.com/kids-fun/fun-for-kids-business-agents

## Install

### Plugin (recommended)

#### Claude Code

```text
/plugin marketplace add kids-fun/fun-for-kids-business-agents
/plugin install fun-for-kids-business@fun-for-kids-business
/reload-plugins
```

#### Codex

```bash
git clone https://github.com/kids-fun/fun-for-kids-business-agents.git
cd fun-for-kids-business-agents
```

Open that folder in Codex, then use the plugin picker to install **Fun for Kids Business** from the repo marketplace.

#### Cursor

Add the MCP server in **Cursor > Settings > Tools and MCP > New MCP server**:

```json
{
  "mcpServers": {
    "fun-for-kids-business": {
      "command": "npx",
      "args": ["-y", "github:kids-fun/fun-for-kids-business-agents"]
    }
  }
}
```

### Stdio CLI (universal)

Works with any MCP client — Hermes Agent, OpenClaw, Claude Code, Codex, Cursor, Gemini CLI, VS Code.

**Step 1: Login once**

```bash
npx -y github:kids-fun/fun-for-kids-business-agents login
```

This opens a browser window to sign in with your Fun for Kids account. Tokens are stored at `~/.funforkids/tokens.json`.

**Step 2: Add to your agent**

#### Hermes Agent

Add to `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  fun-for-kids-business:
    command: "npx"
    args: ["-y", "github:kids-fun/fun-for-kids-business-agents"]
```

Restart Hermes or run `/reload-mcp` to pick up the new server.

#### OpenClaw

```bash
openclaw mcp set fun-for-kids-business '{"command":"npx","args":["-y","github:kids-fun/fun-for-kids-business-agents"]}'
```

The CLI handles OAuth automatically. On first use, it will prompt you to sign in via the browser. Tokens are stored at `~/.funforkids/tokens.json` and reused across sessions. If the token expires, run `npx -y github:kids-fun/fun-for-kids-business-agents login` to re-authenticate.

#### Claude Code

```bash
claude mcp add --transport stdio fun-for-kids-business -- npx -y github:kids-fun/fun-for-kids-business-agents
```

#### Codex

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.fun-for-kids-business]
command = "npx"
args = ["-y", "github:kids-fun/fun-for-kids-business-agents"]
```

#### Gemini CLI

Add to `settings.json`:

```json
{
  "mcpServers": {
    "fun-for-kids-business": {
      "command": "npx",
      "args": ["-y", "github:kids-fun/fun-for-kids-business-agents"]
    }
  }
}
```

#### VS Code

Open **MCP: Open User Configuration** from the Command Palette and add:

```json
{
  "servers": {
    "fun-for-kids-business": {
      "command": "npx",
      "args": ["-y", "github:kids-fun/fun-for-kids-business-agents"]
    }
  }
}
```

### CLI commands

Once installed, the CLI is available as `funforkids-business-mcp`:

```bash
npx -y github:kids-fun/fun-for-kids-business-agents login     # Authenticate
npx -y github:kids-fun/fun-for-kids-business-agents logout    # Revoke token
npx -y github:kids-fun/fun-for-kids-business-agents status    # Check auth
npx -y github:kids-fun/fun-for-kids-business-agents           # Start MCP server
```

Set `FUN_FOR_KIDS_MCP_URL` to override the server URL for local development:

```bash
FUN_FOR_KIDS_MCP_URL=http://localhost:3000/api/mcp npx -y github:kids-fun/fun-for-kids-business-agents login
```

### npm (optional)

If the package is published to npm, shorter commands work:

```bash
npx funforkids-business-mcp login
```

## First Use

When the MCP client connects, complete the Fun for Kids sign-in and consent flow. The account you sign in with determines which businesses can be managed.

After auth, try:

```text
List my programs.
List my upcoming schedules.
Show leads needing follow-up.
Draft a follow-up message for new leads, but do not send it yet.
```

For write operations, the skill is designed to read first, dry-run first, and ask for confirmation before doing destructive or externally visible work.

## What Is Included

- `bin/funforkids-business-mcp.mjs` — stdio MCP server and CLI.
- `.mcp.json` — MCP client config for plugin-based installs.
- `skills/fun-for-kids-business/SKILL.md` — business workflow instructions.
- `.codex-plugin/plugin.json` — Codex plugin manifest.
- `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` — Claude Code plugin manifest.
- `.agents/plugins/marketplace.json` — Codex repo-marketplace listing.
- `plugin.json` — shared plugin metadata.

## Troubleshooting

- **"Not logged in"** — Run `npx funforkids-business-mcp login` to authenticate.
- **"Authentication expired"** — Re-run login. Tokens have a limited lifetime.
- **MCP connection unavailable** — Restart the agent client and reinstall or reload the plugin.
- **Wrong server URL** — Confirm `.mcp.json` points to `https://funforkids.com.au/api/mcp` or that `FUN_FOR_KIDS_MCP_URL` is set correctly.
- **Write action blocked** — Check whether the agent is still in dry-run mode or whether your account lacks the required delegated scope.

## Maintainers

The source copy lives in the kids.fun monorepo at `plugins/fun-for-kids-business-agents`.

Export the public repo with the production MCP host:

```bash
FUN_FOR_KIDS_MCP_URL=https://funforkids.com.au/api/mcp bun run business-agents:export
```

Only plugin manifests, skills, CLI, and public docs should be published here. Keep application source, secrets, internal admin tooling, and local `.env` files out of this repo.
