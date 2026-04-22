/**
 * POST /api/batch-send-emails
 *
 * Sends personalized internal-test emails to employees in a batch.
 * Supports two modes:
 *   - Full batch: { batchId } → send to all unsent rows
 *   - Single resend: { templateId } → resend to one specific employee
 *
 * Auth: x-admin-secret header required.
 * Rate: sends in parallel chunks of 10 to avoid SMTP overload.
 */

import { type NextRequest } from 'next/server'
import nodemailer from 'nodemailer'
import { createAdminClient } from '@/lib/supabase/admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rappi-assessment.vercel.app'
const CHUNK_SIZE = 10

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

function buildEmailHtml(
  employeeName: string,
  batchName: string,
  testUrl: string,
  recipientEmail: string,
): string {
  const displayName = employeeName || 'Hola'

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Tu prueba de Excel — Rappi</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#13131e;border-radius:16px;border:1px solid rgba(255,255,255,.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:32px 40px;border-bottom:1px solid rgba(255,255,255,.06);">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:36px;height:36px;background:linear-gradient(140deg,#e03554,#c22448);border-radius:9px;text-align:center;vertical-align:middle;">
                    <span style="color:#fff;font-size:18px;font-weight:900;font-family:Georgia,serif;">R</span>
                  </td>
                  <td style="padding-left:12px;">
                    <div style="color:#fff;font-size:18px;font-weight:700;font-family:Georgia,serif;line-height:1;">Rappi</div>
                    <div style="color:rgba(255,255,255,.4);font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-top:3px;">Evaluación Interna</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:rgba(255,255,255,.5);font-size:12px;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 8px;">Tu prueba está lista</p>
              <h1 style="color:#fff;font-size:26px;font-weight:700;font-family:Georgia,serif;margin:0 0 16px;line-height:1.3;">
                ${displayName}, tienes una evaluación de Excel
              </h1>
              <p style="color:rgba(255,255,255,.6);font-size:15px;line-height:1.7;margin:0 0 24px;">
                El equipo de People te ha asignado la prueba <strong style="color:#fff;">${batchName}</strong>.
                Esta evaluación es parte de nuestro proceso de desarrollo continuo.
              </p>

              <!-- Info box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:rgba(61,85,232,.1);border:1px solid rgba(61,85,232,.2);border-radius:10px;padding:14px 18px;">
                    <p style="color:rgba(255,255,255,.5);font-size:10px;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 6px;">Qué esperar</p>
                    <p style="color:rgba(255,255,255,.8);font-size:13.5px;line-height:1.6;margin:0;">
                      Ejercicio de Excel con datos reales del negocio.
                      Duración aproximada: <strong style="color:#fff;">10 minutos.</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Warning box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:rgba(232,146,48,.06);border:1px solid rgba(232,146,48,.15);border-left:3px solid #e89230;border-radius:10px;padding:14px 18px;">
                    <p style="color:#e89230;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 6px;">Importante</p>
                    <p style="color:rgba(255,255,255,.7);font-size:13px;line-height:1.6;margin:0;">
                      Usa un computador (no celular). El enlace es personal e intransferible.
                      Una vez iniciado, tendrás 10 minutos para completarlo.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:linear-gradient(140deg,#e03554,#c22448);border-radius:10px;box-shadow:0 4px 20px rgba(224,53,84,.4);">
                    <a href="${testUrl}" style="display:inline-block;padding:15px 36px;color:#fff;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:.3px;">
                      Iniciar prueba →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- URL fallback -->
              <p style="color:rgba(255,255,255,.35);font-size:11.5px;line-height:1.6;margin:0 0 4px;">
                Si el botón no funciona, copia este enlace en tu navegador:
              </p>
              <p style="color:#8098f8;font-size:11px;word-break:break-all;margin:0;">
                ${testUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid rgba(255,255,255,.06);">
              <p style="color:rgba(255,255,255,.25);font-size:11px;line-height:1.6;margin:0;">
                Este mensaje fue enviado a <span style="color:rgba(255,255,255,.4);">${recipientEmail}</span> por el equipo de People, Rappi.
                Si crees que es un error, ignora este correo.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

async function sendOne(
  row: { id: string; employee_email: string; employee_name: string | null; invite_token: string },
  batchName: string,
  from: string,
): Promise<{ id: string; email: string; ok: boolean; error?: string }> {
  const testUrl = `${APP_URL}/test?t=${row.invite_token}`
  try {
    await transporter.sendMail({
      from,
      to: row.employee_email,
      subject: `Tu prueba de Excel está lista — ${batchName}`,
      html: buildEmailHtml(row.employee_name ?? '', batchName, testUrl, row.employee_email),
    })
    return { id: row.id, email: row.employee_email, ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[batch-send-emails] SMTP error for ${row.employee_email}:`, msg)
    return { id: row.id, email: row.employee_email, ok: false, error: msg }
  }
}

export async function POST(req: NextRequest) {
  // Auth check
  const secret = req.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return Response.json({ error: 'Email not configured (SMTP_USER / SMTP_PASS missing)' }, { status: 500 })
  }

  const body = await req.json() as { batchId?: string; templateId?: string }
  const { batchId, templateId } = body

  if (!batchId && !templateId) {
    return Response.json({ error: 'Provide batchId or templateId' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER!

  // ── Single resend ────────────────────────────────────────────────────────
  if (templateId) {
    const { data: row, error } = await supabase
      .from('personalized_templates')
      .select('id, employee_email, employee_name, invite_token, template_batches ( name )')
      .eq('id', templateId)
      .maybeSingle()

    if (error || !row) {
      return Response.json({ error: 'Template not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batch = Array.isArray(row.template_batches) ? row.template_batches[0] : row.template_batches as any
    const batchName = batch?.name ?? 'Evaluación Rappi'

    const result = await sendOne(row as { id: string; employee_email: string; employee_name: string | null; invite_token: string }, batchName, from)

    if (result.ok) {
      await supabase
        .from('personalized_templates')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('id', templateId)
    }

    return Response.json({ results: [result], sent: result.ok ? 1 : 0, failed: result.ok ? 0 : 1 })
  }

  // ── Full batch send ──────────────────────────────────────────────────────
  const { data: batchRow, error: batchErr } = await supabase
    .from('template_batches')
    .select('id, name')
    .eq('id', batchId!)
    .maybeSingle()

  if (batchErr || !batchRow) {
    return Response.json({ error: 'Batch not found' }, { status: 404 })
  }

  const { data: templates, error: tplErr } = await supabase
    .from('personalized_templates')
    .select('id, employee_email, employee_name, invite_token, email_sent_at')
    .eq('batch_id', batchId!)
    .is('used_at', null)  // skip already-completed ones

  if (tplErr) {
    return Response.json({ error: tplErr.message }, { status: 500 })
  }

  const rows = (templates ?? []) as { id: string; employee_email: string; employee_name: string | null; invite_token: string; email_sent_at: string | null }[]
  const results: { id: string; email: string; ok: boolean; error?: string }[] = []

  // Send in chunks of CHUNK_SIZE
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE)
    const chunkResults = await Promise.all(chunk.map(r => sendOne(r, batchRow.name, from)))
    results.push(...chunkResults)

    // Mark sent rows
    const sentIds = chunkResults.filter(r => r.ok).map(r => r.id)
    if (sentIds.length > 0) {
      await supabase
        .from('personalized_templates')
        .update({ email_sent_at: new Date().toISOString() })
        .in('id', sentIds)
    }
  }

  const sent   = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok).length

  console.log(`[batch-send-emails] batch=${batchId} sent=${sent} failed=${failed}`)
  return Response.json({ results, sent, failed, total: rows.length })
}

