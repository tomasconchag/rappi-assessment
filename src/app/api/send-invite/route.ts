import { type NextRequest } from 'next/server'
import { sendMailAs, isSmtpConfigured } from '@/lib/smtp'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

function formatDeadline(endsAt: string | null): string | null {
  if (!endsAt) return null
  const d = new Date(endsAt)
  return d.toLocaleString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota',
  }) + ' (hora Colombia)'
}

function buildEmailHtml(cohortName: string, inviteUrl: string, recipientEmail: string, deadline: string | null): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Invitación al Assessment Rappi</title>
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
                    <div style="color:rgba(255,255,255,.4);font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-top:3px;">Assessment Center</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:rgba(255,255,255,.5);font-size:12px;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 8px;">Invitación</p>
              <h1 style="color:#fff;font-size:26px;font-weight:700;font-family:Georgia,serif;margin:0 0 16px;line-height:1.3;">
                Tienes una invitación al proceso de selección Farmer Rappi
              </h1>
              <p style="color:rgba(255,255,255,.6);font-size:15px;line-height:1.7;margin:0 0 24px;">
                Hola, has sido invitado/a al assessment <strong style="color:#fff;">${cohortName}</strong>.
                Esta evaluación nos permite conocer tu perfil comercial y analítico.
              </p>

              <!-- Info boxes -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:rgba(61,85,232,.1);border:1px solid rgba(61,85,232,.2);border-radius:10px;padding:14px 18px;">
                    <p style="color:rgba(255,255,255,.5);font-size:10px;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 6px;">Qué esperar</p>
                    <p style="color:rgba(255,255,255,.8);font-size:13.5px;line-height:1.6;margin:0;">
                      El assessment incluye ejercicios de pitch comercial, análisis de caso práctico y razonamiento numérico.
                      Duración aproximada: <strong style="color:#fff;">45–60 minutos.</strong>
                    </p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:rgba(232,146,48,.06);border:1px solid rgba(232,146,48,.15);border-left:3px solid #e89230;border-radius:10px;padding:14px 18px;">
                    <p style="color:#e89230;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 6px;">Importante</p>
                    <p style="color:rgba(255,255,255,.7);font-size:13px;line-height:1.6;margin:0;">
                      Realiza el assessment en un lugar tranquilo, con buena conexión a internet y desde un computador (no celular).
                      Una vez iniciado, no podrás pausarlo.
                    </p>
                  </td>
                </tr>
              </table>

              ${deadline ? `<!-- Deadline box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:rgba(224,53,84,.07);border:1px solid rgba(224,53,84,.2);border-left:3px solid #e03554;border-radius:10px;padding:14px 18px;">
                    <p style="color:#e03554;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;margin:0 0 6px;">Fecha límite</p>
                    <p style="color:rgba(255,255,255,.85);font-size:14px;font-weight:700;line-height:1.5;margin:0;">
                      ${deadline}
                    </p>
                    <p style="color:rgba(255,255,255,.5);font-size:12px;margin:6px 0 0;">
                      Después de esta fecha el enlace dejará de funcionar.
                    </p>
                  </td>
                </tr>
              </table>` : ''}

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:linear-gradient(140deg,#3d55e8,#2841c8);border-radius:10px;box-shadow:0 4px 20px rgba(61,85,232,.4);">
                    <a href="${inviteUrl}" style="display:inline-block;padding:15px 36px;color:#fff;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:.3px;">
                      Iniciar Assessment →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- URL fallback -->
              <p style="color:rgba(255,255,255,.35);font-size:11.5px;line-height:1.6;margin:0 0 4px;">
                Si el botón no funciona, copia este enlace en tu navegador:
              </p>
              <p style="color:#8098f8;font-size:11px;word-break:break-all;margin:0;">
                ${inviteUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid rgba(255,255,255,.06);">
              <p style="color:rgba(255,255,255,.25);font-size:11px;line-height:1.6;margin:0;">
                Este mensaje fue enviado a <span style="color:rgba(255,255,255,.4);">${recipientEmail}</span> porque fuiste incluido/a en el proceso de selección de Rappi.
                Si crees que esto es un error, ignora este correo.
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

export async function POST(req: NextRequest) {
  const { cohortId, emails } = await req.json() as { cohortId: string; emails: string[] }

  if (!cohortId || !emails?.length) {
    return Response.json({ error: 'Missing cohortId or emails' }, { status: 400 })
  }

  if (!isSmtpConfigured()) {
    return Response.json({ error: 'Email not configured (set SMTP_USER + SMTP_PASS)' }, { status: 500 })
  }

  // Get logged-in admin's email to send from their account
  const authClient = await createClient()
  const { data: { user: adminUser } } = await authClient.auth.getUser()
  const adminEmail = adminUser?.email ?? null

  const supabase = createAdminClient()
  const { data: cohort } = await supabase
    .from('cohorts')
    .select('name, invite_token, ends_at')
    .eq('id', cohortId)
    .single()

  if (!cohort) {
    return Response.json({ error: 'Cohort not found' }, { status: 404 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rappi-assessment.vercel.app'
  const inviteUrl = `${baseUrl}/assessment?c=${cohort.invite_token}`
  const deadline = formatDeadline((cohort as any).ends_at ?? null)

  const results: { email: string; ok: boolean; error?: string }[] = []

  for (const email of emails) {
    try {
      await sendMailAs(adminEmail, {
        to: email,
        subject: `Invitación al Assessment Rappi — ${cohort.name}`,
        html: buildEmailHtml(cohort.name, inviteUrl, email, deadline),
      })
      results.push({ email, ok: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error(`[send-invite] SMTP error for ${email}:`, msg)
      results.push({ email, ok: false, error: msg })
    }
  }

  const failed = results.filter(r => !r.ok)
  const firstError = failed[0]?.error ?? null
  return Response.json({ results, sent: results.length - failed.length, failed: failed.length, firstError })
}
