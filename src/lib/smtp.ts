/**
 * Shared SMTP utility — multi-account round-robin sender.
 *
 * Supports up to two Gmail accounts configured via env vars:
 *   Account 1: SMTP_USER  + SMTP_PASS   + SMTP_FROM  (optional display name)
 *   Account 2: SMTP_USER2 + SMTP_PASS2  + SMTP_FROM2 (optional, defaults to SMTP_USER2)
 *
 * Each call to sendMail() picks the next account (round-robin), doubling
 * Gmail's daily send limit. If one account fails it automatically retries
 * with the other.
 *
 * Gmail requirements:
 *   • 2-Step Verification must be ON for both accounts.
 *   • Use App Passwords (not the regular account password).
 *     Google Account → Security → 2-Step Verification → App Passwords
 */

import nodemailer from 'nodemailer'

interface Account {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transporter: any   // nodemailer.Transporter
  from: string
  user: string       // for logging only
}

function buildAccounts(): Account[] {
  const accounts: Account[] = []

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    accounts.push({
      transporter: nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      }),
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      user: process.env.SMTP_USER,
    })
  }

  if (process.env.SMTP_USER2 && process.env.SMTP_PASS2) {
    accounts.push({
      transporter: nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: process.env.SMTP_USER2, pass: process.env.SMTP_PASS2 },
      }),
      from: process.env.SMTP_FROM2 ?? process.env.SMTP_USER2,
      user: process.env.SMTP_USER2,
    })
  }

  return accounts
}

// Module-level cache — created once per cold start, reused across calls
let _accounts: Account[] | null = null
let _counter = 0

function getAccounts(): Account[] {
  if (!_accounts) _accounts = buildAccounts()
  return _accounts
}

export interface SendMailOptions {
  to:      string
  subject: string
  html:    string
}

/**
 * Sends an email via the next available SMTP account (round-robin).
 * Falls back to the other account if the first fails.
 * Throws only if ALL configured accounts fail.
 */
export async function sendMail({ to, subject, html }: SendMailOptions): Promise<void> {
  const accounts = getAccounts()

  if (accounts.length === 0) {
    throw new Error(
      'No SMTP accounts configured. Set SMTP_USER + SMTP_PASS (and optionally SMTP_USER2 + SMTP_PASS2).',
    )
  }

  // Pick the next account, then try others as fallback
  const startIdx = _counter++ % accounts.length

  let lastError: unknown
  for (let i = 0; i < accounts.length; i++) {
    const idx     = (startIdx + i) % accounts.length
    const account = accounts[idx]

    try {
      await account.transporter.sendMail({ from: account.from, to, subject, html })
      return   // ✓ success
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[smtp] account[${idx}] (${account.user}) failed for ${to}: ${msg}`)
      lastError = err
      // Continue to next account
    }
  }

  // All accounts failed
  throw lastError
}

/** Returns true if at least one SMTP account is configured. */
export function isSmtpConfigured(): boolean {
  return getAccounts().length > 0
}

/** Returns how many SMTP accounts are active (useful for logging). */
export function smtpAccountCount(): number {
  return getAccounts().length
}
