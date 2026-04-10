# Fun for Kids Business

This plugin packages the existing Fun for Kids business automation surface for agent clients like Codex and Claude Code.

## Includes

- A Codex plugin manifest at `.codex-plugin/plugin.json`
- A Claude Code plugin manifest at `.claude-plugin/plugin.json`
- A Claude Code marketplace manifest at `.claude-plugin/marketplace.json`
- A root `plugin.json` for repo-style packaging
- An MCP config pointing at the Fun for Kids business MCP endpoint
- One public business workflow skill:
  - `fun-for-kids-business`

## Codex install flow

For public repo testing, open the standalone business agents repo in Codex and install the plugin from the repo marketplace at `.agents/plugins/marketplace.json`.

For personal testing, add a personal marketplace entry at `~/.agents/plugins/marketplace.json` that points to a local copy of this plugin under `~/.codex/plugins/`.

After you change the plugin, restart Codex so it picks up the updated local bundle.

## Public test flow

1. Open this toolkit repo in Codex.
2. Install `Fun for Kids Business`.
3. When the MCP client connects to the Fun for Kids MCP endpoint, complete the OAuth consent flow.
4. Start a new thread and use `@fun-for-kids-business`.
5. Use the plugin skill to drive read-first, dry-run-first business workflows.

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

Once this folder lives in its own repository, the expected Claude Code install flow should mirror Shopify's pattern:

```text
/plugin marketplace add <owner>/<repo>
/plugin install fun-for-kids-business@fun-for-kids-business
```

The exact `<owner>/<repo>` depends on where you publish the standalone toolkit repository.

## Notes

- The monorepo source `.mcp.json` is intentionally local-first for development.
- The exported standalone repo should carry the deployed MCP host.
- For staging or production testing, export with the desired `https://.../api/mcp` host.
- The monorepo export script can inject the deployed host into the standalone repo with `FUN_FOR_KIDS_MCP_URL=https://<your-host>/api/mcp bun run business-agents:export`.
- The GitHub sync workflow supports either `FUN_FOR_KIDS_BUSINESS_AGENTS_DEPLOY_KEY` or `FUN_FOR_KIDS_BUSINESS_AGENTS_PUSH_TOKEN`, plus the MCP host secret `FUN_FOR_KIDS_BUSINESS_AGENTS_MCP_URL`.
- The provider runtime already enforces idempotency, dry-run approvals, audit logging, and delegated scopes.
- The plugin exposes one business-facing skill on purpose. Internal admin workflows can stay out of the public install.
