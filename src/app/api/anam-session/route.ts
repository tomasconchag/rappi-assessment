import { NextRequest } from 'next/server'

export const maxDuration = 15

/**
 * POST /api/anam-session
 * Exchanges the server-side ANAM_API_KEY for a short-lived session token.
 * The client uses this token to initialize the @anam-ai/js-sdk without
 * ever exposing the API key to the browser.
 */
export async function POST(_req: NextRequest) {
  const apiKey   = process.env.ANAM_API_KEY
  const personaId = process.env.ANAM_PERSONA_ID

  if (!apiKey) {
    console.error('[anam-session] ANAM_API_KEY not set')
    return Response.json({ error: 'Avatar not configured' }, { status: 500 })
  }
  if (!personaId) {
    console.error('[anam-session] ANAM_PERSONA_ID not set')
    return Response.json({ error: 'Avatar persona not configured' }, { status: 500 })
  }

  try {
    const res = await fetch('https://api.anam.ai/v1/auth/session-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ personaId }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[anam-session] anam.ai error:', res.status, err)
      return Response.json(
        { error: (err as { message?: string }).message || `anam.ai returned ${res.status}` },
        { status: res.status },
      )
    }

    const data = await res.json() as { sessionToken: string }
    return Response.json({ sessionToken: data.sessionToken })
  } catch (e) {
    console.error('[anam-session] fetch error:', e)
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
