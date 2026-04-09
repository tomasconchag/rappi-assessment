'use client'

import { useState } from 'react'
import { RolePlayCallScreen } from '@/components/assessment/screens/RolePlayCallScreen'
import type { RoleplayCase, RoleplayStrategy, RoleplayBankEntry } from '@/types/assessment'

const DEFAULT_CASE: RoleplayCase = {
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

interface Props {
  voiceProvider: 'vapi' | 'arbol'
  activeBankCase?: RoleplayBankEntry | null
}

export function RolePlayTestPanel({ voiceProvider, activeBankCase }: Props) {
  const [testing,  setTesting]  = useState(false)
  const [caseOpen, setCaseOpen] = useState(false)

  // ── Case fields ──────────────────────────────────────────────────────────
  const [rpRestaurant,    setRpRestaurant]    = useState(DEFAULT_CASE.restaurant_name)
  const [rpOwner,         setRpOwner]         = useState(DEFAULT_CASE.owner_name)
  const [rpGender,        setRpGender]        = useState<'f' | 'm'>(DEFAULT_CASE.owner_gender)
  const [rpCity,          setRpCity]          = useState(DEFAULT_CASE.city)
  const [rpCategory,      setRpCategory]      = useState(DEFAULT_CASE.category)
  const [rpSchedule,      setRpSchedule]      = useState(DEFAULT_CASE.schedule)
  const [rpTicket,        setRpTicket]        = useState(DEFAULT_CASE.ticket_avg)
  const [rpOrders,        setRpOrders]        = useState(DEFAULT_CASE.orders_per_week)
  const [rpInactive,      setRpInactive]      = useState(DEFAULT_CASE.inactive_time)
  const [rpStrategies,    setRpStrategies]    = useState<RoleplayStrategy[]>(DEFAULT_CASE.strategies)
  const [rpOpportunities, setRpOpportunities] = useState<string[]>(DEFAULT_CASE.opportunities)
  const [rpSalesData,     setRpSalesData]     = useState(DEFAULT_CASE.sales_data.join(', '))
  const [rpSalesLabels,   setRpSalesLabels]   = useState(DEFAULT_CASE.sales_labels.join(', '))

  const buildCase = (): RoleplayCase => ({
    restaurant_name:  rpRestaurant.trim(),
    owner_name:       rpOwner.trim(),
    owner_gender:     rpGender,
    city:             rpCity.trim(),
    category:         rpCategory.trim(),
    schedule:         rpSchedule.trim(),
    ticket_avg:       rpTicket.trim(),
    orders_per_week:  rpOrders.trim(),
    inactive_time:    rpInactive.trim(),
    strategies:       rpStrategies,
    opportunities:    rpOpportunities.filter(o => o.trim() !== ''),
    sales_data:       rpSalesData.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n)),
    sales_labels:     rpSalesLabels.split(',').map(s => s.trim()).filter(s => s !== ''),
  })

  // ── Styles ───────────────────────────────────────────────────────────────
  const input: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    background: 'var(--input)', border: '1px solid var(--border-mid)',
    borderRadius: 8, color: 'var(--text)',
    fontFamily: 'Inter, DM Sans, sans-serif', fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
  }
  const label: React.CSSProperties = {
    display: 'block', fontSize: 10,
    fontFamily: 'JetBrains Mono, Space Mono, monospace',
    textTransform: 'uppercase', letterSpacing: '1.2px',
    color: 'var(--muted)', marginBottom: 5, fontWeight: 500,
  }
  const sectionLabel: React.CSSProperties = {
    fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace',
    textTransform: 'uppercase', letterSpacing: '1.2px',
    color: 'var(--muted)', fontWeight: 500,
  }

  if (testing) {
    return (
      <RolePlayCallScreen
        onDone={() => setTesting(false)}
        cameraStream={null}
        voiceProvider={voiceProvider}
        roleplayCase={activeBankCase ? null : buildCase()}
        roleplayBankCase={activeBankCase ?? null}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Call button row ──────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderTop: '3px solid #f59e0b', borderRadius: 14,
        padding: '24px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
            Probar llamada
          </div>
          <p style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5, margin: 0 }}>
            Usa el caso configurado abajo — sin crear usuarios ni pasar por el flujo completo.
          </p>
        </div>
        <button
          onClick={() => setTesting(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '12px 24px',
            background: 'linear-gradient(140deg, #f59e0b, #d97706)',
            color: '#000', border: 'none', borderRadius: 10,
            fontFamily: 'DM Sans, sans-serif', fontWeight: 700, fontSize: 14,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(245,158,11,.3)',
          }}
        >
          <span style={{ fontSize: 18 }}>📞</span>
          Probar llamada ahora
        </button>
      </div>

      {/* ── Case editor ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderTop: '3px solid var(--border)', borderRadius: 14,
        overflow: 'hidden',
      }}>
        {/* Header toggle */}
        <button
          onClick={() => setCaseOpen(v => !v)}
          style={{
            width: '100%', padding: '20px 28px',
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18 }}>🎭</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                Caso del Role Play
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'DM Sans, sans-serif', marginTop: 2 }}>
                {rpRestaurant} · {rpOwner} · {rpCity}
              </div>
            </div>
          </div>
          <span style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: 'var(--muted)', letterSpacing: '.5px' }}>
            {caseOpen ? 'OCULTAR ↑' : 'EDITAR ↓'}
          </span>
        </button>

        {/* Expandable form */}
        {caseOpen && (
          <div style={{ padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid var(--border)' }}>
            <div style={{ height: 14 }} />

            {/* ── Restaurante ── */}
            <div style={sectionLabel}>Restaurante</div>

            <div>
              <label style={label}>Nombre del restaurante</label>
              <input value={rpRestaurant} onChange={e => setRpRestaurant(e.target.value)} style={input} placeholder="ej. Heladería La Fiore" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
              <div>
                <label style={label}>Nombre del dueño/a</label>
                <input value={rpOwner} onChange={e => setRpOwner(e.target.value)} style={input} placeholder="ej. Valentina Ríos" />
              </div>
              <div>
                <label style={label}>Género</label>
                <div style={{ display: 'flex', gap: 12, paddingBottom: 10 }}>
                  {(['f', 'm'] as const).map(g => (
                    <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: 'var(--dim)' }}>
                      <div
                        onClick={() => setRpGender(g)}
                        style={{
                          width: 15, height: 15, borderRadius: '50%',
                          background: rpGender === g ? 'var(--blue)' : 'var(--input)',
                          border: `1.5px solid ${rpGender === g ? 'var(--blue)' : 'var(--border-mid)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
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
                <label style={label}>Ciudad</label>
                <input value={rpCity} onChange={e => setRpCity(e.target.value)} style={input} placeholder="ej. Cali" />
              </div>
              <div>
                <label style={label}>Categoría</label>
                <input value={rpCategory} onChange={e => setRpCategory(e.target.value)} style={input} placeholder="ej. Helados" />
              </div>
            </div>

            <div>
              <label style={label}>Horario</label>
              <input value={rpSchedule} onChange={e => setRpSchedule(e.target.value)} style={input} placeholder="ej. Lun–Dom · 12:00 pm – 10:00 pm" />
            </div>

            {/* ── Métricas ── */}
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <div style={sectionLabel}>Métricas clave</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={label}>Ticket promedio</label>
                <input value={rpTicket} onChange={e => setRpTicket(e.target.value)} style={input} placeholder="$29.900" />
              </div>
              <div>
                <label style={label}>Pedidos/semana</label>
                <input value={rpOrders} onChange={e => setRpOrders(e.target.value)} style={input} placeholder="~70–75" />
              </div>
              <div>
                <label style={label}>Sin cambios</label>
                <input value={rpInactive} onChange={e => setRpInactive(e.target.value)} style={input} placeholder="2+ meses" />
              </div>
            </div>

            {/* ── Estrategias ── */}
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={sectionLabel}>Estrategias activas (máx 4)</span>
              {rpStrategies.length < 4 && (
                <button
                  onClick={() => setRpStrategies(prev => [...prev, { name: '', roi: '', status: 'active' }])}
                  style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--dim)', fontFamily: 'DM Sans, sans-serif', fontSize: 12, padding: '3px 10px', cursor: 'pointer' }}
                >
                  + Agregar
                </button>
              )}
            </div>

            {rpStrategies.map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 2fr auto', gap: 8, alignItems: 'end' }}>
                <div>
                  {i === 0 && <label style={label}>Nombre</label>}
                  <input value={s.name} onChange={e => setRpStrategies(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} style={input} placeholder="Descuentos 5% + PRO" />
                </div>
                <div>
                  {i === 0 && <label style={label}>ROI</label>}
                  <input value={s.roi} onChange={e => setRpStrategies(prev => prev.map((x, j) => j === i ? { ...x, roi: e.target.value } : x))} style={input} placeholder="22X" />
                </div>
                <div>
                  {i === 0 && <label style={label}>Estado</label>}
                  <select value={s.status} onChange={e => setRpStrategies(prev => prev.map((x, j) => j === i ? { ...x, status: e.target.value as RoleplayStrategy['status'] } : x))} style={{ ...input, fontSize: 12 }}>
                    <option value="active">Activo</option>
                    <option value="underused">Subutilizado</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
                <div>
                  {i === 0 && <label style={label}>Nota (opcional)</label>}
                  <input value={s.note ?? ''} onChange={e => setRpStrategies(prev => prev.map((x, j) => j === i ? { ...x, note: e.target.value } : x))} style={input} placeholder="ej. ROI 22X activo" />
                </div>
                <button
                  onClick={() => setRpStrategies(prev => prev.filter((_, j) => j !== i))}
                  style={{ background: 'rgba(255,107,107,.1)', border: '1px solid rgba(255,107,107,.3)', borderRadius: 6, color: '#ff6b6b', fontSize: 14, width: 32, height: 38, cursor: 'pointer', marginTop: i === 0 ? 16 : 0, flexShrink: 0 }}
                  title="Eliminar"
                >×</button>
              </div>
            ))}

            {/* ── Oportunidades ── */}
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={sectionLabel}>Oportunidades detectadas (máx 6)</span>
              {rpOpportunities.length < 6 && (
                <button
                  onClick={() => setRpOpportunities(prev => [...prev, ''])}
                  style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--dim)', fontFamily: 'DM Sans, sans-serif', fontSize: 12, padding: '3px 10px', cursor: 'pointer' }}
                >
                  + Agregar
                </button>
              )}
            </div>

            {rpOpportunities.map((opp, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={opp} onChange={e => setRpOpportunities(prev => prev.map((x, j) => j === i ? e.target.value : x))} style={{ ...input, flex: 1 }} placeholder={`Oportunidad ${i + 1}`} />
                <button
                  onClick={() => setRpOpportunities(prev => prev.filter((_, j) => j !== i))}
                  style={{ background: 'rgba(255,107,107,.1)', border: '1px solid rgba(255,107,107,.3)', borderRadius: 6, color: '#ff6b6b', fontSize: 14, width: 32, height: 38, cursor: 'pointer', flexShrink: 0 }}
                  title="Eliminar"
                >×</button>
              </div>
            ))}

            {/* ── Ventas ── */}
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <div style={sectionLabel}>Historial de ventas</div>

            <div>
              <label style={label}>Valores (7 números separados por coma)</label>
              <input value={rpSalesData} onChange={e => setRpSalesData(e.target.value)} style={input} placeholder="50, 77, 61, 52, 76, 74, 74" />
            </div>
            <div>
              <label style={label}>Etiquetas (7, separadas por coma)</label>
              <input value={rpSalesLabels} onChange={e => setRpSalesLabels(e.target.value)} style={input} placeholder="Oct W1, Oct W2, Oct W3, Nov W1, Nov W2, Nov W3, Nov W4" />
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
