import React from "react"
import type { Metadata, Viewport } from 'next'

import { AuthProvider } from '@/context/auth-context'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip';
import { BackToTop } from '@/components/ui/back-to-top';
import { OfflineBanner } from '@/components/ui/offline-banner';
import SessionTimeout from '@/components/session-timeout'
import './globals.css'



export const metadata: Metadata = {
  title: 'Fortis Healthcare - Hospital Management System',
  description: 'Comprehensive hospital management system for patients, doctors, and administrators',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          <TooltipProvider>
            <SessionTimeout />
            {children}
            <Toaster />
            <BackToTop />
            <OfflineBanner />
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
