import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { esES } from '@clerk/localizations'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rappi — Assessment Center',
  description: 'Assessment interactivo para el rol de Farmer en Rappi',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      localization={esES}
      appearance={{
        variables: {
          colorPrimary: '#e03554',
          colorBackground: '#0e0e18',
          colorInputBackground: '#16161f',
          colorText: '#f0f0f5',
          colorTextSecondary: '#a0a0b8',
          colorInputText: '#f0f0f5',
          colorNeutral: '#ffffff',
          borderRadius: '10px',
          fontFamily: 'DM Sans, sans-serif',
        },
        elements: {
          card: {
            background: '#12121c',
            boxShadow: '0 0 60px rgba(224,53,84,.12), 0 2px 24px rgba(0,0,0,.6)',
            border: '1px solid rgba(255,255,255,.1)',
          },
          headerTitle: { color: '#f0f0f5' },
          headerSubtitle: { color: '#a0a0b8' },
          socialButtonsBlockButton: {
            background: '#1c1c28',
            border: '1px solid rgba(255,255,255,.12)',
            color: '#f0f0f5',
          },
          dividerLine: { background: 'rgba(255,255,255,.1)' },
          dividerText: { color: '#a0a0b8' },
          formFieldLabel: { color: '#c0c0d0' },
          formFieldInput: {
            background: '#16161f',
            border: '1px solid rgba(255,255,255,.12)',
            color: '#f0f0f5',
          },
          formButtonPrimary: {
            background: 'linear-gradient(140deg,#e03554,#c22448)',
            color: '#ffffff',
          },
          footerActionLink: { color: '#e03554' },
          footerActionText: { color: '#a0a0b8' },
          identityPreviewText: { color: '#f0f0f5' },
          formResendCodeLink: { color: '#e03554' },
        },
      }}
    >
      <html lang="es">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
