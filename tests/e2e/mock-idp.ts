import { createServer, type IncomingMessage, type Server } from 'node:http'
import { randomUUID } from 'node:crypto'

/**
 * A tiny OAuth2/OIDC identity provider for LOCAL tests only.
 *
 * Real Google sign-in needs a Google account and consent screen, so it cannot
 * run unattended. This stands in for it behind GoTrue's `keycloak` provider
 * (the only provider whose endpoint URL can be pointed at a local server),
 * which lets the whole pipeline run for real except Google itself:
 *
 *   browser → GoTrue /authorize → [this IdP] → GoTrue /callback (token +
 *   userinfo fetched server-to-server) → user/identity created or linked →
 *   app /auth/callback?code → PKCE exchange in the browser → session cookies
 *
 * Nothing here proves Google-specific behaviour (consent screen, account
 * chooser, Google's claim set) — see docs/auth/google-sign-in-onboarding.md.
 */
export interface MockIdentity {
  sub: string
  email: string
  name: string
  emailVerified: boolean
}

export type NextAuthorization = { kind: 'approve', identity: MockIdentity } | { kind: 'deny' }

export interface MockIdp {
  /** What the next authorization request does (approve as an identity, or the user cancels). */
  setNext: (next: NextAuthorization) => void
  close: () => Promise<void>
}

async function readForm(req: IncomingMessage): Promise<URLSearchParams> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'))
}

export function identity(email: string, name = 'Test Person', emailVerified = true): MockIdentity {
  return { sub: `mock-${randomUUID()}`, email, name, emailVerified }
}

export async function startMockIdp(port = 55690): Promise<MockIdp> {
  let next: NextAuthorization = { kind: 'deny' }
  const codes = new Map<string, MockIdentity>()

  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://mock-idp.local')

    // 1. Authorization endpoint — the browser lands here from GoTrue.
    if (url.pathname.endsWith('/protocol/openid-connect/auth')) {
      const target = new URL(url.searchParams.get('redirect_uri') ?? '')
      const state = url.searchParams.get('state')
      if (next.kind === 'deny') {
        target.searchParams.set('error', 'access_denied')
        target.searchParams.set('error_description', 'The user denied access')
      }
      else {
        const code = randomUUID()
        codes.set(code, next.identity)
        target.searchParams.set('code', code)
      }
      if (state) target.searchParams.set('state', state)
      res.writeHead(302, { location: target.toString() }).end()
      return
    }

    // 2. Token endpoint — called by GoTrue, server to server.
    if (url.pathname.endsWith('/protocol/openid-connect/token') && req.method === 'POST') {
      const form = await readForm(req)
      const code = form.get('code') ?? ''
      if (!codes.has(code)) {
        res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'invalid_grant' }))
        return
      }
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
        access_token: code, token_type: 'Bearer', expires_in: 3600,
      }))
      return
    }

    // 3. Userinfo endpoint — the profile GoTrue turns into an identity.
    if (url.pathname.endsWith('/protocol/openid-connect/userinfo')) {
      const code = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
      const who = codes.get(code)
      if (!who) {
        res.writeHead(401).end()
        return
      }
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
        sub: who.sub,
        email: who.email,
        email_verified: who.emailVerified,
        name: who.name,
        preferred_username: who.email,
      }))
      return
    }

    res.writeHead(404).end()
  })

  // 0.0.0.0: the GoTrue container reaches it as host.docker.internal.
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '0.0.0.0', resolve)
  })

  return {
    setNext: (n) => { next = n },
    close: () => new Promise<void>(resolve => server.close(() => resolve())),
  }
}
