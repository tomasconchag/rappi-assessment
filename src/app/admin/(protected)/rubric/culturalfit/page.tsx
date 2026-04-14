export default function RubricCulturalFitPage() {
  const dimensions = [
    {
      id: 'gestion_conflictos',
      label: 'Gestión de Conflictos',
      question: 'Cuéntame de una situación en la que tuviste un conflicto con un compañero de equipo. ¿Cómo lo manejaste?',
      elite: 'Resolución basada en hechos y empatía. Enfoque en el objetivo común. Locus de control interno (asume responsabilidad propia).',
      solid: 'Maneja el conflicto de forma profesional pero superficial. Evita la confrontación o delega la solución a un tercero.',
      critical: 'Atribuye la culpa totalmente al otro (locus externo). Muestra resentimiento o falta de cierre profesional.',
      greenFlag: '¿El candidato describe una mejora en la relación o proceso tras el conflicto?',
    },
    {
      id: 'fit_cultural',
      label: 'Fit Cultural',
      question: '¿Qué tipo de ambiente de trabajo te hace rendir mejor? ¿Y en cuál sientes que no encajas tanto?',
      elite: 'Identifica con precisión entornos de alta presión vs. soporte. Muestra autoconocimiento profundo y alineación con valores de la empresa.',
      solid: 'Describe preferencias genéricas (ej: "buen clima"). Identifica ambientes que no le gustan pero de forma reactiva.',
      critical: 'No sabe identificar qué lo motiva. Muestra rigidez o intolerancia a la diversidad de ritmos de trabajo.',
      greenFlag: '¿El candidato menciona cómo su rendimiento impacta los KPIs en su ambiente ideal?',
    },
    {
      id: 'adaptabilidad',
      label: 'Adaptabilidad',
      question: 'Háblame de una vez en la que tuviste que adaptarte a un cambio importante en el trabajo. ¿Cómo lo viviste?',
      elite: 'Resiliencia extrema. Describe el cambio como oportunidad. Agilidad de aprendizaje y ajuste de procesos rápido.',
      solid: 'Se adapta con el tiempo pero muestra resistencia inicial. Necesita guía constante para procesar el cambio.',
      critical: 'Se paraliza ante la incertidumbre. Habla del cambio desde la pérdida o la queja constante.',
      greenFlag: '¿Muestra una acción concreta que tomó para acelerar su curva de aprendizaje?',
    },
    {
      id: 'dinamica_equipo',
      label: 'Dinámica de Equipo',
      question: 'Cuando trabajas en equipo, ¿qué rol sueles tomar naturalmente? ¿Por qué?',
      elite: 'Liderazgo situacional. Entiende su rol (ej: implementador vs. creativo) y cómo este complementa los gaps del equipo.',
      solid: 'Identifica un rol fijo (ej: "soy el que hace") pero no analiza cómo interactúa con otros perfiles.',
      critical: 'No tiene claridad de su impacto en el grupo. Se describe como un ente aislado o dominante sin escucha.',
      greenFlag: '¿Menciona cómo ayuda a otros miembros del equipo a brillar?',
    },
    {
      id: 'gestion_feedback',
      label: 'Gestión de Feedback',
      question: 'Cuéntame de una situación donde recibiste feedback difícil. ¿Cómo reaccionaste y qué hiciste después?',
      elite: 'Escucha activa y ausencia de defensividad. Demuestra cambio conductual verificable posterior al feedback.',
      solid: 'Acepta el feedback pero no muestra un plan de acción para corregir. Se justifica ligeramente durante la respuesta.',
      critical: 'Reacción defensiva o negación. Considera el feedback como un ataque personal. No hubo cambios tras la sesión.',
      greenFlag: '¿Cita la acción específica y el resultado de la mejora 3 meses después?',
    },
  ]

  const card: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 12,
  }

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--muted)', marginBottom: 10 }}>
          Evaluación IA · Rúbrica
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 34, fontWeight: 700, lineHeight: 1, marginBottom: 8 }}>
          🎙 Cultural Fit — Entrevista con Simón
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'DM Sans', maxWidth: 600 }}>
          Framework de Evaluación Conductual v1.0 · 5 dimensiones × 20 pts = 100 pts totales. Penalizaciones por Red Flags.
        </p>
      </div>

      {/* Info banner */}
      <div style={{ padding: '11px 16px', background: 'rgba(168,85,247,.06)', border: '1px solid rgba(168,85,247,.18)', borderRadius: 9, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 14 }}>🎙</span>
        <span style={{ fontSize: 13, color: '#a855f7', fontFamily: 'DM Sans' }}>
          Transcripción vía <strong>AssemblyAI</strong> (speaker diarization, español) · Evaluación estructurada por tiers con <strong>Claude Opus</strong> · 100 pts totales
        </span>
      </div>

      {/* Bands */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {[
          { label: 'TOP TALENT',    range: '90–100', color: '#06d68a', bg: 'rgba(6,214,138,.08)',   border: 'rgba(6,214,138,.2)',   verdict: 'Contratación inmediata' },
          { label: 'STRONG FIT',    range: '75–89',  color: '#4361ee', bg: 'rgba(67,97,238,.08)',   border: 'rgba(67,97,238,.2)',   verdict: 'Candidato sólido' },
          { label: 'POTENTIAL RISK', range: '60–74', color: '#f59e0b', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.2)',  verdict: 'Segunda entrevista' },
          { label: 'NOT A FIT',     range: '0–59',   color: '#e03554', bg: 'rgba(224,53,84,.08)',   border: 'rgba(224,53,84,.2)',   verdict: 'No cumple estándares' },
        ].map(b => (
          <div key={b.label} style={{ padding: '6px 14px', borderRadius: 100, background: b.bg, border: `1px solid ${b.border}`, display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: b.color }} />
            <span style={{ fontFamily: 'Space Mono', fontSize: 10, fontWeight: 700, color: b.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{b.label}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'DM Sans' }}>{b.range} pts</span>
          </div>
        ))}
      </div>

      {/* Scoring guide */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        {[
          { tier: 'Tier 1 — Elite', pts: '20 pts', color: '#06d68a', bg: 'rgba(6,214,138,.07)', border: 'rgba(6,214,138,.2)' },
          { tier: 'Tier 2 — Solid', pts: '10 pts', color: '#4361ee', bg: 'rgba(67,97,238,.07)', border: 'rgba(67,97,238,.2)' },
          { tier: 'Tier 3 — Critical', pts: '0 pts', color: '#e03554', bg: 'rgba(224,53,84,.07)', border: 'rgba(224,53,84,.2)' },
        ].map(t => (
          <div key={t.tier} style={{ padding: '8px 16px', borderRadius: 8, background: t.bg, border: `1px solid ${t.border}`, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'Space Mono', fontSize: 11, fontWeight: 700, color: t.color }}>{t.tier}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'DM Sans' }}>= {t.pts}</span>
          </div>
        ))}
      </div>

      {/* Dimensions */}
      {dimensions.map((dim, idx) => (
        <div key={dim.id} style={card}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(168,85,247,.03)', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{
              fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700, color: '#a855f7',
              background: 'rgba(168,85,247,.1)', border: '1px solid rgba(168,85,247,.25)',
              borderRadius: 7, padding: '4px 10px', flexShrink: 0,
            }}>
              D{idx + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'DM Sans', color: 'var(--text)', marginBottom: 4 }}>{dim.label}</div>
              <div style={{ fontSize: 12.5, fontFamily: 'DM Sans', color: 'var(--dim)', fontStyle: 'italic', lineHeight: 1.5 }}>
                "{dim.question}"
              </div>
            </div>
            <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 13, fontWeight: 700, color: '#a855f7', flexShrink: 0 }}>20 pts</div>
          </div>

          {/* Tiers grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            {[
              { key: 'elite',    label: 'Tier 1 — Elite',    pts: '20 pts', color: '#06d68a', bg: 'rgba(6,214,138,.04)',  border: 'rgba(6,214,138,.15)',  text: dim.elite },
              { key: 'solid',    label: 'Tier 2 — Solid',    pts: '10 pts', color: '#4361ee', bg: 'rgba(67,97,238,.04)',  border: 'rgba(67,97,238,.12)',  text: dim.solid },
              { key: 'critical', label: 'Tier 3 — Critical', pts: '0 pts',  color: '#e03554', bg: 'rgba(224,53,84,.04)',  border: 'rgba(224,53,84,.12)',  text: dim.critical },
            ].map((tier, ti) => (
              <div key={tier.key} style={{ padding: '14px 16px', background: tier.bg, borderRight: ti < 2 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: tier.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontFamily: 'Space Mono', textTransform: 'uppercase', letterSpacing: '1px', color: tier.color, fontWeight: 700 }}>{tier.label}</span>
                  <span style={{ fontSize: 10, fontFamily: 'Space Mono', color: 'var(--muted)', marginLeft: 'auto' }}>{tier.pts}</span>
                </div>
                <p style={{ fontSize: 12.5, fontFamily: 'DM Sans, sans-serif', color: 'var(--dim)', lineHeight: 1.65, margin: 0 }}>{tier.text}</p>
              </div>
            ))}
          </div>

          {/* Green flag */}
          <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(6,214,138,.02)' }}>
            <span style={{ fontSize: 12 }}>🟢</span>
            <span style={{ fontSize: 12, fontFamily: 'DM Sans', color: 'var(--dim)', fontStyle: 'italic' }}>{dim.greenFlag}</span>
          </div>
        </div>
      ))}

      {/* Red Flags */}
      <div style={{ marginTop: 24, padding: '20px 24px', borderRadius: 12, background: 'rgba(224,53,84,.04)', border: '1px solid rgba(224,53,84,.2)' }}>
        <div style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#e03554', marginBottom: 14 }}>⚠ Red Flags — Penalización Directa</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Falta de Honestidad', pts: '-10 pts', desc: 'Inconsistencias en el relato o falta de detalles específicos (historias genéricas sin nombre, fecha, contexto real).' },
            { label: 'Defensividad Extrema', pts: '-5 pts', desc: 'Culpar sistemáticamente a otros por errores propios a lo largo de toda la entrevista.' },
            { label: 'Falta de Autocrítica', pts: '-5 pts', desc: 'Incapacidad de identificar un área de mejora real cuando se le solicita.' },
          ].map(rf => (
            <div key={rf.label} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700, color: '#e03554', flexShrink: 0, width: 56 }}>{rf.pts}</span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, fontFamily: 'DM Sans', color: '#f07090', marginBottom: 2 }}>{rf.label}</div>
                <div style={{ fontSize: 12, fontFamily: 'DM Sans', color: 'var(--dim)', lineHeight: 1.5 }}>{rf.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
