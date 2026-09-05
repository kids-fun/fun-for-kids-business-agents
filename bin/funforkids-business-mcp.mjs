#!/usr/bin/env node

import http, { createServer } from 'node:http'
import https from 'node:https'
import { createHash, randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { createInterface } from 'node:readline'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_MCP_URL = 'https://funforkids.com.au/api/mcp'
const CLI_VERSION = '0.2.0'
const CLI_NAME = process.env.FUN_FOR_KIDS_MCP_CLI_NAME || 'funforkids-business-mcp'
const CLIENT_NAME = process.env.FUN_FOR_KIDS_MCP_CLIENT_NAME || 'Fun for Kids Business MCP CLI'
const PACKAGE_SPEC = process.env.FUN_FOR_KIDS_MCP_PACKAGE_SPEC || 'github:kids-fun/fun-for-kids-business-agents'
const TOKEN_DIR_NAME = process.env.FUN_FOR_KIDS_MCP_TOKEN_DIR || '.funforkids'
const MCP_URL = process.env.FUN_FOR_KIDS_MCP_URL || DEFAULT_MCP_URL
const CONFIG_DIR = join(homedir(), TOKEN_DIR_NAME)
const TOKEN_FILE = join(CONFIG_DIR, 'tokens.json')
const REQUEST_TIMEOUT_MS = parsePositiveInteger(process.env.FUN_FOR_KIDS_MCP_REQUEST_TIMEOUT_MS, 15_000)
const DEFAULT_SCOPES = [
  'context.list_accessible_providers',
  'provider.*',
  'provider.context.get',
  'provider.leads.*',
  'provider.customers.*',
  'provider.contacts.*',
  'provider.bookings.*',
  'provider.sessions.*',
  'provider.attendance.*',
  'provider.team.*',
  'provider.tasks.*',
  'provider.comms.*',
  'provider.activities.*',
  'provider.programs.*',
  'provider.places.*',
  'provider.provider.*',
  'admin.providers.list',
  'admin.provider.execute_as_provider_scope',
]
const SCOPES = process.env.FUN_FOR_KIDS_MCP_SCOPES
  ? process.env.FUN_FOR_KIDS_MCP_SCOPES.split(/\s+/).map((scope) => scope.trim()).filter(Boolean)
  : DEFAULT_SCOPES

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 120_000) : fallback
}

// ---------------------------------------------------------------------------
// Token storage
// ---------------------------------------------------------------------------

function loadTokens() {
  try {
    return JSON.parse(readFileSync(TOKEN_FILE, 'utf8'))
  } catch {
    return null
  }
}

function saveTokens(tokens) {
  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2) + '\n', { mode: 0o600 })
}

function clearTokens() {
  try {
    unlinkSync(TOKEN_FILE)
  } catch { /* ignore */ }
}

function tokenExpiresAt(tokens) {
  const obtainedAt = Date.parse(tokens?.obtained_at ?? '')
  const expiresIn = Number(tokens?.expires_in)
  if (!Number.isFinite(obtainedAt) || !Number.isFinite(expiresIn) || expiresIn <= 0) return null
  return new Date(obtainedAt + expiresIn * 1000)
}

function isTokenExpired(tokens) {
  const expiresAt = tokenExpiresAt(tokens)
  return expiresAt ? expiresAt.getTime() <= Date.now() : false
}

function loginInstruction() {
  return `Run: ${CLI_NAME} login`
}

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

function base64url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function generatePkce() {
  const verifier = base64url(randomBytes(32))
  const challenge = base64url(createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}

// ---------------------------------------------------------------------------
// HTTP helpers (zero-dep)
// ---------------------------------------------------------------------------

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const transport = parsed.protocol === 'https:' ? https : http
    const method = options.method || 'GET'
    const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS
    let settled = false

    const req = transport.request(parsed, {
      method,
      headers: options.headers || {},
    }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        if (settled) return
        settled = true
        const body = Buffer.concat(chunks).toString('utf8')
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body,
          json() { return JSON.parse(body) },
        })
      })
    })

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timed out after ${timeoutMs}ms (${method} ${parsed.origin}${parsed.pathname})`))
    })
    req.on('error', (error) => {
      if (settled) return
      settled = true
      reject(error)
    })

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
    }

    req.end()
  })
}

function parseJsonResponse(response) {
  try {
    return response.json()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// OAuth discovery
// ---------------------------------------------------------------------------

async function discoverOAuth() {
  const parsed = new URL(MCP_URL)
  const base = `${parsed.protocol}//${parsed.host}`
  const path = parsed.pathname

  const res = await httpRequest(`${base}/.well-known/oauth-authorization-server${path}`)
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`OAuth discovery failed (${res.status}): ${res.body}`)
  }
  const metadata = res.json()
  if (!metadata.authorization_endpoint || !metadata.registration_endpoint || !metadata.token_endpoint) {
    throw new Error('OAuth discovery response is missing required endpoints')
  }
  return metadata
}

// ---------------------------------------------------------------------------
// Login flow
// ---------------------------------------------------------------------------

async function login() {
  const metadata = await discoverOAuth()
  const { verifier, challenge } = generatePkce()
  const state = base64url(randomBytes(16))

  let callbackResolve
  let callbackReject
  const callbackPromise = new Promise((resolve, reject) => {
    callbackResolve = resolve
    callbackReject = reject
  })

  const server = createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1`)
    if (url.pathname !== '/callback') {
      res.writeHead(404)
      res.end()
      return
    }

    const code = url.searchParams.get('code')
    const oauthError = url.searchParams.get('error')
    const returnedState = url.searchParams.get('state')

    if (returnedState !== state) {
      res.writeHead(400)
      res.end('State mismatch')
      callbackReject(new Error('OAuth state mismatch'))
      server.close()
      return
    }

    if (oauthError || !code) {
      const message = oauthError ? `OAuth authorization failed: ${oauthError}` : 'OAuth callback did not include an authorization code'
      res.writeHead(400)
      res.end(message)
      callbackReject(new Error(message))
      server.close()
      return
    }

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end('<html><body><h2>Login successful!</h2><p>You can close this tab.</p></body></html>')
    server.close()
    callbackResolve(code)
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  const redirectUri = `http://127.0.0.1:${server.address().port}/callback`
  const regRes = await httpRequest(metadata.registration_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: CLIENT_NAME,
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code'],
      response_types: ['code'],
    }),
  })

  if (regRes.status < 200 || regRes.status >= 300) {
    server.close()
    throw new Error(`OAuth client registration failed: ${regRes.body}`)
  }

  const client = regRes.json()
  if (!client.client_id) {
    server.close()
    throw new Error('OAuth client registration did not return a client_id')
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: client.client_id,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    redirect_uri: redirectUri,
    scope: SCOPES.join(' '),
  })

  const authorizeUrl = `${metadata.authorization_endpoint}?${params}`

  console.error(`\nOpen this URL to sign in:\n${authorizeUrl}\n`)

  try {
    const cmd = process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open'
    if (process.platform === 'win32') {
      execFileSync('cmd', ['/c', 'start', '', authorizeUrl], { stdio: 'ignore' })
    } else {
      execFileSync(cmd, [authorizeUrl], { stdio: 'ignore' })
    }
  } catch {
    // browser open failed, user will copy-paste
  }

  console.error('Waiting for browser callback...')

  const timeout = setTimeout(() => {
    callbackReject(new Error('Login timed out after 120 seconds'))
    server.close()
  }, 120_000)

  const code = await callbackPromise.finally(() => clearTimeout(timeout))
  if (!code) {
    throw new Error('OAuth callback did not include an authorization code')
  }

  const tokenRes = await httpRequest(metadata.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: client.client_id,
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  })

  if (tokenRes.status !== 200) {
    throw new Error(`Token exchange failed: ${tokenRes.body}`)
  }

  const tokenData = tokenRes.json()
  if (!tokenData.access_token) {
    throw new Error('Token exchange did not return an access_token')
  }
  saveTokens({
    access_token: tokenData.access_token,
    token_type: tokenData.token_type,
    expires_in: tokenData.expires_in,
    scope: tokenData.scope,
    obtained_at: new Date().toISOString(),
    mcp_url: MCP_URL,
  })

  console.error('Login successful. Token stored at', TOKEN_FILE)
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

async function logout() {
  const tokens = loadTokens()
  if (!tokens) {
    console.error('No stored tokens.')
    return
  }

  try {
    const metadata = await discoverOAuth()
    if (metadata.revocation_endpoint) {
      await httpRequest(metadata.revocation_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokens.access_token }),
      })
    }
  } catch {
    // revocation is best-effort
  }

  clearTokens()
  console.error('Logged out. Tokens cleared.')
}

// ---------------------------------------------------------------------------
// Stdio MCP proxy server
// ---------------------------------------------------------------------------

async function serve() {
  const tokens = loadTokens()
  if (!tokens?.access_token) {
    console.error(`Not logged in. ${loginInstruction()}`)
    process.exit(1)
  }
  if (isTokenExpired(tokens)) {
    const expiresAt = tokenExpiresAt(tokens)
    clearTokens()
    console.error(`Authentication expired${expiresAt ? ` at ${expiresAt.toISOString()}` : ''}. ${loginInstruction()}`)
    process.exit(1)
  }
  if (tokens.mcp_url && tokens.mcp_url !== MCP_URL) {
    console.error(`Stored login is for ${tokens.mcp_url}, but this client is configured for ${MCP_URL}. ${loginInstruction()}`)
    process.exit(1)
  }

  let mcpSessionId = null
  let sessionResetPromise = null
  let authenticationInvalid = false

  function rpcError(payload, code, message) {
    return {
      jsonrpc: '2.0',
      id: payload.id ?? null,
      error: { code, message },
    }
  }

  function requestHeaders(includeSession = true) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${tokens.access_token}`,
    }
    if (includeSession && mcpSessionId) headers['Mcp-Session-Id'] = mcpSessionId
    return headers
  }

  async function rawRpc(payload, { includeSession = true } = {}) {
    const res = await httpRequest(MCP_URL, {
      method: 'POST',
      headers: requestHeaders(includeSession),
      body: JSON.stringify(payload),
    })
    if (res.headers['mcp-session-id']) mcpSessionId = res.headers['mcp-session-id']
    return res
  }

  function isSessionExpiry(response, body) {
    if (response.status !== 401 || !body?.error) return false
    const message = String(body.error.message ?? '')
    const code = body.error.data?.code
    return code === 'AUTH_REQUIRED' && (
      /MCP session is invalid or expired/i.test(message) ||
      /Mcp-Session-Id header is required/i.test(message) ||
      /Call initialize first/i.test(message)
    )
  }

  function isIndependentRead(payload) {
    if (payload.method === 'tools/list' || payload.method === 'ping') return true
    if (payload.method !== 'tools/call') return false
    const name = String(payload.params?.name ?? '')
    return /(?:^|\.)(?:list|get|resolve|search|check)$/.test(name) || /(?:_check|_occupancy)$/.test(name)
  }

  async function initializeSession() {
    if (sessionResetPromise) return sessionResetPromise

    sessionResetPromise = (async () => {
      mcpSessionId = null
      const initializePayload = {
        jsonrpc: '2.0',
        id: `session-restart-${Date.now()}`,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: CLIENT_NAME, version: CLI_VERSION },
        },
      }
      const response = await rawRpc(initializePayload, { includeSession: false })
      const body = parseJsonResponse(response)
      if (response.status === 401) {
        authenticationInvalid = true
        clearTokens()
        throw new Error(`Authentication expired. ${loginInstruction()}`)
      }
      if (response.status < 200 || response.status >= 300 || body?.error) {
        throw new Error(`MCP session restart failed (${response.status}): ${body?.error?.message ?? response.body}`)
      }
      if (!mcpSessionId) throw new Error('MCP session restart did not return Mcp-Session-Id')

      const initializedResponse = await rawRpc({ jsonrpc: '2.0', method: 'notifications/initialized' })
      if (initializedResponse.status < 200 || initializedResponse.status >= 300) {
        throw new Error(`MCP session restart notification failed (${initializedResponse.status})`)
      }
    })().finally(() => {
      sessionResetPromise = null
    })

    return sessionResetPromise
  }

  async function proxyRpc(payload) {
    if (authenticationInvalid || isTokenExpired(tokens)) {
      authenticationInvalid = true
      clearTokens()
      return rpcError(payload, -32001, `Authentication expired. ${loginInstruction()}`)
    }

    let res = await rawRpc(payload)
    let body = parseJsonResponse(res)

    if (isSessionExpiry(res, body) && payload.method !== 'initialize') {
      try {
        await initializeSession()
      } catch (error) {
        return rpcError(
          payload,
          authenticationInvalid ? -32001 : -32603,
          error.message || (authenticationInvalid ? `Authentication expired. ${loginInstruction()}` : 'MCP session restart failed')
        )
      }
      if (!isIndependentRead(payload)) {
        return rpcError(
          payload,
          -32003,
          'MCP session restarted. Retry this write request explicitly; it was not replayed automatically.'
        )
      }
      res = await rawRpc(payload)
      body = parseJsonResponse(res)
    }

    if (res.status === 401) {
      authenticationInvalid = true
      clearTokens()
      return rpcError(payload, -32001, `Authentication expired. ${loginInstruction()}`)
    }

    if (res.status === 202) {
      return null
    }

    return body ?? rpcError(payload, -32603, `Server returned ${res.status}: ${res.body}`)
  }

  let orderingBarrier = Promise.resolve()
  const activeReads = new Set()
  const activeRequests = new Set()

  function scheduleRpc(payload) {
    let request
    if (isIndependentRead(payload)) {
      request = orderingBarrier.then(() => proxyRpc(payload))
      activeReads.add(request)
      request.finally(() => activeReads.delete(request))
    } else {
      const earlierReads = [...activeReads]
      activeReads.clear()
      request = orderingBarrier
        .then(() => Promise.allSettled(earlierReads))
        .then(() => proxyRpc(payload))
      orderingBarrier = request.then(() => undefined, () => undefined)
    }

    activeRequests.add(request)
    request
      .then((result) => {
        if (result) process.stdout.write(JSON.stringify(result) + '\n')
      })
      .catch((error) => {
        process.stdout.write(JSON.stringify(rpcError(payload, -32603, error.message || 'Proxy error')) + '\n')
      })
      .finally(() => activeRequests.delete(request))
  }

  const rl = createInterface({ input: process.stdin })

  for await (const line of rl) {
    if (!line.trim()) continue

    let payload
    try {
      payload = JSON.parse(line)
    } catch {
      const err = { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }
      process.stdout.write(JSON.stringify(err) + '\n')
      continue
    }

    scheduleRpc(payload)
  }

  await Promise.allSettled([...activeRequests])
}

async function status() {
  const tokens = loadTokens()
  if (!tokens?.access_token) throw new Error(`Not logged in. ${loginInstruction()}`)

  const expiresAt = tokenExpiresAt(tokens)
  if (isTokenExpired(tokens)) {
    clearTokens()
    throw new Error(`Authentication expired${expiresAt ? ` at ${expiresAt.toISOString()}` : ''}. ${loginInstruction()}`)
  }
  if (tokens.mcp_url && tokens.mcp_url !== MCP_URL) {
    throw new Error(`Stored login is for ${tokens.mcp_url}, but this client is configured for ${MCP_URL}. ${loginInstruction()}`)
  }

  const initializeResponse = await httpRequest(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${tokens.access_token}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'status-check',
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: CLIENT_NAME, version: CLI_VERSION },
      },
    }),
  })
  const body = parseJsonResponse(initializeResponse)
  if (initializeResponse.status === 401) {
    clearTokens()
    throw new Error(`Authentication expired or was revoked. ${loginInstruction()}`)
  }
  if (initializeResponse.status < 200 || initializeResponse.status >= 300 || body?.error) {
    throw new Error(`Connection check failed (${initializeResponse.status}): ${body?.error?.message ?? initializeResponse.body}`)
  }

  const sessionId = initializeResponse.headers['mcp-session-id']
  if (!sessionId) throw new Error('Connection check failed: server did not return Mcp-Session-Id')

  try {
    await httpRequest(MCP_URL, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${tokens.access_token}`,
        'Mcp-Session-Id': sessionId,
      },
    })
  } catch {
    // The authenticated initialize already proved connectivity; session cleanup is best-effort.
  }

  console.error(`Connected to ${MCP_URL}`)
  console.error(`  CLI version: ${CLI_VERSION}`)
  console.error(`  authenticated: ${tokens.obtained_at ?? 'unknown'}`)
  console.error(`  token expires: ${expiresAt?.toISOString() ?? 'not provided by server'}`)
  console.error(`  scope: ${tokens.scope ?? 'not provided by server'}`)
}

// ---------------------------------------------------------------------------
// CLI dispatch
// ---------------------------------------------------------------------------

const command = process.argv[2]

switch (command) {
  case 'login':
    login().catch((err) => { console.error(err.message); process.exit(1) })
    break
  case 'logout':
    logout().catch((err) => { console.error(err.message); process.exit(1) })
    break
  case 'status':
    status().catch((err) => { console.error(err.message); process.exit(1) })
    break
  case '--version':
  case 'version':
    console.log(CLI_VERSION)
    break
  case undefined:
  case 'serve':
    serve().catch((err) => { console.error(err.message); process.exit(1) })
    break
  default:
    console.error(`Usage: ${CLI_NAME} [login|logout|status|serve|version]`)
    console.error(`   or: npx -y ${PACKAGE_SPEC} [command]`)
    console.error(`\nCommands:`)
    console.error(`  serve    Start stdio MCP server (default)`)
    console.error(`  login    Authenticate with Fun for Kids`)
    console.error(`  logout   Revoke and clear stored token`)
    console.error(`  status   Verify authentication and MCP connectivity`)
    console.error(`  version  Show CLI version`)
    console.error(`\nEnvironment:`)
    console.error(`  FUN_FOR_KIDS_MCP_URL  Override server URL (default: ${DEFAULT_MCP_URL})`)
    console.error(`  FUN_FOR_KIDS_MCP_TOKEN_DIR  Override token dir under home (default: ${TOKEN_DIR_NAME})`)
    console.error(`  FUN_FOR_KIDS_MCP_SCOPES  Space-separated OAuth scopes`)
    console.error(`  FUN_FOR_KIDS_MCP_REQUEST_TIMEOUT_MS  HTTP timeout in milliseconds (default: ${REQUEST_TIMEOUT_MS})`)
    process.exit(1)
}
