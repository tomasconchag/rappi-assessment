'use client'

import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  handleReset = () => {
    this.setState({ error: null })
    // Return to welcome screen by reloading
    window.location.href = window.location.pathname
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 40, textAlign: 'center',
        background: 'var(--bg)',
      }}>
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'rgba(224,53,84,.1)',
          border: '1px solid rgba(224,53,84,.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, marginBottom: 28,
        }}>
          ⚠
        </div>

        <h2 style={{
          fontFamily: 'Fraunces, serif',
          fontSize: 28, fontWeight: 700,
          color: 'var(--text)', marginBottom: 12,
          letterSpacing: '-.5px',
        }}>
          Algo salió mal
        </h2>

        <p style={{
          fontSize: 14, color: 'var(--dim)',
          fontFamily: 'DM Sans, sans-serif',
          lineHeight: 1.7, maxWidth: 420, marginBottom: 8,
        }}>
          Ocurrió un error inesperado. Tu progreso guardado será recuperado al reiniciar.
        </p>

        {/* Error detail (collapsible) */}
        <details style={{ marginBottom: 32, maxWidth: 480 }}>
          <summary style={{
            fontSize: 11, fontFamily: 'Space Mono, monospace',
            color: 'var(--muted)', cursor: 'pointer', letterSpacing: '.5px',
            textTransform: 'uppercase',
          }}>
            Ver detalle del error
          </summary>
          <div style={{
            marginTop: 10, padding: '12px 16px',
            background: 'rgba(224,53,84,.05)',
            border: '1px solid rgba(224,53,84,.15)',
            borderRadius: 9, textAlign: 'left',
            fontSize: 12, fontFamily: 'JetBrains Mono, Space Mono, monospace',
            color: '#f07090', lineHeight: 1.6,
            wordBreak: 'break-word',
          }}>
            {this.state.error.message || 'Error desconocido'}
          </div>
        </details>

        <button
          onClick={this.handleReset}
          style={{
            padding: '14px 40px', borderRadius: 'var(--rs)',
            background: 'linear-gradient(140deg, #e03554 0%, #c22448 100%)',
            color: 'white', border: '1px solid rgba(224,53,84,.25)',
            fontFamily: 'Inter, DM Sans, sans-serif',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(224,53,84,.35)',
          }}
        >
          Reintentar →
        </button>
      </div>
    )
  }
}
