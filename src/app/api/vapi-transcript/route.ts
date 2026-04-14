import { NextRequest } from 'next/server'

const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY!

/**
 * Format a raw Vapi transcript string into labelled lines.
 *
 * Vapi returns lines like:
 *   "user: Hola, soy ..."
 *   "assistant: Buenas, soy ..."
 *
 * We map:
 *   user      → [CANDIDATO]  (the AE being evaluated)
 *   assistant → [ALIADO]     (the Vapi agent playing the restaurant owner)
 *
 * If the transcript format is different (e.g. already formatted, or empty),
 * we return it unchanged.
 */
function formatVapiTranscript(raw: string): string {
  if (!raw) return raw
  return raw
    .split('\n')
    .map(line => {
      if (/^user\s*:/i.test(line)) {
        return line.replace(/^user\s*:\s*/i, '[CANDIDATO]: ')
      }
      if (/^assistant\s*:/i.test(line)) {
        return line.replace(/^assistant\s*:\s*/i, '[ALIADO]: ')
      }
      return line
    })
    .join('\n')
}

export async function GET(req: NextRequest) {
  try {
    const callId = req.nextUrl.searchParams.get('callId')
    if (!callId) {
      return Response.json({ error: 'callId required' }, { status: 400 })
    }

    const res = await fetch(`https://api.vapi.ai/call/${callId}`, {
      headers: {
        Authorization: `Bearer ${VAPI_PRIVATE_KEY}`,
      },
    })

    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: `Vapi error ${res.status}: ${err}` }, { status: res.status })
    }

    const data = await res.json()
    const rawTranscript = data.transcript ?? data.artifact?.transcript ?? ''

    // Only format if the transcript has content and looks like it hasn't been formatted yet
    const transcript = rawTranscript && !rawTranscript.includes('[CANDIDATO]')
      ? formatVapiTranscript(rawTranscript)
      : rawTranscript

    return Response.json({
      transcript,
      duration:   data.endedAt && data.startedAt
        ? Math.round((new Date(data.endedAt).getTime() - new Date(data.startedAt).getTime()) / 1000)
        : null,
      summary: data.analysis?.summary ?? data.summary ?? '',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
