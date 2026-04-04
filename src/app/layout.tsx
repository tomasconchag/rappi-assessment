import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rappi — Assessment Center',
  description: 'Assessment interactivo para el rol de Farmer en Rappi',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#e03554',
          colorBackground: '#06060d',
          colorInputBackground: '#10101a',
          borderRadius: '10px',
          fontFamily: 'DM Sans, sans-serif',
        },
        elements: {
          card: { boxShadow: '0 0 60px rgba(224,53,84,.12), 0 2px 24px rgba(0,0,0,.5)', border: '1px solid rgba(255,255,255,.08)' },
          formButtonPrimary: { background: 'linear-gradient(140deg,#e03554,#c22448)' },
        },
      }}
    >
      <html lang="es">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
