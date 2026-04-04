import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AIEvalSection } from './AIEvalSection'
import { normalizedWeights } from '@/lib/challenges'
import type { SectionId } from '@/lib/challenges'

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: sub } = await supabase
    .from('submissions')
    .select(`
      *,
      candidates ( * ),
      proctoring_reports ( * ),
      webcam_snapshots ( * ),
      answers ( *, assessment_questions ( content, section, position, difficulty, points, correct_answer, is_honeypot ) )
    `)
    .eq('id', id)
    .single()

  if (!sub) notFound()

  const pr        = Array.isArray(sub.proctoring_reports) ? sub.proctoring_reports[0] : sub.proctoring_reports
  const cand      = Array.isArray(sub.candidates) ? sub.candidates[0] : sub.candidates
  const answers   = (sub.answers || []) as any[]
  const snapshots = (sub.webcam_snapshots || []) as any[]

  const casoAnswers = answers.filter((a: any) => a.section === 'caso').sort((a: any, b: any) => a.assessment_questions?.position - b.assessment_questions?.position)
  const mathAnswers = answers.filter((a: any) => a.section === 'math').sort((a: any, b: any) => a.assessment_questions?.position - b.assessment_questions?.position)

  // Load AI evaluations for this submission
  const { data: aiEvals } = await supabase
    .from('ai_evaluations')
    .select('*')
    .eq('submission_id', id)
    .order('evaluated_at', { ascending: true })

  // ── Enabled sections — fallback to old default for legacy submissions ──────
  const enabledSections: SectionId[] = (sub.enabled_sections as SectionId[]) ?? ['sharktank', 'caso', 'math']
  const weights = normalizedWeights(enabledSections)
  // ─────────────────────────────────────────────────────────────────────────

  const fraudColor  = pr?.fraud_level === 'Confiable' ? 'var(--green)' : pr?.fraud_level === 'Riesgo Medio' ? 'var(--gold)' : '#ff6b6b'
  const scoreColor  = (v: number) => v >= 70 ? 'var(--green)' : v >= 40 ? 'var(--gold)' : '#ff6b6b'

  // ── Build signed URLs ─────────────────────────────────────────────────────
  let videoUrl = ''
  if (sub.video_storage_path) {
    const { data } = await supabase.storage.from('assessment-videos').createSignedUrl(sub.video_storage_path, 3600)
    if (data?.signedUrl) videoUrl = data.signedUrl
  }

  let roleplayVideoUrl = ''
  if (sub.roleplay_video_path) {
    const { data } = await supabase.storage.from('assessment-videos').createSignedUrl(sub.roleplay_video_path, 3600)
    if (data?.signedUrl) roleplayVideoUrl = data.signedUrl
  }

  const snapshotUrls: string[] = []
  for (const snap of snapshots) {
    const { data } = await supabase.storage.from('assessment-snapshots').createSignedUrl(snap.storage_path, 3600)
    if (data?.signedUrl) snapshotUrls.push(data.signedUrl)
  }
  // ─────────────────────────────────────────────────────────────────────────

  const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 28, marginBottom: 20 }
  const sectionLabel = (text: string) => (
    <h3 style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted)', marginBottom: 20 }}>{text}</h3>
  )

  const frow = (label: string, value: string | number, color?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
      <span style={{ color: 'var(--dim)' }}>{label}</span>
      <span style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700, ...(color ? { color } : {}) }}>{value}</span>
    </div>
  )

  // ── Dynamic score cards ───────────────────────────────────────────────────
  const scoreCards: { label: string; val: string; color: string }[] = []

  if (enabledSections.includes('sharktank')) {
    scoreCards.push({
      label: `🦈 SharkTank (${weights.sharktank}%)`,
      val:   sub.video_recorded ? '✅ Grabado' : '❌ No grabado',
      color: sub.video_recorded ? 'var(--green)' : '#ff6b6b',
    })
  }
  if (enabledSections.includes('roleplay')) {
    scoreCards.push({
      label: `📞 Role Play (${weights.roleplay}%)`,
      val:   sub.roleplay_completed ? '✅ Completado' : '❌ No completado',
      color: sub.roleplay_completed ? 'var(--green)' : '#ff6b6b',
    })
  }
  if (enabledSections.includes('caso')) {
    scoreCards.push({
      label: `📊 Caso (${weights.caso}%)`,
      val:   `${sub.caso_score_pct || 0}%`,
      color: scoreColor(sub.caso_score_pct || 0),
    })
  }
  if (enabledSections.includes('math')) {
    scoreCards.push({
      label: `🧮 Math (${weights.math}%)`,
      val:   `${sub.math_score_pct || 0}%`,
      color: scoreColor(sub.math_score_pct || 0),
    })
  }
  // ─────────────────────────────────────────────────────────────────────────

  const cols = Math.min(scoreCards.length, 4)

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, fontSize: 13 }}>
        <Link href="/admin/candidates" style={{ color: 'var(--dim)', textDecoration: 'none', transition: 'color .2s' }}>← Candidatos</Link>
        <span style={{ color: 'var(--muted)' }}>/</span>
        <span style={{ color: 'var(--text)' }}>{cand?.name}</span>
      </div>

      {/* Score cards — dynamic */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, marginBottom: 20 }}>
        {scoreCards.map(c => (
          <div key={c.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '24px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 8 }}>{c.label}</div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 700, color: c.color }}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* Overall score banner */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '20px 28px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted)', marginBottom: 4 }}>Score General</div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 48, fontWeight: 700, color: scoreColor(sub.overall_score_pct || 0), lineHeight: 1 }}>{sub.overall_score_pct || 0}%</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 4 }}>{cand?.name}</div>
          <div style={{ fontSize: 12, fontFamily: 'Space Mono, monospace', color: 'var(--muted)' }}>{cand?.email}</div>
        </div>
      </div>

      {/* Candidate info + Proctoring */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Candidate */}
        <div style={card}>
          {sectionLabel('👤 Candidato')}
          {frow('Nombre', cand?.name)}
          {frow('Email', cand?.email)}
          {frow('Cédula', cand?.cedula)}
          {frow('Fecha', sub.completed_at ? new Date(sub.completed_at).toLocaleString('es-CO') : '—')}
          {frow('Challenges', enabledSections.map((s: string) => ({ sharktank: '🦈', roleplay: '📞', caso: '📊', math: '🧮' }[s] || s)).join('  '))}
        </div>

        {/* Proctoring */}
        {pr && (
          <div style={card}>
            {sectionLabel('🔒 Integridad')}
            <div style={{ textAlign: 'center', padding: '16px 0', marginBottom: 16, background: `${fraudColor}15`, borderRadius: 10 }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 48, fontWeight: 700, color: fraudColor }}>{pr.fraud_score}</div>
              <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: fraudColor, marginTop: 4 }}>{pr.fraud_level}</div>
            </div>
            {frow('Cambios de pestaña', pr.tab_out_count, pr.tab_out_count > 0 ? 'var(--gold)' : 'var(--green)')}
            {frow('Intentos de pegar', pr.paste_attempts, pr.paste_attempts > 0 ? '#ff6b6b' : 'var(--green)')}
            {frow('Intentos de copiar', pr.copy_attempts, pr.copy_attempts > 0 ? 'var(--gold)' : 'var(--green)')}
            {frow('Salidas fullscreen', pr.fs_exit_count, pr.fs_exit_count > 0 ? 'var(--gold)' : 'var(--green)')}
            {frow('Honeypot', pr.honeypot_fails === 0 ? '✅ Pasó' : `❌ Falló (${pr.honeypot_fails})`, pr.honeypot_fails > 0 ? '#ff6b6b' : 'var(--green)')}
            {frow('Fotos tomadas', snapshots.length)}
            {frow('Eventos registrados', (pr.events as any[])?.length || 0)}
          </div>
        )}
      </div>

      {/* SharkTank Video */}
      {enabledSections.includes('sharktank') && videoUrl && (
        <div style={card}>
          {sectionLabel('🎬 Video Pitch — SharkTank')}
          <div style={{ maxWidth: 640 }}>
            <div style={{ position: 'relative', overflow: 'hidden', background: '#000', aspectRatio: '16/9', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
              <video src={videoUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'var(--muted)' }}>
              {sub.video_mime_type} · {sub.video_storage_path}
            </div>
          </div>
        </div>
      )}

      {/* Role Play Video */}
      {enabledSections.includes('roleplay') && (
        <div style={card}>
          {sectionLabel('📞 Role Play — Grabación de sesión')}
          {roleplayVideoUrl ? (
            <div style={{ maxWidth: 900 }}>
              <div style={{ position: 'relative', overflow: 'hidden', background: '#000', aspectRatio: '16/9', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
                <video src={roleplayVideoUrl} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ marginTop: 8, fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'var(--muted)' }}>
                Grabación de pantalla completa · {sub.roleplay_video_path}
              </div>
            </div>
          ) : (
            <div style={{
              padding: '24px 20px', borderRadius: 12,
              background: 'rgba(245,158,11,.04)',
              border: '1px solid rgba(245,158,11,.15)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span style={{ fontSize: 28 }}>{sub.roleplay_completed ? '✅' : '❌'}</span>
              <div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>
                  {sub.roleplay_completed ? 'Role Play completado' : 'Role Play no completado'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'DM Sans, sans-serif' }}>
                  {sub.roleplay_completed
                    ? 'El candidato completó la llamada pero no hay grabación disponible.'
                    : 'El candidato no completó el challenge de Role Play.'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Evaluation */}
      <AIEvalSection
        submissionId={id}
        aiEvals={(aiEvals || []) as any[]}
        casoAnswers={casoAnswers}
        videoRecorded={!!videoUrl}
      />

      {/* Caso answers */}
      {casoAnswers.length > 0 && (
        <div style={card}>
          {sectionLabel('📊 Caso Práctico — Respuestas')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {casoAnswers.map((a: any, i: number) => (
              <div key={a.id} style={{ background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--dim)', marginBottom: 8 }}>P{i + 1}: {a.assessment_questions?.content}</div>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                  {a.answer_text || <span style={{ fontStyle: 'italic', color: 'var(--muted)' }}>Sin respuesta</span>}
                </p>
                <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'var(--muted)', marginTop: 8 }}>⏱ {a.time_spent_s}s</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Math answers */}
      {mathAnswers.length > 0 && (
        <div style={card}>
          {sectionLabel(`🧮 Math — ${sub.math_score_raw}/${sub.math_score_total} pts (${sub.math_score_pct}%)`)}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {mathAnswers.filter((a: any) => !a.assessment_questions?.is_honeypot).map((a: any) => (
              <div key={a.id} style={{
                padding: '14px 16px', borderRadius: 10,
                border: a.is_correct ? '1px solid rgba(6,214,160,.3)' : '1px solid rgba(233,69,96,.3)',
                background: a.is_correct ? 'rgba(6,214,160,.05)' : 'rgba(233,69,96,.05)',
              }}>
                <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 8 }}>{a.assessment_questions?.content}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 14, fontWeight: 700 }}>{a.answer_text || '—'}</span>
                  <span style={{ fontSize: 12, fontFamily: 'Space Mono, monospace' }}>
                    {a.is_correct ? `✅ +${a.points_awarded}pts` : `❌ (${a.assessment_questions?.correct_answer})`}
                  </span>
                </div>
                <div style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', color: 'var(--muted)', marginTop: 6 }}>⏱ {a.time_spent_s}s</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Snapshots */}
      {snapshotUrls.length > 0 && (
        <div style={card}>
          {sectionLabel('📸 Webcam Snapshots')}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {snapshotUrls.map((url, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Snapshot ${i + 1}`} style={{ width: 160, borderRadius: 10, border: '1px solid var(--border)', display: 'block' }} />
                <div style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', color: 'var(--muted)', marginTop: 6 }}>Foto {i + 1}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
