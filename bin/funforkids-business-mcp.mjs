#!/usr/bin/env node

import { createServer } from 'node:http'
import { createHash, randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { execSync } from 'node:child_process'
import { createInterface } from 'node:readline'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_MCP_URL = 'https://funforkids.com.au/api/mcp'
const MCP_URL = process.env.FUN_FOR_KIDS_MCP_URL || DEFAULT_MCP_URL
const CONFIG_DIR = join(homedir(), '.funforkids')
const TOKEN_FILE = join(CONFIG_DIR, 'tokens.json')
const SCOPES = [
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
    const mod = parsed.protocol === 'https:' ? import('node:https') : import('node:http')

    mod.then(({ default: http }) => {
      const req = http.request(parsed, {
        method: options.method || 'GET',
        headers: options.headers || {},
      }, (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8')
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body,
            json() { return JSON.parse(body) },
          })
        })
      })

      req.on('error', reject)

      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
      }

      req.end()
    })
  })
}

// ---------------------------------------------------------------------------
// OAuth discovery
// ---------------------------------------------------------------------------

async function discoverOAuth() {
  const parsed = new URL(MCP_URL)
  const base = `${parsed.protocol}//${parsed.host}`
  const path = parsed.pathname

  const res = await httpRequest(`${base}/.well-known/oauth-authorization-server${path}`)
  return res.json()
}

// ---------------------------------------------------------------------------
// Login flow
// ---------------------------------------------------------------------------

async function login() {
  const metadata = await discoverOAuth()

  const regRes = await httpRequest(metadata.registration_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Fun for Kids Business MCP CLI',
      redirect_uris: [],
      grant_types: ['authorization_code'],
      response_types: ['code'],
    }),
  })
  const client = regRes.json()

  const { verifier, challenge } = generatePkce()
  const state = base64url(randomBytes(16))

  const callbackPromise = new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1`)
      if (url.pathname !== '/callback') {
        res.writeHead(404)
        res.end()
        return
      }

      const code = url.searchParams.get('code')
      const returnedState = url.searchParams.get('state')

      if (returnedState !== state) {
        res.writeHead(400)
        res.end('State mismatch')
        reject(new Error('OAuth state mismatch'))
        server.close()
        return
      }

      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end('<html><body><h2>Login successful!</h2><p>You can close this tab.</p></body></html>')
      server.close()
      resolve(code)
    })

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: client.client_id,
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        redirect_uri: `http://127.0.0.1:${port}/callback`,
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
        execSync(`${cmd} "${authorizeUrl}"`, { stdio: 'ignore' })
      } catch {
        // browser open failed, user will copy-paste
      }

      console.error('Waiting for browser callback...')

      // Store redirect_uri and client_id for token exchange
      server._redirectUri = `http://127.0.0.1:${port}/callback`
      server._clientId = client.client_id
    })

    setTimeout(() => {
      reject(new Error('Login timed out after 120 seconds'))
      server.close()
    }, 120_000)
  })

  const code = await callbackPromise

  const tokenRes = await httpRequest(metadata.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: client.client_id,
      code,
      code_verifier: verifier,
    }),
  })

  if (tokenRes.status !== 200) {
    console.error('Token exchange failed:', tokenRes.body)
    process.exit(1)
  }

  const tokenData = tokenRes.json()
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
    console.error('Not logged in. Run: funforkids-business-mcp login')
    process.exit(1)
  }

  let mcpSessionId = null

  async function proxyRpc(payload) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${tokens.access_token}`,
    }

    if (mcpSessionId) {
      headers['Mcp-Session-Id'] = mcpSessionId
    }

    const res = await httpRequest(MCP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (res.headers['mcp-session-id']) {
      mcpSessionId = res.headers['mcp-session-id']
    }

    if (res.status === 401) {
      return {
        jsonrpc: '2.0',
        id: payload.id ?? null,
        error: {
          code: -32001,
          message: 'Authentication expired. Run: funforkids-business-mcp login',
        },
      }
    }

    if (res.status === 202) {
      return null
    }

    try {
      return res.json()
    } catch {
      return {
        jsonrpc: '2.0',
        id: payload.id ?? null,
        error: { code: -32603, message: `Server returned ${res.status}: ${res.body}` },
      }
    }
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

    try {
      const result = await proxyRpc(payload)
      if (result) {
        process.stdout.write(JSON.stringify(result) + '\n')
      }
    } catch (error) {
      const err = {
        jsonrpc: '2.0',
        id: payload.id ?? null,
        error: { code: -32603, message: error.message || 'Proxy error' },
      }
      process.stdout.write(JSON.stringify(err) + '\n')
    }
  }
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
  case 'status': {
    const t = loadTokens()
    if (t) {
      console.error(`Logged in to ${t.mcp_url}`)
      console.error(`  obtained: ${t.obtained_at}`)
      console.error(`  expires_in: ${t.expires_in}s`)
    } else {
      console.error('Not logged in. Run: funforkids-business-mcp login')
    }
    break
  }
  case undefined:
  case 'serve':
    serve().catch((err) => { console.error(err.message); process.exit(1) })
    break
  default:
    console.error(`Usage: funforkids-business-mcp [login|logout|status|serve]`)
    console.error(`   or: npx -y github:kids-fun/fun-for-kids-business-agents [command]`)
    console.error(`\nCommands:`)
    console.error(`  serve    Start stdio MCP server (default)`)
    console.error(`  login    Authenticate with Fun for Kids`)
    console.error(`  logout   Revoke and clear stored token`)
    console.error(`  status   Show current auth status`)
    console.error(`\nEnvironment:`)
    console.error(`  FUN_FOR_KIDS_MCP_URL  Override server URL (default: ${DEFAULT_MCP_URL})`)
    process.exit(1)
}
