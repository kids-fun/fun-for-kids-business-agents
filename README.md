# Fun for Kids Business

Connect AI coding agents to the Fun for Kids business portal.

This plugin bundles the Fun for Kids business skill plus the production MCP server at `https://funforkids.com.au/api/mcp`, so agents can work with leads, customers, bookings, sessions, attendance, comms, tasks, listings, and business settings using the same permission checks as the provider portal.

Public repo: https://github.com/kids-fun/fun-for-kids-business-agents

Current toolkit version: **0.2.0**

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

The CLI handles the OAuth sign-in flow. Tokens are stored at `~/.funforkids/tokens.json` and reused until they expire. The server does not currently issue refresh tokens, so an expired or revoked login requires `npx -y github:kids-fun/fun-for-kids-business-agents login` again.

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
npx -y github:kids-fun/fun-for-kids-business-agents status    # Verify auth and server connectivity
npx -y github:kids-fun/fun-for-kids-business-agents version   # Show the running CLI version
npx -y github:kids-fun/fun-for-kids-business-agents           # Start MCP server
```

Set `FUN_FOR_KIDS_MCP_URL` to override the server URL for local development:

```bash
FUN_FOR_KIDS_MCP_URL=http://localhost:3000/api/mcp npx -y github:kids-fun/fun-for-kids-business-agents login
```

HTTP requests time out after 15 seconds by default. For a slower private deployment, set `FUN_FOR_KIDS_MCP_REQUEST_TIMEOUT_MS` to a positive value up to 120000.

The proxy automatically creates a new MCP session when an expired session interrupts a read. It does not automatically replay writes: it reconnects and returns an error asking the client to retry the write explicitly. Consecutive read tools can run concurrently, while writes remain ordered behind earlier requests.

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
- **Connection status is unclear** — Run `npx -y github:kids-fun/fun-for-kids-business-agents status`. It performs an authenticated MCP handshake and exits unsuccessfully when the endpoint cannot be reached.
- **"MCP session restarted"** — The failed write was not replayed. Retry it explicitly once the agent has reviewed the returned error.
- **MCP connection unavailable** — Check the status command, then restart the agent client and reinstall or reload the plugin if needed.
- **Wrong server URL** — Confirm `.mcp.json` points to `https://funforkids.com.au/api/mcp` or that `FUN_FOR_KIDS_MCP_URL` is set correctly.
- **Write action blocked** — Check whether the agent is still in dry-run mode or whether your account lacks the required delegated scope.

## Maintainers

The source copy lives in the kids.fun monorepo at `plugins/fun-for-kids-business-agents`.

Export the public repo with the production MCP host:

```bash
FUN_FOR_KIDS_MCP_URL=https://funforkids.com.au/api/mcp bun run business-agents:export
```

The default GitHub package spec follows the standalone repo's current default branch so fresh installs keep working before a release tag exists. For a reproducible release, create the standalone release commit and export its install commands with an immutable tag or full commit ref:

```bash
FUN_FOR_KIDS_MCP_URL=https://funforkids.com.au/api/mcp \
FUN_FOR_KIDS_MCP_PACKAGE_SPEC='<immutable GitHub package spec>' \
bun run business-agents:export
```

For example, the package spec for an existing `v0.2.0` release would end in `#v0.2.0`. Use that command only when the referenced tag or commit will exist for the exported standalone revision. The export validates manifest versions, CLI syntax, required public files, package references, and sensitive-file exclusions.

Only plugin manifests, skills, CLI, and public docs should be published here. Keep application source, secrets, internal admin tooling, and local `.env` files out of this repo.
