import { NextRequest } from 'next/server'

const ARBOL_API_KEY = process.env.ARBOL_API_KEY!
const ARBOL_BASE    = 'https://api.getarbol.com'

export async function POST(req: NextRequest) {
  try {
    const { agentId, phone, variables } = await req.json() as {
      agentId: string
      phone: string
      variables?: Record<string, string>
    }

    const res = await fetch(`${ARBOL_BASE}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ARBOL_API_KEY}`,
      },
      body: JSON.stringify({ agentId, phone, variables }),
    })

    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: `Arbol error ${res.status}: ${err}` }, { status: res.status })
    }

    const data = await res.json()
    return Response.json({ conversationId: data.id ?? data.conversationId ?? data.conversation_id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const conversationId = req.nextUrl.searchParams.get('conversationId')
    if (!conversationId) {
      return Response.json({ error: 'conversationId required' }, { status: 400 })
    }

    const res = await fetch(`${ARBOL_BASE}/conversations/${conversationId}`, {
      headers: {
        Authorization: `Bearer ${ARBOL_API_KEY}`,
      },
    })

    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: `Arbol error ${res.status}: ${err}` }, { status: res.status })
    }

    const data = await res.json()
    return Response.json({
      status:     data.status,
      transcript: data.transcript ?? data.transcription ?? '',
      duration:   data.duration ?? null,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ error: msg }, { status: 500 })
  }
}
