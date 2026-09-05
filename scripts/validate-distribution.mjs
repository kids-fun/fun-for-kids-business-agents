#!/usr/bin/env node

import { lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve, join, relative, sep } from 'node:path'
import { spawnSync } from 'node:child_process'

const DEFAULT_PACKAGE_SPEC = 'github:kids-fun/fun-for-kids-business-agents'
const PACKAGE_SPEC_PATTERN = /github:kids-fun\/fun-for-kids-business-agents(?:#[A-Za-z0-9._/-]+)?/g
const REQUIRED_FILES = [
  '.agents/plugins/marketplace.json',
  '.claude-plugin/marketplace.json',
  '.claude-plugin/plugin.json',
  '.codex-plugin/plugin.json',
  '.mcp.json',
  'README.md',
  'bin/funforkids-business-mcp.mjs',
  'package.json',
  'plugin.json',
  'skills/fun-for-kids-business/SKILL.md',
]
const VERSIONED_MANIFESTS = [
  ['package.json', (json) => json.version],
  ['plugin.json', (json) => json.version],
  ['.codex-plugin/plugin.json', (json) => json.version],
  ['.claude-plugin/plugin.json', (json) => json.version],
  ['.claude-plugin/marketplace.json', (json) => json.plugins?.[0]?.version],
]
const FORBIDDEN_NAMES = new Set(['.env', '.env.local', '.npmrc', 'credentials.json', 'tokens.json'])
const ALLOWED_TOP_LEVEL = new Set([
  '.agents',
  '.claude-plugin',
  '.codex-plugin',
  '.mcp.json',
  'README.md',
  'bin',
  'package.json',
  'plugin.json',
  'scripts',
  'skills',
  'tests',
])

function usage() {
  console.error('Usage: validate-distribution.mjs [ROOT] [--rewrite-package-spec SPEC] [--expect-package-spec SPEC]')
}

function parseArgs(argv) {
  let root = '.'
  let rewritePackageSpec = null
  let expectedPackageSpec = null

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--rewrite-package-spec' || arg === '--expect-package-spec') {
      const value = argv[index + 1]
      if (!value) throw new Error(`${arg} requires a value`)
      if (arg === '--rewrite-package-spec') rewritePackageSpec = value
      else expectedPackageSpec = value
      index += 1
    } else if (arg === '-h' || arg === '--help') {
      usage()
      process.exit(0)
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`)
    } else if (root === '.') {
      root = arg
    } else {
      throw new Error(`Unexpected argument: ${arg}`)
    }
  }

  return {
    root: resolve(root),
    rewritePackageSpec,
    expectedPackageSpec: expectedPackageSpec ?? rewritePackageSpec ?? DEFAULT_PACKAGE_SPEC,
  }
}

function parseJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    throw new Error(`Invalid JSON in ${file}: ${error.message}`)
  }
}

function walk(root, current = root) {
  const results = []
  for (const entry of readdirSync(current)) {
    if (entry === '.git' || entry === '.DS_Store') continue
    const absolute = join(current, entry)
    const stat = lstatSync(absolute)
    const display = relative(root, absolute)
    if (stat.isSymbolicLink()) throw new Error(`Symlinks are not allowed in the public distribution: ${display}`)
    if (FORBIDDEN_NAMES.has(entry) || entry.startsWith('.env.')) {
      throw new Error(`Sensitive configuration file is not allowed in the public distribution: ${display}`)
    }
    results.push(display)
    if (stat.isDirectory()) results.push(...walk(root, absolute))
  }
  return results
}

function rewritePackageSpec(root, packageSpec) {
  if (!/^github:kids-fun\/fun-for-kids-business-agents(?:#[A-Za-z0-9._/-]+)?$/.test(packageSpec)) {
    throw new Error(`Unsupported package spec: ${packageSpec}`)
  }

  const textFiles = [
    'README.md',
    'bin/funforkids-business-mcp.mjs',
    'skills/fun-for-kids-business/SKILL.md',
  ]
  for (const file of textFiles) {
    const absolute = join(root, file)
    const source = readFileSync(absolute, 'utf8')
    const updated = source.replace(PACKAGE_SPEC_PATTERN, packageSpec)
    if (updated === source && packageSpec !== DEFAULT_PACKAGE_SPEC && !source.includes(packageSpec)) {
      throw new Error(`Could not rewrite package spec in ${file}`)
    }
    writeFileSync(absolute, updated)
  }

  const mcpPath = join(root, '.mcp.json')
  const mcp = parseJson(mcpPath)
  const server = mcp.mcpServers?.['fun-for-kids-business']
  if (server?.command !== 'npx' || !Array.isArray(server.args)) {
    throw new Error('.mcp.json must define the stdio npx server')
  }
  const packageIndex = server.args.findIndex((arg) => String(arg).startsWith(DEFAULT_PACKAGE_SPEC))
  if (packageIndex < 0) throw new Error('.mcp.json does not contain the expected GitHub package spec')
  server.args[packageIndex] = packageSpec
  writeFileSync(mcpPath, `${JSON.stringify(mcp, null, 2)}\n`)
}

function validate(root, expectedPackageSpec) {
  const files = walk(root)
  for (const entry of readdirSync(root)) {
    if (entry === '.git' || entry === '.DS_Store') continue
    if (!ALLOWED_TOP_LEVEL.has(entry)) throw new Error(`Unexpected top-level distribution entry: ${entry}`)
  }
  for (const file of REQUIRED_FILES) {
    if (!files.includes(file.split('/').join(sep))) throw new Error(`Missing required distribution file: ${file}`)
  }

  const versions = VERSIONED_MANIFESTS.map(([file, select]) => {
    const version = select(parseJson(join(root, file)))
    if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
      throw new Error(`Invalid version in ${file}: ${String(version)}`)
    }
    return [file, version]
  })
  const expectedVersion = versions[0][1]
  const mismatched = versions.filter(([, version]) => version !== expectedVersion)
  if (mismatched.length > 0) {
    throw new Error(`Manifest versions do not match ${expectedVersion}: ${mismatched.map(([file, version]) => `${file}=${version}`).join(', ')}`)
  }

  const cli = readFileSync(join(root, 'bin/funforkids-business-mcp.mjs'), 'utf8')
  if (!cli.includes(`const CLI_VERSION = '${expectedVersion}'`)) {
    throw new Error(`CLI_VERSION does not match manifest version ${expectedVersion}`)
  }
  if (!cli.includes('redirect_uris: [redirectUri]') || cli.includes('redirect_uris: []')) {
    throw new Error('OAuth client registration must contain the loopback redirect URI')
  }

  const mcp = parseJson(join(root, '.mcp.json'))
  const server = mcp.mcpServers?.['fun-for-kids-business']
  const args = server?.args
  if (!Array.isArray(args) || !args.includes(expectedPackageSpec)) {
    throw new Error(`.mcp.json does not use expected package spec: ${expectedPackageSpec}`)
  }
  const configuredUrl = server?.url ?? server?.env?.FUN_FOR_KIDS_MCP_URL
  if (configuredUrl) {
    const parsedUrl = new URL(configuredUrl)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error(`Unsupported MCP URL protocol: ${parsedUrl.protocol}`)
    if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1' || parsedUrl.hostname === '::1') {
      throw new Error(`Localhost MCP URL is not allowed in the public distribution: ${configuredUrl}`)
    }
  }

  for (const file of ['README.md', 'bin/funforkids-business-mcp.mjs', 'skills/fun-for-kids-business/SKILL.md']) {
    const matches = readFileSync(join(root, file), 'utf8').match(PACKAGE_SPEC_PATTERN) ?? []
    if (matches.length === 0 || matches.some((match) => match !== expectedPackageSpec)) {
      throw new Error(`${file} does not reference expected package spec: ${expectedPackageSpec}`)
    }
  }

  const syntax = spawnSync(process.execPath, ['--check', join(root, 'bin/funforkids-business-mcp.mjs')], {
    encoding: 'utf8',
  })
  if (syntax.status !== 0) throw new Error(`CLI syntax check failed: ${syntax.stderr || syntax.stdout}`)

  console.log(`Validated Fun for Kids business agents ${expectedVersion}`)
  console.log(`  root: ${root}`)
  console.log(`  package: ${expectedPackageSpec}`)
}

try {
  const options = parseArgs(process.argv.slice(2))
  if (options.rewritePackageSpec) rewritePackageSpec(options.root, options.rewritePackageSpec)
  validate(options.root, options.expectedPackageSpec)
} catch (error) {
  console.error(`Distribution validation failed: ${error.message}`)
  process.exit(1)
}
