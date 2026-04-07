'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Cohort, CasoMode, RoleplayCase, RoleplayStrategy } from '@/types/assessment'

type MathModeOverride = 'global' | 'questions' | 'spreadsheet'
type VoiceProviderOverride = 'global' | 'vapi' | 'arbol'

type CaseSummary = { id: string; title: string; difficulty: string }

const DIFFICULTY_OPTIONS = ['Baja', 'Baja-Media', 'Media', 'Media-Alta', 'Alta', 'Muy Alta']
const SECTION_OPTIONS = [
  { id: 'sharktank', label: 'SharkTank Pitch', icon: '🦈' },
  { id: 'roleplay',  label: 'Role Play',       icon: '📞' },
  { id: 'caso',      label: 'Caso Práctico',   icon: '📊' },
  { id: 'math',      label: 'Taller de Math',  icon: '🧮' },
]

const difficultyColor = (d: string) => {
  if (d === 'Baja')       return '#00d68a'
  if (d === 'Baja-Media') return 'var(--teal)'
  if (d === 'Media')      return 'var(--gold)'
  if (d === 'Media-Alta') return '#f59e0b'
  if (d === 'Alta')       return 'var(--red)'
  return '#8b5cf6'
}

const DEFAULT_ROLEPLAY_CASE: RoleplayCase = {
  restaurant_name: 'Heladería La Fiore',
  owner_name: 'Valentina Ríos',
  owner_gender: 'f',
  city: 'Cali',
  category: 'Helados',
  schedule: 'Mié–Lun · 3:00 pm – 9:30 pm',
  ticket_avg: '$29.900',
  orders_per_week: '~70–75',
  inactive_time: '2+ meses',
  strategies: [
    { name: 'Descuentos 5% + PRO', roi: '22X', status: 'active', note: 'ROI 22X activo' },
    { name: 'Ads $1.000.000/sem', roi: '3.9X', status: 'underused', note: '46% usado, co-inversión 70%' },
  ],
  opportunities: [
    'Los Ads solo gastan el 46% del presupuesto disponible (co-inversión Rappi 70%)',
    'Campaña visible solo en Onces y Cena — horario ampliable',
    'Cerrado los martes — posible día de apertura',
    'Descuentos con 22X retorno — espacio para incrementar',
  ],
  sales_data: [50, 77, 61, 52, 76, 74, 74],
  sales_labels: ['Oct W1', 'Oct W2', 'Oct W3', 'Nov W1', 'Nov W2', 'Nov W3', 'Nov W4'],
}

export function CohortEditor({ cohort, cases }: { cohort: Cohort; cases: CaseSummary[] }) {
  const [name, setName]                   = useState(cohort.name)
  const [description, setDescription]     = useState(cohort.description)
  const [isActive, setIsActive]           = useState(cohort.is_active)
  const [startsAt, setStartsAt]           = useState(cohort.starts_at?.slice(0, 16) ?? '')
  const [endsAt, setEndsAt]               = useState(cohort.ends_at?.slice(0, 16) ?? '')
  const [sections, setSections]           = useState<string[]>(
    cohort.enabled_sections ?? ['sharktank', 'caso', 'math']
  )
  const [casoMode, setCasoMode]           = useState<CasoMode>(cohort.caso_mode)
  const [fixedCasoId, setFixedCasoId]     = useState<string>(cohort.fixed_caso_id ?? '')
  const [diffFilter, setDiffFilter]       = useState<string>(cohort.difficulty_filter ?? '')
  const [mathMode, setMathMode]           = useState<MathModeOverride>(cohort.math_mode_override ?? 'global')
  const [voiceMode, setVoiceMode]         = useState<VoiceProviderOverride>(cohort.voice_provider_override ?? 'global')
  const [saving, setSaving]               = useState(false)
  const [flash, setFlash]                 = useState<string | null>(null)

  // ── Roleplay case state ──────────────────────────────────────────────────
  const initial = cohort.roleplay_case ?? DEFAULT_ROLEPLAY_CASE
  const [rpOpen,          setRpOpen]          = useState(false)
  const [rpRestaurant,    setRpRestaurant]    = useState(initial.restaurant_name)
  const [rpOwner,         setRpOwner]         = useState(initial.owner_name)
  const [rpGender,        setRpGender]        = useState<'f' | 'm'>(initial.owner_gender)
  const [rpCity,          setRpCity]          = useState(initial.city)
  const [rpCategory,      setRpCategory]      = useState(initial.category)
  const [rpSchedule,      setRpSchedule]      = useState(initial.schedule)
  const [rpTicket,        setRpTicket]        = useState(initial.ticket_avg)
  const [rpOrders,        setRpOrders]        = useState(initial.orders_per_week)
  const [rpInactive,      setRpInactive]      = useState(initial.inactive_time)
  const [rpStrategies,    setRpStrategies]    = useState<RoleplayStrategy[]>(initial.strategies)
  const [rpOpportunities, setRpOpportunities] = useState<string[]>(initial.opportunities)
  const [rpSalesData,     setRpSalesData]     = useState<string>(initial.sales_data.join(', '))
  const [rpSalesLabels,   setRpSalesLabels]   = useState<string>(initial.sales_labels.join(', '))

  const toggleSection = (id: string) => {
    setSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const filteredCases = diffFilter
    ? cases.filter(c => c.difficulty === diffFilter)
    : cases

  const buildRoleplayCase = (): RoleplayCase => ({
    restaurant_name: rpRestaurant.trim(),
    owner_name: rpOwner.trim(),
    owner_gender: rpGender,
    city: rpCity.trim(),
    category: rpCategory.trim(),
    schedule: rpSchedule.trim(),
    ticket_avg: rpTicket.trim(),
    orders_per_week: rpOrders.trim(),
    inactive_time: rpInactive.trim(),
    strategies: rpStrategies,
    opportunities: rpOpportunities.filter(o => o.trim() !== ''),
    sales_data: rpSalesData.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n)),
    sales_labels: rpSalesLabels.split(',').map(s => s.trim()).filter(s => s !== ''),
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('cohorts')
        .update({
          name:              name.trim(),
          description:       description.trim(),
          is_active:         isActive,
          starts_at:         startsAt || null,
          ends_at:           endsAt || null,
          enabled_sections:    sections,
          caso_mode:           casoMode,
          fixed_caso_id:       casoMode === 'fixed' ? (fixedCasoId || null) : null,
          difficulty_filter:   casoMode === 'random' ? (diffFilter || null) : null,
          math_mode_override:       mathMode === 'global'  ? null : mathMode,
          voice_provider_override:  voiceMode === 'global' ? null : voiceMode,
          roleplay_case:       sections.includes('roleplay') ? buildRoleplayCase() : null,
        })
        .eq('id', cohort.id)
      if (error) throw error
      setFlash('Guardado')
      setTimeout(() => setFlash(null), 2500)
    } catch (e) {
      setFlash(e instanceof Error ? e.message : 'Error al guardar')
      setTimeout(() => setFlash(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    background: 'var(--input)', border: '1px solid var(--border-mid)',
    borderRadius: 8, color: 'var(--text)',
    fontFamily: 'Inter, DM Sans, sans-serif', fontSize: 13.5,
    outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace',
    textTransform: 'uppercase', letterSpacing: '1.2px',
    color: 'var(--muted)', marginBottom: 6, fontWeight: 500,
  }

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace',
    textTransform: 'uppercase', letterSpacing: '1.2px',
    color: 'var(--muted)', fontWeight: 500,
  }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 22px' }}>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>
        Configuración
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Name */}
        <div>
          <label style={labelStyle}>Nombre</label>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Descripción</label>
          <input value={description} onChange={e => setDescription(e.target.value)} style={inputStyle} placeholder="Opcional" />
        </div>

        {/* Active toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Estado</label>
          <button
            onClick={() => setIsActive(v => !v)}
            style={{
              width: 44, height: 24, borderRadius: 12,
              background: isActive ? '#00d68a' : 'var(--border)',
              border: 'none', cursor: 'pointer', position: 'relative',
              transition: 'background .2s',
            }}
          >
            <div style={{
              position: 'absolute', top: 3,
              left: isActive ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%',
              background: '#fff', transition: 'left .2s',
            }} />
          </button>
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>Inicio</label>
            <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} style={{ ...inputStyle, fontSize: 12 }} />
          </div>
          <div>
            <label style={labelStyle}>Cierre</label>
            <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} style={{ ...inputStyle, fontSize: 12 }} />
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* Sections */}
        <div>
          <label style={labelStyle}>Challenges activos</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {SECTION_OPTIONS.map(s => {
              const on = sections.includes(s.id)
              return (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <div
                    onClick={() => toggleSection(s.id)}
                    style={{
                      width: 18, height: 18, borderRadius: 5,
                      background: on ? 'var(--blue)' : 'var(--input)',
                      border: `1.5px solid ${on ? 'var(--blue)' : 'var(--border-mid)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexShrink: 0, transition: 'all .15s',
                    }}
                  >
                    {on && <span style={{ color: '#fff', fontSize: 11, lineHeight: 1 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 12, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--dim)' }}>
                    {s.icon} {s.label}
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* Case assignment */}
        <div>
          <label style={labelStyle}>Caso práctico</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
            {(['global', 'fixed', 'random'] as CasoMode[]).map(mode => {
              const labels: Record<CasoMode, string> = {
                global: 'Usar config global',
                fixed:  'Caso fijo (todos igual)',
                random: 'Random por dificultad',
              }
              return (
                <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <div
                    onClick={() => setCasoMode(mode)}
                    style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: casoMode === mode ? 'var(--blue)' : 'var(--input)',
                      border: `1.5px solid ${casoMode === mode ? 'var(--blue)' : 'var(--border-mid)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexShrink: 0, transition: 'all .15s',
                    }}
                  >
                    {casoMode === mode && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: 12.5, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--dim)' }}>
                    {labels[mode]}
                  </span>
                </label>
              )
            })}
          </div>

          {/* Fixed: case picker */}
          {casoMode === 'fixed' && (
            <div style={{ marginTop: 8 }}>
              <label style={labelStyle}>Caso seleccionado</label>
              <select
                value={fixedCasoId}
                onChange={e => setFixedCasoId(e.target.value)}
                style={{ ...inputStyle, fontSize: 12.5 }}
              >
                <option value="">— Selecciona un caso —</option>
                {cases.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.difficulty})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Random: difficulty filter */}
          {casoMode === 'random' && (
            <div>
              <label style={labelStyle}>Filtrar por dificultad</label>
              <select
                value={diffFilter}
                onChange={e => setDiffFilter(e.target.value)}
                style={{ ...inputStyle, fontSize: 12.5 }}
              >
                <option value="">Todas las dificultades</option>
                {DIFFICULTY_OPTIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Preview matching cases */}
              {filteredCases.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', marginBottom: 7 }}>
                    Pool ({filteredCases.length} caso{filteredCases.length !== 1 ? 's' : ''})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {filteredCases.map(c => (
                      <span key={c.id} style={{
                        fontSize: 10.5, fontFamily: 'Inter, DM Sans, sans-serif',
                        padding: '3px 9px', borderRadius: 100,
                        background: 'rgba(255,255,255,.04)',
                        border: '1px solid var(--border)',
                        color: difficultyColor(c.difficulty),
                      }}>
                        {c.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* Math mode */}
        {sections.includes('math') && (
          <div>
            <label style={labelStyle}>Taller de Math</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {([
                { value: 'global',      label: 'Usar config global',          desc: 'Lo que esté configurado en Settings' },
                { value: 'questions',   label: 'Preguntas de opción múltiple', desc: 'Modo quiz tradicional' },
                { value: 'spreadsheet', label: 'Excel / Hoja de cálculo',      desc: 'Prueba con timer de 10 min' },
              ] as { value: MathModeOverride; label: string; desc: string }[]).map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <div
                    onClick={() => setMathMode(opt.value)}
                    style={{
                      marginTop: 2,
                      width: 16, height: 16, borderRadius: '50%',
                      background: mathMode === opt.value ? 'var(--blue)' : 'var(--input)',
                      border: `1.5px solid ${mathMode === opt.value ? 'var(--blue)' : 'var(--border-mid)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexShrink: 0, transition: 'all .15s',
                    }}
                  >
                    {mathMode === opt.value && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--dim)' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--muted)', marginTop: 1 }}>
                      {opt.desc}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* Voice Provider */}
        <div>
          <label style={labelStyle}>Proveedor de Voz</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {([
              { value: 'global', label: 'Usar config global',   desc: 'Lo que esté configurado en Settings' },
              { value: 'vapi',   label: 'Vapi (browser)',       desc: 'Llamada en el navegador vía WebRTC' },
              { value: 'arbol',  label: 'Arbol AI (llamada real)', desc: 'Llamada telefónica al candidato' },
            ] as { value: VoiceProviderOverride; label: string; desc: string }[]).map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <div
                  onClick={() => setVoiceMode(opt.value)}
                  style={{
                    marginTop: 2,
                    width: 16, height: 16, borderRadius: '50%',
                    background: voiceMode === opt.value ? 'var(--blue)' : 'var(--input)',
                    border: `1.5px solid ${voiceMode === opt.value ? 'var(--blue)' : 'var(--border-mid)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0, transition: 'all .15s',
                  }}
                >
                  {voiceMode === opt.value && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--dim)' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--muted)', marginTop: 1 }}>
                    {opt.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ── Roleplay Case section ─────────────────────────────────────────── */}
        {sections.includes('roleplay') && (
          <>
            <div style={{ height: 1, background: 'var(--border)' }} />
            <div>
              {/* Toggle header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: rpOpen ? 16 : 0 }}>
                <span style={{ ...sectionLabelStyle, fontSize: 11, color: 'var(--text)' }}>🎭 Caso de Role Play</span>
                <button
                  onClick={() => setRpOpen(v => !v)}
                  style={{
                    background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)',
                    borderRadius: 6, color: 'var(--muted)', fontFamily: 'JetBrains Mono, Space Mono, monospace',
                    fontSize: 10, letterSpacing: '.5px', padding: '4px 10px', cursor: 'pointer',
                  }}
                >
                  {rpOpen ? 'Ocultar ↑' : 'Configurar ↓'}
                </button>
              </div>

              {rpOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* ── Restaurante ── */}
                  <div style={{ ...sectionLabelStyle, marginBottom: 6 }}>Restaurante</div>

                  <div>
                    <label style={labelStyle}>Nombre del restaurante</label>
                    <input value={rpRestaurant} onChange={e => setRpRestaurant(e.target.value)} style={inputStyle} placeholder="ej. Heladería La Fiore" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
                    <div>
                      <label style={labelStyle}>Nombre del dueño/a</label>
                      <input value={rpOwner} onChange={e => setRpOwner(e.target.value)} style={inputStyle} placeholder="ej. Valentina Ríos" />
                    </div>
                    <div>
                      <label style={labelStyle}>Género</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {(['f', 'm'] as const).map(g => (
                          <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 12, fontFamily: 'Inter, DM Sans, sans-serif', color: 'var(--dim)' }}>
                            <div
                              onClick={() => setRpGender(g)}
                              style={{
                                width: 14, height: 14, borderRadius: '50%',
                                background: rpGender === g ? 'var(--blue)' : 'var(--input)',
                                border: `1.5px solid ${rpGender === g ? 'var(--blue)' : 'var(--border-mid)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', flexShrink: 0,
                              }}
                            >
                              {rpGender === g && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                            </div>
                            {g === 'f' ? 'Dueña' : 'Dueño'}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={labelStyle}>Ciudad</label>
                      <input value={rpCity} onChange={e => setRpCity(e.target.value)} style={inputStyle} placeholder="ej. Cali" />
                    </div>
                    <div>
                      <label style={labelStyle}>Categoría</label>
                      <input value={rpCategory} onChange={e => setRpCategory(e.target.value)} style={inputStyle} placeholder="ej. Helados" />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Horario</label>
                    <input value={rpSchedule} onChange={e => setRpSchedule(e.target.value)} style={inputStyle} placeholder="ej. Lun–Dom · 12:00 pm – 10:00 pm" />
                  </div>

                  {/* ── Métricas clave ── */}
                  <div style={{ height: 1, background: 'var(--border)' }} />
                  <div style={sectionLabelStyle}>Métricas clave</div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={labelStyle}>Ticket promedio</label>
                      <input value={rpTicket} onChange={e => setRpTicket(e.target.value)} style={inputStyle} placeholder="$29.900" />
                    </div>
                    <div>
                      <label style={labelStyle}>Pedidos/semana</label>
                      <input value={rpOrders} onChange={e => setRpOrders(e.target.value)} style={inputStyle} placeholder="~70–75" />
                    </div>
                    <div>
                      <label style={labelStyle}>Tiempo sin cambios</label>
                      <input value={rpInactive} onChange={e => setRpInactive(e.target.value)} style={inputStyle} placeholder="2+ meses" />
                    </div>
                  </div>

                  {/* ── Estrategias ── */}
                  <div style={{ height: 1, background: 'var(--border)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={sectionLabelStyle}>Estrategias activas (máx 4)</span>
                    {rpStrategies.length < 4 && (
                      <button
                        onClick={() => setRpStrategies(prev => [...prev, { name: '', roi: '', status: 'active' }])}
                        style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--dim)', fontFamily: 'Inter, DM Sans, sans-serif', fontSize: 12, padding: '3px 10px', cursor: 'pointer' }}
                      >
                        + Agregar
                      </button>
                    )}
                  </div>

                  {rpStrategies.map((s, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 2fr auto', gap: 8, alignItems: 'end' }}>
                      <div>
                        {i === 0 && <label style={labelStyle}>Nombre</label>}
                        <input value={s.name} onChange={e => setRpStrategies(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} style={inputStyle} placeholder="Descuentos 5% + PRO" />
                      </div>
                      <div>
                        {i === 0 && <label style={labelStyle}>ROI</label>}
                        <input value={s.roi} onChange={e => setRpStrategies(prev => prev.map((x, j) => j === i ? { ...x, roi: e.target.value } : x))} style={inputStyle} placeholder="22X" />
                      </div>
                      <div>
                        {i === 0 && <label style={labelStyle}>Estado</label>}
                        <select value={s.status} onChange={e => setRpStrategies(prev => prev.map((x, j) => j === i ? { ...x, status: e.target.value as RoleplayStrategy['status'] } : x))} style={{ ...inputStyle, fontSize: 12 }}>
                          <option value="active">Activo</option>
                          <option value="underused">Subutilizado</option>
                          <option value="inactive">Inactivo</option>
                        </select>
                      </div>
                      <div>
                        {i === 0 && <label style={labelStyle}>Nota (opcional)</label>}
                        <input value={s.note ?? ''} onChange={e => setRpStrategies(prev => prev.map((x, j) => j === i ? { ...x, note: e.target.value } : x))} style={inputStyle} placeholder="ej. ROI 22X activo" />
                      </div>
                      <button
                        onClick={() => setRpStrategies(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'rgba(255,107,107,.1)', border: '1px solid rgba(255,107,107,.3)', borderRadius: 6, color: '#ff6b6b', fontSize: 14, width: 32, height: 38, cursor: 'pointer', marginTop: i === 0 ? 16 : 0, flexShrink: 0 }}
                        title="Eliminar"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* ── Oportunidades ── */}
                  <div style={{ height: 1, background: 'var(--border)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={sectionLabelStyle}>Oportunidades detectadas (máx 6)</span>
                    {rpOpportunities.length < 6 && (
                      <button
                        onClick={() => setRpOpportunities(prev => [...prev, ''])}
                        style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--dim)', fontFamily: 'Inter, DM Sans, sans-serif', fontSize: 12, padding: '3px 10px', cursor: 'pointer' }}
                      >
                        + Agregar
                      </button>
                    )}
                  </div>

                  {rpOpportunities.map((opp, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input value={opp} onChange={e => setRpOpportunities(prev => prev.map((x, j) => j === i ? e.target.value : x))} style={{ ...inputStyle, flex: 1 }} placeholder={`Oportunidad ${i + 1}`} />
                      <button
                        onClick={() => setRpOpportunities(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: 'rgba(255,107,107,.1)', border: '1px solid rgba(255,107,107,.3)', borderRadius: 6, color: '#ff6b6b', fontSize: 14, width: 32, height: 38, cursor: 'pointer', flexShrink: 0 }}
                        title="Eliminar"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {/* ── Historial de ventas ── */}
                  <div style={{ height: 1, background: 'var(--border)' }} />
                  <div style={sectionLabelStyle}>Historial de ventas</div>

                  <div>
                    <label style={labelStyle}>Valores (7, separados por coma)</label>
                    <input value={rpSalesData} onChange={e => setRpSalesData(e.target.value)} style={inputStyle} placeholder="50, 77, 61, 52, 76, 74, 74" />
                  </div>
                  <div>
                    <label style={labelStyle}>Etiquetas (7, separadas por coma)</label>
                    <input value={rpSalesLabels} onChange={e => setRpSalesLabels(e.target.value)} style={inputStyle} placeholder="Oct W1, Oct W2, Oct W3, Nov W1, Nov W2, Nov W3, Nov W4" />
                  </div>

                </div>
              )}
            </div>
          </>
        )}

      {/* Flash + Save */}
      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 22px',
            background: 'linear-gradient(140deg, rgba(61,85,232,1), rgba(40,65,200,1))',
            color: '#fff', border: 'none', borderRadius: 8,
            fontFamily: 'Inter, DM Sans, sans-serif', fontWeight: 600, fontSize: 13,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            boxShadow: '0 4px 14px rgba(61,85,232,.25)',
          }}
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        {flash && (
          <span style={{
            fontSize: 12, fontFamily: 'Inter, DM Sans, sans-serif',
            color: flash === 'Guardado' ? '#00d68a' : 'var(--red)',
          }}>
            {flash === 'Guardado' ? '✓ ' : ''}{flash}
          </span>
        )}
      </div>
    </div>
  )
}
