import { NextRequest } from 'next/server'

const VAPI_PRIVATE_KEY = process.env.VAPI_PRIVATE_KEY!

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
    return Response.json({
      transcript: data.transcript ?? data.artifact?.transcript ?? '',
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
