# Fun for Kids Provider Toolkit

This plugin packages the existing Fun for Kids provider automation surface for agent clients like Codex and Claude Code.

## Includes

- A Codex plugin manifest at `.codex-plugin/plugin.json`
- A Claude Code plugin manifest at `.claude-plugin/plugin.json`
- A Claude Code marketplace manifest at `.claude-plugin/marketplace.json`
- A root `plugin.json` for repo-style packaging
- A local MCP config pointing at `http://localhost:3000/api/mcp`
- One public provider workflow skill:
  - `fun-for-kids-provider`

## Local test flow

1. Start the app locally with `bun run dev`.
2. Install the plugin from `plugins/fun-for-kids-provider-toolkit`.
3. When the MCP client connects to `http://localhost:3000/api/mcp`, complete the OAuth consent flow.
4. Use the plugin skill to drive read-first, dry-run-first business workflows.

## Claude Code packaging

This folder now includes the same Claude-facing packaging pattern Shopify uses:

- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`

The marketplace manifest uses `source: "./"` so the folder can be split into its own repository later without changing the plugin metadata.

## Publish shape

If you publish this as a standalone Claude Code plugin repo, the repo root should be this folder:

- `.claude-plugin/`
- `.codex-plugin/`
- `.mcp.json`
- `plugin.json`
- `skills/`
- `README.md`

## Claude Code install shape

Once this folder lives in its own public repository, the expected Claude Code install flow should mirror Shopify's pattern:

```text
/plugin marketplace add <owner>/<repo>
/plugin install fun-for-kids-provider-toolkit@fun-for-kids-provider-toolkit
```

The exact `<owner>/<repo>` depends on where you publish the standalone toolkit repository.

## Notes

- The checked-in `.mcp.json` is intentionally local-first for development.
- For staging or production testing, change the MCP URL to your deployed `https://.../api/mcp` host.
- The monorepo export script can inject the deployed host into the standalone repo with `FUN_FOR_KIDS_MCP_URL=https://<your-host>/api/mcp bun run ai-agents:export`.
- The GitHub sync workflow supports either `FUN_FOR_KIDS_AI_AGENTS_DEPLOY_KEY` or `FUN_FOR_KIDS_AI_AGENTS_PUSH_TOKEN`, plus the MCP host secret `FUN_FOR_KIDS_AI_AGENTS_MCP_URL`.
- The provider runtime already enforces idempotency, dry-run approvals, audit logging, and delegated scopes.
- The plugin exposes one provider-facing skill on purpose. Admin-only workflows can stay in internal tooling instead of the public provider install.
