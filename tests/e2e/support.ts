import { randomUUID } from 'node:crypto'
import { expect, type Page } from '@playwright/test'

export const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:55324'
export const PASSWORD = 'Oqoudi123'

export function uniqueEmail(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}@test.oqoudi.local`
}

/** Polls the local mail catcher for the newest message to `email` and returns the first link matching `pattern`. */
export async function linkFromEmail(email: string, pattern: RegExp): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)
    const list = await res.json() as { messages?: { ID: string }[] }
    const id = list.messages?.[0]?.ID
    if (id) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${id}`)).json() as { Text: string, HTML: string }
      const body = `${msg.Text}\n${msg.HTML}`.replace(/&amp;/g, '&')
      const match = body.match(pattern)
      if (match) return match[0]
    }
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error(`No email for ${email}`)
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await open(page, '/auth/login')
  await page.getByLabel('البريد الإلكتروني').fill(email)
  await page.getByLabel('كلمة المرور').fill(password)
  await page.getByRole('button', { name: 'دخول' }).click()
  await expect(page).not.toHaveURL(/\/auth\/login/)
}

/** Navigates and waits until Nuxt has hydrated (clicks before hydration would be lost). */
export async function open(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as unknown as { __vue_app__?: unknown } | null)?.__vue_app__)
}
