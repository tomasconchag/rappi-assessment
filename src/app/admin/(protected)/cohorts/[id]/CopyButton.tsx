'use client'

export function CopyButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text).catch(() => {})}
      style={{
        padding: '6px 14px', background: 'rgba(61,85,232,.15)',
        border: '1px solid rgba(61,85,232,.25)', borderRadius: 7,
        color: '#8098f8', fontFamily: 'JetBrains Mono, Space Mono, monospace',
        fontSize: 11, cursor: 'pointer', flexShrink: 0, letterSpacing: '.3px',
      }}
    >
      Copiar
    </button>
  )
}
