import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'

const CLI = resolve('bin/funforkids-business-mcp.mjs')

function json(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers })
  res.end(JSON.stringify(body))
}

async function fakeServer(handler) {
  const server = createServer(async (req, res) => {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const payload = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null
    await handler({ req, res, payload })
  })
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen))
  const address = server.address()
  return {
    url: `http://127.0.0.1:${address.port}/api/mcp`,
    close: () => new Promise((resolveClose) => server.close(resolveClose)),
  }
}

function makeHome(url, tokenOverrides = {}) {
  const home = mkdtempSync(join(tmpdir(), 'ffk-business-mcp-'))
  const tokenDir = join(home, '.tokens')
  mkdirSync(tokenDir)
  const tokenFile = join(tokenDir, 'tokens.json')
  writeFileSync(tokenFile, `${JSON.stringify({
    access_token: 'fake-access-token',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'provider.*',
    obtained_at: new Date().toISOString(),
    mcp_url: url,
    ...tokenOverrides,
  })}\n`)
  return { home, tokenFile }
}

function cliEnv(home, url, extra = {}) {
  return {
    ...process.env,
    HOME: home,
    FUN_FOR_KIDS_MCP_URL: url,
    FUN_FOR_KIDS_MCP_TOKEN_DIR: '.tokens',
    FUN_FOR_KIDS_MCP_REQUEST_TIMEOUT_MS: '250',
    ...extra,
  }
}

function startCli(home, url, extraEnv = {}) {
  const child = spawn(process.execPath, [CLI, 'serve'], {
    cwd: resolve('.'),
    env: cliEnv(home, url, extraEnv),
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const waiting = new Map()
  const buffered = new Map()
  let stdout = ''
  let stderr = ''

  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk) => { stderr += chunk })
  child.stdout.on('data', (chunk) => {
    stdout += chunk
    while (stdout.includes('\n')) {
      const newline = stdout.indexOf('\n')
      const line = stdout.slice(0, newline)
      stdout = stdout.slice(newline + 1)
      if (!line) continue
      const message = JSON.parse(line)
      const waiter = waiting.get(message.id)
      if (waiter) {
        waiting.delete(message.id)
        waiter.resolve(message)
      } else {
        buffered.set(message.id, message)
      }
    }
  })

  function send(payload) {
    const existing = buffered.get(payload.id)
    if (existing) {
      buffered.delete(payload.id)
      return Promise.resolve(existing)
    }
    const response = new Promise((resolveResponse, rejectResponse) => {
      const timer = setTimeout(() => {
        waiting.delete(payload.id)
        rejectResponse(new Error(`Timed out waiting for response ${payload.id}; stderr=${stderr}`))
      }, 2_000)
      waiting.set(payload.id, {
        resolve(message) {
          clearTimeout(timer)
          resolveResponse(message)
        },
      })
    })
    child.stdin.write(`${JSON.stringify(payload)}\n`)
    return response
  }

  async function stop() {
    child.stdin.end()
    const exit = await new Promise((resolveExit) => {
      child.once('exit', (code, signal) => resolveExit({ code, signal }))
    })
    return { ...exit, stderr }
  }

  return { child, send, stop }
}

async function runCliCommand(home, url, command, extraEnv = {}) {
  const child = spawn(process.execPath, [CLI, command], {
    cwd: resolve('.'),
    env: cliEnv(home, url, extraEnv),
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk) => { stdout += chunk })
  child.stderr.on('data', (chunk) => { stderr += chunk })
  const status = await new Promise((resolveExit) => child.once('exit', resolveExit))
  return { status, stdout, stderr }
}

function initialize(id = 1) {
  return {
    jsonrpc: '2.0',
    id,
    method: 'initialize',
    params: {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'transport-test', version: '1.0.0' },
    },
  }
}

test('status has a bounded HTTP timeout', async () => {
  const server = await fakeServer(async () => {
    // Intentionally leave the response open until the client timeout destroys it.
  })
  const { home } = makeHome(server.url)

  const result = await runCliCommand(home, server.url, 'status', {
    FUN_FOR_KIDS_MCP_REQUEST_TIMEOUT_MS: '40',
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Request timed out after 40ms/)
  await server.close()
})

test('status rejects expired and revoked authentication with a relogin instruction', async (t) => {
  await t.test('expired stored token is rejected without a request', async () => {
    let requests = 0
    const server = await fakeServer(async ({ res }) => {
      requests += 1
      json(res, 500, {})
    })
    const { home, tokenFile } = makeHome(server.url, {
      expires_in: 60,
      obtained_at: new Date(Date.now() - 120_000).toISOString(),
    })

    const result = spawnSync(process.execPath, [CLI, 'status'], {
      cwd: resolve('.'), env: cliEnv(home, server.url), encoding: 'utf8',
    })

    assert.equal(result.status, 1)
    assert.match(result.stderr, /Authentication expired.*Run: funforkids-business-mcp login/)
    assert.equal(existsSync(tokenFile), false)
    assert.equal(requests, 0)
    await server.close()
  })

  await t.test('server-rejected token is cleared', async () => {
    const server = await fakeServer(async ({ res, payload }) => {
      assert.equal(payload.method, 'initialize')
      json(res, 401, {
        jsonrpc: '2.0',
        id: payload.id,
        error: { code: -32001, message: 'Authentication required' },
      })
    })
    const { home, tokenFile } = makeHome(server.url)

    const result = await runCliCommand(home, server.url, 'status')

    assert.equal(result.status, 1)
    assert.match(result.stderr, /expired or was revoked.*Run: funforkids-business-mcp login/)
    assert.equal(existsSync(tokenFile), false)
    await server.close()
  })
})

test('status verifies an authenticated MCP handshake and closes its probe session', async () => {
  let deletes = 0
  const server = await fakeServer(async ({ req, res, payload }) => {
    if (req.method === 'DELETE') {
      deletes += 1
      assert.equal(req.headers['mcp-session-id'], 'status-session')
      json(res, 200, { closed: true })
      return
    }
    assert.equal(payload.method, 'initialize')
    json(res, 200, { jsonrpc: '2.0', id: payload.id, result: {} }, {
      'Mcp-Session-Id': 'status-session',
    })
  })
  const { home } = makeHome(server.url)

  const result = await runCliCommand(home, server.url, 'status')

  assert.equal(result.status, 0)
  assert.match(result.stderr, new RegExp(`Connected to ${server.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
  assert.match(result.stderr, /CLI version: 0\.2\.0/)
  assert.equal(deletes, 1)
  await server.close()
})

test('expired MCP session is reinitialized and a read is retried once', async () => {
  let initializeCount = 0
  let readCount = 0
  const server = await fakeServer(async ({ req, res, payload }) => {
    if (payload.method === 'initialize') {
      initializeCount += 1
      json(res, 200, { jsonrpc: '2.0', id: payload.id, result: {} }, {
        'Mcp-Session-Id': initializeCount === 1 ? 'old-session' : 'new-session',
      })
      return
    }
    if (payload.method === 'notifications/initialized') {
      res.writeHead(202)
      res.end()
      return
    }
    if (payload.method === 'tools/list') {
      readCount += 1
      if (req.headers['mcp-session-id'] === 'old-session') {
        json(res, 401, {
          jsonrpc: '2.0',
          id: payload.id,
          error: {
            code: -32001,
            message: 'MCP session is invalid or expired',
            data: { code: 'AUTH_REQUIRED' },
          },
        })
      } else {
        assert.equal(req.headers['mcp-session-id'], 'new-session')
        json(res, 200, { jsonrpc: '2.0', id: payload.id, result: { tools: [] } })
      }
      return
    }
    throw new Error(`Unexpected method: ${payload.method}`)
  })
  const { home } = makeHome(server.url)
  const cli = startCli(home, server.url)

  await cli.send(initialize())
  const response = await cli.send({ jsonrpc: '2.0', id: 2, method: 'tools/list' })

  assert.deepEqual(response.result, { tools: [] })
  assert.equal(initializeCount, 2)
  assert.equal(readCount, 2)
  const exit = await cli.stop()
  assert.equal(exit.code, 0)
  await server.close()
})

test('session recovery never automatically replays a write', async () => {
  let initializeCount = 0
  let writeAttempts = 0
  const server = await fakeServer(async ({ req, res, payload }) => {
    if (payload.method === 'initialize') {
      initializeCount += 1
      json(res, 200, { jsonrpc: '2.0', id: payload.id, result: {} }, {
        'Mcp-Session-Id': initializeCount === 1 ? 'old-session' : 'new-session',
      })
      return
    }
    if (payload.method === 'notifications/initialized') {
      res.writeHead(202)
      res.end()
      return
    }
    if (payload.method === 'tools/call') {
      writeAttempts += 1
      if (req.headers['mcp-session-id'] === 'old-session') {
        json(res, 401, {
          jsonrpc: '2.0',
          id: payload.id,
          error: {
            code: -32001,
            message: 'MCP session is invalid or expired',
            data: { code: 'AUTH_REQUIRED' },
          },
        })
      } else {
        json(res, 200, { jsonrpc: '2.0', id: payload.id, result: { content: [] } })
      }
      return
    }
    throw new Error(`Unexpected method: ${payload.method}`)
  })
  const { home } = makeHome(server.url)
  const cli = startCli(home, server.url)

  await cli.send(initialize())
  const write = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'provider.leads.update', arguments: { providerId: 1, leadId: 2 } },
  }
  const first = await cli.send(write)

  assert.equal(first.error.code, -32003)
  assert.match(first.error.message, /not replayed automatically/)
  assert.equal(writeAttempts, 1)

  const second = await cli.send({ ...write, id: 3 })
  assert.deepEqual(second.result, { content: [] })
  assert.equal(writeAttempts, 2)
  const exit = await cli.stop()
  assert.equal(exit.code, 0)
  await server.close()
})

test('independent reads run concurrently and an ensuing write remains ordered', async () => {
  let inFlightReads = 0
  let maxInFlightReads = 0
  const pendingReads = []
  const events = []
  const server = await fakeServer(async ({ res, payload }) => {
    if (payload.method === 'initialize') {
      json(res, 200, { jsonrpc: '2.0', id: payload.id, result: {} }, { 'Mcp-Session-Id': 'session' })
      return
    }
    if (payload.method !== 'tools/call') throw new Error(`Unexpected method: ${payload.method}`)

    if (payload.params.name.endsWith('.list')) {
      events.push(`read-${payload.id}-start`)
      inFlightReads += 1
      maxInFlightReads = Math.max(maxInFlightReads, inFlightReads)
      pendingReads.push({ res, payload })
      if (pendingReads.length === 2) {
        for (const pending of pendingReads) {
          inFlightReads -= 1
          events.push(`read-${pending.payload.id}-end`)
          json(pending.res, 200, { jsonrpc: '2.0', id: pending.payload.id, result: { content: [] } })
        }
      }
      return
    }

    events.push('write-start')
    json(res, 200, { jsonrpc: '2.0', id: payload.id, result: { content: [] } })
  })
  const { home } = makeHome(server.url)
  const cli = startCli(home, server.url)

  await cli.send(initialize())
  const readOne = cli.send({
    jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: { name: 'provider.leads.list', arguments: { providerId: 1 } },
  })
  const readTwo = cli.send({
    jsonrpc: '2.0', id: 3, method: 'tools/call',
    params: { name: 'provider.customers.list', arguments: { providerId: 1 } },
  })
  const write = cli.send({
    jsonrpc: '2.0', id: 4, method: 'tools/call',
    params: { name: 'provider.tasks.update', arguments: { providerId: 1, taskId: 9 } },
  })

  await Promise.all([readOne, readTwo, write])
  assert.equal(maxInFlightReads, 2)
  assert.ok(events.indexOf('write-start') > events.indexOf('read-2-end'))
  assert.ok(events.indexOf('write-start') > events.indexOf('read-3-end'))
  const exit = await cli.stop()
  assert.equal(exit.code, 0)
  await server.close()
})
