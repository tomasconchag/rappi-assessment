import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AIEvalSection } from './AIEvalSection'
import { RolePlayEvalSection } from './RolePlayEvalSection'
import { CandidateActions } from './CandidateActions'
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

  const scoreColor  = (v: number) => v >= 70 ? 'var(--green)' : v >= 40 ? 'var(--gold)' : '#ff6b6b'
  const fraudColor  = pr?.fraud_level === 'Confiable' ? 'var(--green)' : pr?.fraud_level === 'Riesgo Medio' ? 'var(--gold)' : '#ff6b6b'

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

  const overall        = sub.overall_score_pct || 0
  const overallColor   = scoreColor(overall)
  const rpScore        = (sub as any).roleplay_score as number | null
  const rpBand         = (sub as any).roleplay_band as string | null
  const rpTranscript   = (sub as any).roleplay_transcript as string | null
  const mathTimeSecs   = (sub as any).math_time_secs as number | null
  const mathTimeStr    = mathTimeSecs != null
    ? `${Math.floor(mathTimeSecs / 60)}m ${mathTimeSecs % 60}s`
    : null

  const initials = cand?.name?.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  const dateStr  = sub.completed_at ? new Date(sub.completed_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  const sectionEmojis: Record<string, string> = { sharktank: '🦈', roleplay: '📞', caso: '📊', math: '🧮' }

  const card: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r)',
    padding: 28,
    marginBottom: 20,
  }

  const sectionLabel = (text: string) => (
    <h3 style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted)', marginBottom: 20, margin: '0 0 20px 0' }}>{text}</h3>
  )

  const frow = (label: string, value: string | number, color?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
      <span style={{ color: 'var(--dim)' }}>{label}</span>
      <span style={{ fontFamily: 'Space Mono, monospace', fontWeight: 700, ...(color ? { color } : {}) }}>{value}</span>
    </div>
  )

  // Math question chips
  const mathNonHoneypot = mathAnswers.filter((a: any) => !a.assessment_questions?.is_honeypot)

  return (
    <div>
      {/* Breadcrumb + Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <Link href="/admin/candidates" style={{ color: 'var(--dim)', textDecoration: 'none', transition: 'color .2s' }}>← Candidatos</Link>
          <span style={{ color: 'var(--muted)' }}>/</span>
          <span style={{ color: 'var(--text)' }}>{cand?.name}</span>
        </div>
        <CandidateActions
          submissionId={id}
          candidateId={cand?.id}
          candidateName={cand?.name ?? ''}
        />
      </div>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card)',
        borderRadius: 'var(--r)',
        border: '1px solid var(--border)',
        borderTop: `3px solid ${overallColor}`,
        padding: '28px 32px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 24,
      }}>
        {/* Left: avatar + name + meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 700, color: '#fff',
            fontFamily: 'Fraunces, serif', flexShrink: 0,
            boxShadow: '0 4px 20px rgba(67,97,238,.35)',
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1.15, marginBottom: 6 }}>
              {cand?.name || 'Candidato'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11.5, color: 'var(--muted)' }}>{cand?.email}</span>
              {cand?.cedula && (
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: 'var(--muted)' }}>CC {cand.cedula}</span>
              )}
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10.5, color: 'var(--muted)', opacity: 0.7 }}>{dateStr}</span>
            </div>
          </div>
        </div>

        {/* Right: score + section badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {/* Section emoji badges */}
          <div style={{ display: 'flex', gap: 8 }}>
            {enabledSections.map((s: SectionId) => (
              <div key={s} title={s} style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,.04)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>
                {sectionEmojis[s] || s}
              </div>
            ))}
          </div>

          {/* Overall score */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: 'Fraunces, serif',
              fontSize: 64,
              fontWeight: 700,
              color: overallColor,
              lineHeight: 1,
              textShadow: `0 0 40px ${overallColor}40`,
            }}>
              {overall}%
            </div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted)', marginTop: 4 }}>
              Score General
            </div>
          </div>
        </div>
      </div>

      {/* ── TWO PRIMARY CARDS (Math + RolePlay) ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Card 1: Math / Excel */}
        {enabledSections.includes('math') && (
          <div style={{ ...card, marginBottom: 0 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>🧮</span>
                <span style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Taller de Math</span>
              </div>
              <span style={{
                fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700,
                padding: '4px 12px', borderRadius: 100,
                background: `${scoreColor(sub.math_score_pct || 0)}18`,
                border: `1px solid ${scoreColor(sub.math_score_pct || 0)}40`,
                color: scoreColor(sub.math_score_pct || 0),
              }}>
                {sub.math_score_pct || 0}%
              </span>
            </div>

            {/* Big score display */}
            <div style={{ textAlign: 'center', padding: '20px 0', marginBottom: 20 }}>
              <div style={{
                fontFamily: 'Fraunces, serif',
                fontSize: 52,
                fontWeight: 700,
                color: scoreColor(sub.math_score_pct || 0),
                lineHeight: 1,
              }}>
                {sub.math_score_raw ?? 0}
                <span style={{ fontSize: 24, color: 'var(--muted)', fontWeight: 400 }}>/{sub.math_score_total ?? '?'}</span>
              </div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                puntos · {sub.math_score_pct || 0}%
              </div>
            </div>

            {/* Question chips grid */}
            {mathNonHoneypot.length > 0 ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 10 }}>
                  Respuestas por pregunta
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {mathNonHoneypot.map((a: any, i: number) => {
                    const correct = a.is_correct
                    let chipColor = 'var(--muted)'
                    let chipBg = 'rgba(255,255,255,.04)'
                    let chipBorder = 'var(--border)'
                    let icon = '—'
                    if (correct === true)  { chipColor = 'var(--green)'; chipBg = 'rgba(6,214,160,.1)'; chipBorder = 'rgba(6,214,160,.3)'; icon = '✓' }
                    if (correct === false) { chipColor = '#ff6b6b'; chipBg = 'rgba(233,69,96,.1)'; chipBorder = 'rgba(233,69,96,.3)'; icon = '✗' }
                    return (
                      <div key={a.id} title={a.assessment_questions?.content || `Q${i + 1}`} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '5px 10px', borderRadius: 7,
                        background: chipBg, border: `1px solid ${chipBorder}`,
                        fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700,
                        color: chipColor, cursor: 'default',
                      }}>
                        <span style={{ fontSize: 9 }}>{icon}</span>
                        Q{i + 1}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px 0', marginBottom: 16 }}>
                <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 32, fontWeight: 700, color: scoreColor(sub.math_score_pct || 0) }}>
                  {sub.math_score_pct || 0}%
                </div>
              </div>
            )}

            {/* Note */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'var(--muted)', opacity: 0.6, borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
              <span>Evaluación automática por fórmulas</span>
              {mathTimeStr && <span>⏱ {mathTimeStr}</span>}
            </div>
          </div>
        )}

        {/* Card 2: Role Play */}
        {enabledSections.includes('roleplay') && (
          <div style={{ ...card, marginBottom: 0 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>📞</span>
                <span style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Role Play</span>
              </div>
              {rpScore != null ? (
                <span style={{
                  fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700,
                  padding: '4px 12px', borderRadius: 100,
                  background: `${scoreColor(rpScore)}18`, border: `1px solid ${scoreColor(rpScore)}40`,
                  color: scoreColor(rpScore),
                }}>
                  {rpScore}%
                </span>
              ) : sub.roleplay_completed ? (
                <span style={{
                  fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700,
                  padding: '4px 12px', borderRadius: 100,
                  background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)',
                  color: 'var(--gold)',
                }}>
                  Pendiente evaluación IA
                </span>
              ) : (
                <span style={{
                  fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700,
                  padding: '4px 12px', borderRadius: 100,
                  background: 'rgba(233,69,96,.1)', border: '1px solid rgba(233,69,96,.3)',
                  color: '#ff6b6b',
                }}>
                  No completado
                </span>
              )}
            </div>

            {/* Score display if scored */}
            {rpScore != null && rpBand && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '16px 20px', borderRadius: 12, marginBottom: 16,
                background: `${scoreColor(rpScore)}10`,
                border: `1px solid ${scoreColor(rpScore)}30`,
              }}>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: 48, fontWeight: 700, color: scoreColor(rpScore), lineHeight: 1 }}>
                  {rpScore}
                </div>
                <div>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>/ 100 pts</div>
                  <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 13, fontWeight: 700, color: scoreColor(rpScore), textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {rpBand}
                  </div>
                </div>
              </div>
            )}

            {/* Video player */}
            {roleplayVideoUrl ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ position: 'relative', overflow: 'hidden', background: '#000', aspectRatio: '16/9', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <video src={roleplayVideoUrl} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              </div>
            ) : sub.roleplay_completed ? (
              <div style={{
                padding: '14px 16px', borderRadius: 10, marginBottom: 16,
                background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 20 }}>📹</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'DM Sans, sans-serif' }}>Sin grabación disponible</span>
              </div>
            ) : null}

            {/* Transcript */}
            {rpTranscript && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--muted)', marginBottom: 8 }}>
                  📝 Transcripción
                </div>
                <div style={{
                  maxHeight: 180, overflowY: 'auto', padding: '10px 14px',
                  background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)',
                  borderRadius: 8,
                }}>
                  <pre style={{ fontFamily: 'Space Mono, monospace', fontSize: 10.5, color: 'var(--dim)', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
                    {rpTranscript}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CASO PRACTICO (full width) ─────────────────────────────────────── */}
      {casoAnswers.length > 0 && (
        <div style={card}>
          {sectionLabel('📊 Caso Práctico — Respuestas')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {casoAnswers.map((a: any, i: number) => (
              <div key={a.id} style={{ background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--dim)', marginBottom: 8 }}>P{i + 1}: {a.assessment_questions?.content}</div>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {a.answer_text || <span style={{ fontStyle: 'italic', color: 'var(--muted)' }}>Sin respuesta</span>}
                </p>
                <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'var(--muted)', marginTop: 8 }}>⏱ {a.time_spent_s}s</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── INTEGRIDAD / PROCTORING (full width, compact) ──────────────────── */}
      {pr && (
        <div style={card}>
          {sectionLabel('🔒 Integridad — Proctoring')}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            {/* Fraud score badge */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '14px 24px', borderRadius: 12,
              background: `${fraudColor}12`, border: `1px solid ${fraudColor}30`,
              flexShrink: 0,
            }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 40, fontWeight: 700, color: fraudColor, lineHeight: 1 }}>{pr.fraud_score}</div>
              <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.5px', color: fraudColor, marginTop: 4 }}>{pr.fraud_level}</div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, flex: 1 }}>
              {[
                { label: 'Cambios pestaña', val: pr.tab_out_count, warn: pr.tab_out_count > 0 },
                { label: 'Intentos paste', val: pr.paste_attempts, warn: pr.paste_attempts > 0, danger: pr.paste_attempts > 2 },
                { label: 'Intentos copy', val: pr.copy_attempts, warn: pr.copy_attempts > 0 },
                { label: 'Salidas fullscreen', val: pr.fs_exit_count, warn: pr.fs_exit_count > 0 },
                { label: 'Honeypot', val: pr.honeypot_fails === 0 ? '✓ OK' : `✗ ${pr.honeypot_fails}`, warn: pr.honeypot_fails > 0 },
                { label: 'Snapshots', val: snapshots.length, warn: false },
              ].map(stat => {
                const color = stat.danger ? '#ff6b6b' : stat.warn ? 'var(--gold)' : 'var(--green)'
                return (
                  <div key={stat.label} style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: 'rgba(255,255,255,.02)', border: '1px solid var(--border)',
                    minWidth: 110,
                  }}>
                    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>{stat.label}</div>
                    <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 18, fontWeight: 700, color }}>{stat.val}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── SHARKTANK VIDEO (full width) ───────────────────────────────────── */}
      {enabledSections.includes('sharktank') && videoUrl && (
        <div style={card}>
          {sectionLabel('🦈 SharkTank — Video Pitch')}
          <div style={{ maxWidth: 720 }}>
            <div style={{ position: 'relative', overflow: 'hidden', background: '#000', aspectRatio: '16/9', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
              <video src={videoUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'var(--muted)' }}>
              {sub.video_mime_type} · {sub.video_storage_path}
            </div>
          </div>
        </div>
      )}

      {/* ── ROLEPLAY AI EVALUATION ─────────────────────────────────────────── */}
      {enabledSections.includes('roleplay') && (
        <RolePlayEvalSection
          submissionId={id}
          initialScore={(sub as any).roleplay_score ?? null}
          initialBand={(sub as any).roleplay_band ?? null}
          initialEvaluation={(sub as any).roleplay_evaluation ?? null}
          initialTranscript={(sub as any).roleplay_transcript ?? null}
          roleplayVideoPath={sub.roleplay_video_path ?? null}
          roleplayCompleted={!!sub.roleplay_completed}
        />
      )}

      {/* ── AI EVALUATION (caso) ───────────────────────────────────────────── */}
      <AIEvalSection
        submissionId={id}
        aiEvals={(aiEvals || []) as any[]}
        casoAnswers={casoAnswers}
        videoRecorded={!!videoUrl}
      />

      {/* ── SNAPSHOTS ─────────────────────────────────────────────────────── */}
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
