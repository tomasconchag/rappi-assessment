'use client'

const CRITERIA = [
  { icon: '💡', name: 'Propuesta de Valor',      desc: '¿Comunicas claramente qué propones y por qué beneficia al restaurante?' },
  { icon: '📊', name: 'Uso de Datos del Caso',   desc: '¿Sustentas tu pitch con los datos del caso (ventas, pedidos, ROI)?' },
  { icon: '🗂', name: 'Claridad y Estructura',   desc: '¿Tu pitch sigue una estructura: contexto → problema → solución → acción?' },
  { icon: '🎙', name: 'Confianza y Presencia',   desc: '¿Transmites seguridad, vocabulario técnico y ritmo fluido?' },
  { icon: '🛡', name: 'Manejo de Objeciones',    desc: '¿Anticipas resistencias del dueño (costo, tiempo, riesgo) y las resuelves?' },
]

export function SharkCriteria() {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r)',
      padding: '20px 24px',
      marginBottom: 20,
    }}>
      <p style={{
        fontSize: 10, fontFamily: 'JetBrains Mono, Space Mono, monospace',
        textTransform: 'uppercase', letterSpacing: '1.4px',
        color: 'var(--muted)', marginBottom: 14, fontWeight: 500,
      }}>
        🎯 Criterios de evaluación
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {CRITERIA.map((c, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '10px 0',
            borderBottom: i < CRITERIA.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            {/* Icon */}
            <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{c.icon}</span>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{
                fontSize: 12.5, fontWeight: 600, color: 'var(--text)',
                fontFamily: 'Inter, DM Sans, sans-serif',
              }}>
                {c.name}
              </span>
              <span style={{
                fontSize: 12, color: 'var(--dim)',
                fontFamily: 'Inter, DM Sans, sans-serif',
              }}>
                {' — '}{c.desc}
              </span>
            </div>

          </div>
        ))}
      </div>
    </div>
  )
}
